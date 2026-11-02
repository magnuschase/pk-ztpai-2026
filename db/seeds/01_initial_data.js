const { hashPassword } = require("../../src/modules/auth/password");

const HOUR_MS = 60 * 60 * 1000;

// Local development accounts. The seed is the only way to create an ADMIN
// (registration through the API always creates a USER).
const ADMIN_PASSWORD = "admin-dev-password";
const USER_PASSWORD = "user-dev-password";

// Reservation owners - the same addresses the user_id migration derives from the
// old reserved_by names ("Piotr Wiśniewski" -> piotr.wisniewski@example.com)
const USERS = [
  { email: "admin@example.com", role: "ADMIN" }, // 1
  { email: "jan.kowalski@example.com", role: "USER" }, // 2
  { email: "anna.nowak@example.com", role: "USER" }, // 3
  { email: "piotr.wisniewski@example.com", role: "USER" }, // 4
  { email: "maria.zielinska@example.com", role: "USER" }, // 5
  { email: "katarzyna.wojcik@example.com", role: "USER" }, // 6
];

/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function (knex) {
  // RESTART IDENTITY resets the sequences, so every run gives the same IDs (starting at 1)
  await knex.raw("TRUNCATE TABLE reservations, rooms, buildings, users RESTART IDENTITY CASCADE");

  const userRows = [];
  for (const { email, role } of USERS) {
    // Hashed one by one - every row gets its own salt, so equal passwords have different hashes
    const password = role === "ADMIN" ? ADMIN_PASSWORD : USER_PASSWORD;
    userRows.push({ email, role, password_hash: await hashPassword(password) });
  }
  await knex("users").insert(userRows);

  // Times are relative to the current full hour, so the "already started"
  // reservation is in progress right after seeding.
  const currentHour = new Date();
  currentHour.setUTCMinutes(0, 0, 0);
  const at = (hours) => new Date(currentHour.getTime() + hours * HOUR_MS);

  await knex("buildings").insert([
    { name: "Budynek A", address: "ul. Warszawska 24, Kraków" }, // 1
    { name: "Budynek B", address: "al. Jana Pawła II 37, Kraków" }, // 2
  ]);

  await knex("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 }, // 1
    { building_id: 1, name: "102", capacity: 25 }, // 2
    { building_id: 1, name: "201", capacity: 60 }, // 3
    { building_id: 2, name: "101", capacity: 20 }, // 4 - same name as room 1, other building
    { building_id: 2, name: "Aula", capacity: 150 }, // 5
  ]);

  await knex("reservations").insert([
    // 1: upcoming
    {
      room_id: 1,
      user_id: 2, // jan.kowalski
      participants: 20,
      start_time: at(24),
      end_time: at(26),
      status: "CONFIRMED",
      created_at: at(-48),
    },
    // 2: already started (RESERVATION_ALREADY_STARTED on cancel)
    {
      room_id: 2,
      user_id: 3, // anna.nowak
      participants: 10,
      start_time: at(-1),
      end_time: at(2),
      status: "CONFIRMED",
      created_at: at(-48),
    },
    // 3: starts exactly when reservation 1 ends - touching ranges are allowed
    {
      room_id: 1,
      user_id: 4, // piotr.wisniewski
      participants: 15,
      start_time: at(26),
      end_time: at(27),
      status: "CONFIRMED",
      created_at: at(-24),
    },
    // 4: cancelled
    {
      room_id: 4,
      user_id: 5, // maria.zielinska
      participants: 18,
      start_time: at(48),
      end_time: at(50),
      status: "CANCELLED",
      created_at: at(-72),
      cancelled_at: at(-24),
    },
    // 5: same slot as the cancelled one - a cancelled reservation does not block the room
    {
      room_id: 4,
      user_id: 6, // katarzyna.wojcik
      participants: 12,
      start_time: at(48),
      end_time: at(50),
      status: "CONFIRMED",
      created_at: at(-12),
    },
  ]);
};
