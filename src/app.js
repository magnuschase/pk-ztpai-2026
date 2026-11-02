const express = require("express");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const createBuildingsRouter = require("./modules/buildings/buildings.routes");
const createRoomsRouter = require("./modules/rooms/rooms.routes");
const createReservationsRouter = require("./modules/reservations/reservations.routes");
const createAuthRouter = require("./modules/auth/auth.routes");
const createTokenService = require("./modules/auth/tokens");
const createAuthenticate = require("./middleware/authenticate");

function createApp({
  usersRepository,
  buildingsRepository,
  roomsRepository,
  reservationsRepository,
  runInTransaction,
  jwt,
  now = () => new Date(),
}) {
  const app = express();
  const tokenService = createTokenService(jwt);
  const authenticate = createAuthenticate({ tokenService });

  app.use(requestLogger);
  app.use(express.json());

  // Public: register and login (GET /api/auth/me authenticates on its own)
  app.use("/api/auth", createAuthRouter({ usersRepository, tokenService, authenticate }));

  // Everything below requires a valid token - a new route is protected by default,
  // nobody has to remember to add the middleware. Public routes go above this line.
  // Unknown routes also end here, so without a token they give 401, not 404.
  app.use(authenticate);

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
