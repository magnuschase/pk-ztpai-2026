const { createMemoryRepositories } = require("../../../src/db/repositories");
const createReservationsService = require("../../../src/modules/reservations/reservations.service");

// The injected "now" of every test: today 08:00 UTC
const TODAY = "2026-12-07";
const TOMORROW = "2026-12-08";
const today = (hhmm) => `${TODAY}T${hhmm}:00.000Z`;
const tomorrow = (hhmm) => `${TOMORROW}T${hhmm}:00.000Z`;
const NOW = new Date(today("08:00"));

// currentUser as the service gets it from the token
const USERS = Object.freeze({
  admin: Object.freeze({ id: 1, role: "ADMIN" }),
  owner: Object.freeze({ id: 2, role: "USER" }),
  other: Object.freeze({ id: 3, role: "USER" }),
});

const ROOM = Object.freeze({ id: 1, capacity: 10 });
const OTHER_ROOM = Object.freeze({ id: 2, capacity: 10 });

// A clock the test controls: the service sees time move only when the test says so
function createTestClock(start = NOW) {
  let current = start.getTime();
  return {
    now: () => new Date(current),
    advance(ms) {
      current += ms;
    },
  };
}

// Defaults for a reservation already in the "database"
function storedReservation(data, index) {
  return {
    id: index + 1,
    roomId: ROOM.id,
    userId: USERS.owner.id,
    participants: 2,
    status: "CONFIRMED",
    createdAt: new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    cancelledAt: null,
    ...data,
  };
}

// Builds a brand new in-memory database, repositories, clock and service, so every
// test starts from its own state and tests pass in any order.
//   eventBus        - publish is a jest.fn() unless a test passes its own bus
//   wrapTransaction - (runInTransaction) => replacement, e.g. to record when the
//                     transaction resolves (commits) or make the commit fail
function createReservationsTestContext({
  reservations = [],
  eventBus = { publish: jest.fn() },
  wrapTransaction = (runInTransaction) => runInTransaction,
} = {}) {
  const db = {
    users: [
      { id: USERS.admin.id, email: "admin@example.com", role: "ADMIN" },
      { id: USERS.owner.id, email: "owner@example.com", role: "USER" },
      { id: USERS.other.id, email: "other@example.com", role: "USER" },
    ],
    buildings: [{ id: 1, name: "Budynek A", address: "ul. Testowa 1" }],
    rooms: [
      { id: ROOM.id, buildingId: 1, name: "A101", capacity: ROOM.capacity },
      { id: OTHER_ROOM.id, buildingId: 1, name: "A102", capacity: OTHER_ROOM.capacity },
    ],
    reservations: reservations.map(storedReservation),
    auditLog: [],
  };

  // The same in-memory repositories and runInTransaction as REPOSITORY_DRIVER=memory
  const {
    usersRepository,
    roomsRepository,
    reservationsRepository,
    auditLogRepository,
    runInTransaction,
  } = createMemoryRepositories(db);
  const clock = createTestClock();

  const service = createReservationsService({
    roomsRepository,
    reservationsRepository,
    runInTransaction: wrapTransaction(runInTransaction),
    now: clock.now,
    eventBus,
  });

  return {
    service,
    clock,
    eventBus,
    usersRepository,
    roomsRepository,
    reservationsRepository,
    auditLogRepository,
  };
}

module.exports = {
  NOW,
  USERS,
  ROOM,
  OTHER_ROOM,
  today,
  tomorrow,
  createReservationsTestContext,
};
