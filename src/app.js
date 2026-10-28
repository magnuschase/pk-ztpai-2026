const express = require("express");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const createRoomsRouter = require("./modules/rooms/rooms.routes");
const createReservationsRouter = require("./modules/reservations/reservations.routes");

function createApp({
  roomsRepository,
  reservationsRepository,
  now = () => new Date(),
}) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  app.use("/api/rooms", createRoomsRouter({ roomsRepository }));
  app.use(
    "/api/reservations",
    createReservationsRouter({ reservationsRepository, roomsRepository, now }),
  );

  app.get("/api/debug/crash", () => {
    throw new Error("boom");
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
