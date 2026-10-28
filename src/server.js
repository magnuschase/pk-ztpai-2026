require("./config/env");
const knex = require("knex");
const createApp = require("./app");
const { createMemoryDatabase } = require("./db/memoryDatabase");
const BuildingsMemoryRepository = require("./modules/buildings/buildings.repository.memory");
const BuildingsKnexRepository = require("./modules/buildings/buildings.repository.knex");
const RoomsMemoryRepository = require("./modules/rooms/rooms.repository.memory");
const RoomsKnexRepository = require("./modules/rooms/rooms.repository.knex");
const ReservationsMemoryRepository = require("./modules/reservations/reservations.repository.memory");
const ReservationsKnexRepository = require("./modules/reservations/reservations.repository.knex");

const PORT = process.env.PORT || 3000;
const REPOSITORY_DRIVER = process.env.REPOSITORY_DRIVER || "knex";

function createKnexRepositories(db) {
  return {
    buildingsRepository: new BuildingsKnexRepository(db),
    roomsRepository: new RoomsKnexRepository(db),
    reservationsRepository: new ReservationsKnexRepository(db),
  };
}

// The only place that decides which repository implementation the app uses
function createRepositories(driver) {
  if (driver === "memory") {
    const db = createMemoryDatabase();
    const repositories = {
      buildingsRepository: new BuildingsMemoryRepository(db),
      roomsRepository: new RoomsMemoryRepository(db),
      reservationsRepository: new ReservationsMemoryRepository(db),
    };
    // No transactions in memory: units of work run one at a time (like a global lock).
    // There is no rollback, so work should write only at the end.
    let queue = Promise.resolve();
    function runInTransaction(work) {
      const result = queue.then(() => work(repositories));
      queue = result.catch(() => {});
      return result;
    }
    return { ...repositories, runInTransaction };
  }

  if (driver === "knex") {
    const db = knex(require("../knexfile"));
    // Repositories passed to `work` run every query on the same transaction;
    // commit when `work` resolves, rollback when it throws
    function runInTransaction(work) {
      return db.transaction((trx) => work(createKnexRepositories(trx)));
    }
    return { ...createKnexRepositories(db), runInTransaction };
  }

  throw new Error(`Unknown REPOSITORY_DRIVER "${driver}" (expected "knex" or "memory")`);
}

const app = createApp(createRepositories(REPOSITORY_DRIVER));

// Express 5 passes listen errors (e.g. EADDRINUSE) to the callback
app.listen(PORT, (err) => {
  if (err) throw err;
  console.log(`Server is running at http://localhost:${PORT} (repositories: ${REPOSITORY_DRIVER})`);
});
