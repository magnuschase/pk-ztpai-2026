// Adds N CONFIRMED reservations directly to the database - test data for
// the N+1 and pagination reports.
//
// Usage: node scripts/add-reservations.js [count=15]
require("../src/config/env");
const knex = require("knex")(require("../knexfile"));

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

async function main() {
  const count = Number(process.argv[2] ?? 15);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("count must be a positive integer");
  }

  const roomIds = await knex("rooms").orderBy("id").pluck("id");
  if (roomIds.length === 0) {
    throw new Error("No rooms in the database - run `pnpm seed:run` first");
  }

  // Start after the latest existing reservation, so the new ones never overlap anything
  const { latest } = await knex("reservations").max({ latest: "end_time" }).first();
  const start = new Date(Math.max(Date.now(), latest ? latest.getTime() : 0));
  start.setUTCHours(start.getUTCHours() + 1, 0, 0, 0);

  const now = Date.now();
  const rows = Array.from({ length: count }, (_, i) => ({
    room_id: roomIds[i % roomIds.length],
    reserved_by: `Test User ${i + 1}`,
    participants: 5 + ((i * 7) % 15),
    start_time: new Date(start.getTime() + i * HOUR_MS),
    end_time: new Date(start.getTime() + (i + 1) * HOUR_MS),
    status: "CONFIRMED",
    created_at: new Date(now - (count - i) * MINUTE_MS),
  }));

  await knex("reservations").insert(rows);
  const { total } = await knex("reservations").count({ total: "*" }).first();
  console.log(`Added ${count} reservations (total in database: ${total})`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
