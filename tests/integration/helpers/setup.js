const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const knex = require("knex");
const request = require("supertest");
const config = require("../../../src/config");
const knexConfig = require("../../../knexfile");
const createApp = require("../../../src/app");
const createTokenService = require("../../../src/modules/auth/tokens");
const { createKnexRepositories } = require("../../../src/db/repositories");
const createEventBus = require("../../../src/events/eventBus");

// The injected "now" of the app: today 08:00 UTC
const TODAY = "2026-12-07";
const TOMORROW = "2026-12-08";
const today = (hhmm) => `${TODAY}T${hhmm}:00.000Z`;
const tomorrow = (hhmm) => `${TOMORROW}T${hhmm}:00.000Z`;
const NOW = new Date(today("08:00"));

// Users created by the fixtures get their tokens directly (no login). Their password
// is a random, discarded secret - like accounts created by migrations.
const LOCKED_PASSWORD_HASH = bcrypt.hashSync(crypto.randomUUID(), 4);

const bearer = (user) => ({ Authorization: `Bearer ${user.token}` });

// Registers the hooks of an integration test file and returns what its tests use:
//   beforeAll  - migrations build the schema of the (fresh) test database
//   beforeEach - every table is emptied, so each test starts from an empty database
//   afterEach  - event listeners (audit log writes) finish before the next test empties
//                the tables, so nothing from one test lands in the next one
//   afterAll   - the connection pool is closed (no open handles left for Jest)
function setupIntegrationTests() {
  const db = knex(knexConfig);
  const now = () => new Date(NOW);
  const eventBus = createEventBus({ now });
  // createApp() without listen() - Supertest passes requests straight to the app
  const app = createApp({ ...createKnexRepositories(db), jwt: config.jwt, now, eventBus });
  const api = request(app);
  const tokenService = createTokenService(config.jwt);
  let tables = [];
  let consoleLog;

  beforeAll(async () => {
    // The request log (one line per request) is not test output
    consoleLog = jest.spyOn(console, "log").mockImplementation(() => {});
    await db.migrate.latest();
    tables = await db("pg_tables")
      .where({ schemaname: "public" })
      .whereNotIn("tablename", ["knex_migrations", "knex_migrations_lock"])
      .pluck("tablename");
  });

  beforeEach(async () => {
    // All tables at once (new ones from future migrations too); ids start from 1 again
    await db.raw(`TRUNCATE ${tables.map(() => "??").join(", ")} RESTART IDENTITY CASCADE`, tables);
  });

  afterEach(() => eventBus.drain());

  afterAll(async () => {
    await eventBus.drain();
    await db.destroy();
    consoleLog.mockRestore();
  });

  async function createUser({ email, role = "USER" }) {
    const [user] = await db("users")
      .insert({ email, role, password_hash: LOCKED_PASSWORD_HASH })
      .returning(["id", "email", "role"]);
    return { ...user, token: tokenService.signAccessToken(user) };
  }

  async function createBuilding({ name = "Budynek A" } = {}) {
    const [building] = await db("buildings")
      .insert({ name, address: "ul. Testowa 1, Kraków" })
      .returning(["id", "name"]);
    return building;
  }

  async function createRoom({ name = "101", capacity = 10 } = {}) {
    const building = await createBuilding();
    const [room] = await db("rooms")
      .insert({ building_id: building.id, name, capacity })
      .returning(["id", "name", "capacity"]);
    return room;
  }

  async function createReservation({ room, user, startTime, endTime, participants = 2 }) {
    const [reservation] = await db("reservations")
      .insert({
        room_id: room.id,
        user_id: user.id,
        participants,
        start_time: startTime,
        end_time: endTime,
        status: "CONFIRMED",
      })
      .returning(["id"]);
    return reservation;
  }

  return { db, api, eventBus, createUser, createBuilding, createRoom, createReservation };
}

module.exports = { NOW, today, tomorrow, bearer, setupIntegrationTests };
