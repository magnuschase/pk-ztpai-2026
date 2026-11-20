const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./docs/openapi");
const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const createBuildingsRouter = require("./modules/buildings/buildings.routes");
const createRoomsRouter = require("./modules/rooms/rooms.routes");
const createReservationsRouter = require("./modules/reservations/reservations.routes");
const createAuthRouter = require("./modules/auth/auth.routes");
const createTokenService = require("./modules/auth/tokens");
const createAuthenticate = require("./middleware/authenticate");
const createEventBus = require("./events/eventBus");
const registerAuditLogListener = require("./modules/auditLog/auditLog.listener");
const registerNotificationListener = require("./modules/notifications/notifications.listener");
const createAuditLogRouter = require("./modules/auditLog/auditLog.routes");

function createApp({
  usersRepository,
  buildingsRepository,
  roomsRepository,
  reservationsRepository,
  auditLogRepository,
  runInTransaction,
  jwt,
  now = () => new Date(),
  // Passed in by whoever has to wait for the listeners (graceful shutdown, tests)
  eventBus = createEventBus({ now }),
}) {
  const app = express();
  const tokenService = createTokenService(jwt);
  const authenticate = createAuthenticate({ tokenService });

  // Side effects of published events - they never change the API response
  registerAuditLogListener({ eventBus, auditLogRepository });
  registerNotificationListener({ eventBus, usersRepository });

  app.use(requestLogger);
  app.use(express.json());

  // Public: register and login (GET /api/auth/me authenticates on its own)
  app.use("/api/auth", createAuthRouter({ usersRepository, tokenService, authenticate }));

  // Public: API documentation. The token pasted under "Authorize" is kept across reloads.
  app.get("/api/docs/openapi.json", (req, res) => res.json(openapiSpec));
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: "Room Booking API",
      swaggerOptions: { persistAuthorization: true },
    }),
  );

  // Everything below requires a valid token - a new route is protected by default,
  // nobody has to remember to add the middleware. Public routes go above this line.
  // Unknown routes also end here, so without a token they give 401, not 404.
  app.use(authenticate);

  app.use("/api/buildings", createBuildingsRouter({ buildingsRepository, roomsRepository }));
  app.use("/api/rooms", createRoomsRouter({ roomsRepository, buildingsRepository }));
  app.use(
    "/api/reservations",
    createReservationsRouter({
      reservationsRepository,
      roomsRepository,
      runInTransaction,
      now,
      eventBus,
    }),
  );
  app.use("/api/admin/audit-log", createAuditLogRouter({ auditLogRepository }));

  app.get("/api/debug/crash", () => {
    throw new Error("boom");
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
