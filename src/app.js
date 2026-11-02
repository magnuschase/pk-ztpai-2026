const express = require("express");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const createBuildingsRouter = require("./modules/buildings/buildings.routes");
const createRoomsRouter = require("./modules/rooms/rooms.routes");
const createReservationsRouter = require("./modules/reservations/reservations.routes");
const createAuthRouter = require("./modules/auth/auth.routes");

function createApp({
  usersRepository,
  buildingsRepository,
  roomsRepository,
  reservationsRepository,
  runInTransaction,
  now = () => new Date(),
}) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  app.use("/api/auth", createAuthRouter({ usersRepository }));
  app.use("/api/buildings", createBuildingsRouter({ buildingsRepository, roomsRepository }));
  app.use("/api/rooms", createRoomsRouter({ roomsRepository, buildingsRepository }));
  app.use(
    "/api/reservations",
    createReservationsRouter({ reservationsRepository, roomsRepository, runInTransaction, now }),
  );

  app.get("/api/debug/crash", () => {
    throw new Error("boom");
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
