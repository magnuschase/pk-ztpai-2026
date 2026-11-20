const { createMemoryDatabase } = require("./memoryDatabase");
const BuildingsMemoryRepository = require("../modules/buildings/buildings.repository.memory");
const BuildingsKnexRepository = require("../modules/buildings/buildings.repository.knex");
const RoomsMemoryRepository = require("../modules/rooms/rooms.repository.memory");
const RoomsKnexRepository = require("../modules/rooms/rooms.repository.knex");
const ReservationsMemoryRepository = require("../modules/reservations/reservations.repository.memory");
const ReservationsKnexRepository = require("../modules/reservations/reservations.repository.knex");
const UsersMemoryRepository = require("../modules/users/users.repository.memory");
const UsersKnexRepository = require("../modules/users/users.repository.knex");

// Repositories on a knex instance (pool) or on a transaction
function knexRepositoriesOn(db) {
  return {
    usersRepository: new UsersKnexRepository(db),
    buildingsRepository: new BuildingsKnexRepository(db),
    roomsRepository: new RoomsKnexRepository(db),
    reservationsRepository: new ReservationsKnexRepository(db),
  };
}

// db - a knex instance; the caller owns it (and closes it with db.destroy())
function createKnexRepositories(db) {
  // Repositories passed to `work` run every query on the same transaction;
  // commit when `work` resolves, rollback when it throws
  function runInTransaction(work) {
    return db.transaction((trx) => work(knexRepositoriesOn(trx)));
  }
  return { ...knexRepositoriesOn(db), runInTransaction };
}

function createMemoryRepositories(db = createMemoryDatabase()) {
  const repositories = {
    usersRepository: new UsersMemoryRepository(db),
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

module.exports = { createKnexRepositories, createMemoryRepositories };
