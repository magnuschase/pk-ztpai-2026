// Double booking race condition: sends N identical POST /api/reservations
// (same room, same time range) in parallel, then counts in the database how
// many CONFIRMED reservations overlap that range. Correct result: exactly 1.
//
// Usage: node scripts/double-booking.js [roomId=3] [requests=10]
// API_URL defaults to http://localhost:$PORT (from .env)
require("../src/config/env");
const knex = require("knex")(require("../knexfile"));

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// A slot after every existing reservation, so each run starts from a free range
async function findFreeSlot() {
  const { latest } = await knex("reservations").max({ latest: "end_time" }).first();
  const start = new Date(Math.max(Date.now(), latest ? latest.getTime() : 0) + DAY_MS);
  start.setUTCHours(10, 0, 0, 0);
  return { start, end: new Date(start.getTime() + 2 * HOUR_MS) };
}

async function sendReservation(body) {
  const res = await fetch(`${API_URL}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  return {
    status: res.status,
    detail: res.ok ? `id=${payload.id}` : (payload?.error?.code ?? "?"),
  };
}

async function main() {
  const roomId = Number(process.argv[2] ?? 3);
  const requests = Number(process.argv[3] ?? 10);
  const { start, end } = await findFreeSlot();

  const body = {
    roomId,
    reservedBy: "Double Booking Test",
    participants: 10,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
  console.log(`POST ${API_URL}/api/reservations x${requests} in parallel`);
  console.log(`room ${roomId}, ${body.startTime} - ${body.endTime}\n`);

  const results = await Promise.all(
    Array.from({ length: requests }, () => sendReservation(body)),
  );
  results.forEach((result, i) => {
    console.log(`request ${String(i + 1).padStart(2)}: ${result.status} ${result.detail}`);
  });

  const byStatus = {};
  for (const { status } of results) byStatus[status] = (byStatus[status] ?? 0) + 1;
  console.log(
    `\nstatus codes: ${Object.entries(byStatus).map(([status, n]) => `${n}x ${status}`).join(", ")}`,
  );

  // Overlap with [start, end): start_time < end AND end_time > start
  const { confirmed } = await knex("reservations")
    .where({ room_id: roomId, status: "CONFIRMED" })
    .where("start_time", "<", end)
    .where("end_time", ">", start)
    .count({ confirmed: "*" })
    .first();
  const count = Number(confirmed);

  console.log(`CONFIRMED reservations in the database for this room and range: ${count}`);
  console.log(count === 1 ? "OK - no double booking" : `DOUBLE BOOKING - ${count} overlapping reservations`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
