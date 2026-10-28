require("./config/env");
const knex = require("knex");
const createApp = require("./app");
const BuildingsMemoryRepository = require("./modules/buildings/buildings.repository.memory");
const BuildingsKnexRepository = require("./modules/buildings/buildings.repository.knex");
const RoomsMemoryRepository = require("./modules/rooms/rooms.repository.memory");
const RoomsKnexRepository = require("./modules/rooms/rooms.repository.knex");
const ReservationsMemoryRepository = require("./modules/reservations/reservations.repository.memory");
const ReservationsKnexRepository = require("./modules/reservations/reservations.repository.knex");

const PORT = process.env.PORT || 3000;
const REPOSITORY_DRIVER = process.env.REPOSITORY_DRIVER || "knex";

// The only place that decides which repository implementation the app uses
function createRepositories(driver) {
  if (driver === "memory") {
    return {
      buildingsRepository: new BuildingsMemoryRepository(),
      roomsRepository: new RoomsMemoryRepository(),
      reservationsRepository: new ReservationsMemoryRepository(),
    };
  }

  if (driver === "knex") {
    const db = knex(require("../knexfile"));
    return {
      buildingsRepository: new BuildingsKnexRepository(db),
      roomsRepository: new RoomsKnexRepository(db),
      reservationsRepository: new ReservationsKnexRepository(db),
    };
  }

  throw new Error(`Unknown REPOSITORY_DRIVER "${driver}" (expected "knex" or "memory")`);
}

const app = createApp(createRepositories(REPOSITORY_DRIVER));

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT} (repositories: ${REPOSITORY_DRIVER})`);
});
