// First: an invalid configuration stops the process here, before anything starts
const config = require("./config");
const knex = require("knex");
const createApp = require("./app");
const { createKnexRepositories, createMemoryRepositories } = require("./db/repositories");
const createEventBus = require("./events/eventBus");

// Close the HTTP server and the pool in time - Docker sends SIGKILL 10 s after SIGTERM
const SHUTDOWN_TIMEOUT_MS = 8000;

// The only place that decides which repository implementation the app uses.
// db is the knex connection pool - null for the in-memory repositories.
const db = config.repositoryDriver === "knex" ? knex(require("../knexfile")) : null;
const repositories = db ? createKnexRepositories(db) : createMemoryRepositories();

const eventBus = createEventBus();

const app = createApp({ ...repositories, jwt: config.jwt, eventBus });

// Express 5 passes listen errors (e.g. EADDRINUSE) to the callback
const server = app.listen(config.port, (err) => {
  if (err) throw err;
  console.log(
    `Server is running at http://localhost:${config.port} (repositories: ${config.repositoryDriver})`,
  );
  console.log(`API docs: http://localhost:${config.port}/api/docs`);
});

// SIGTERM: docker stop / docker compose down, SIGINT: Ctrl+C. Stop accepting connections,
// let requests in progress finish, wait for the event listeners they triggered (audit log
// writes), then close the database pool. The process then exits on its own - nothing is
// left in the event loop.
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received - closing the HTTP server`);

  // A request that hangs must not keep the process alive until SIGKILL
  setTimeout(() => {
    console.error(`Shutdown did not finish within ${SHUTDOWN_TIMEOUT_MS} ms - exiting`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  // Also closes idle keep-alive connections, so it does not wait for their timeout
  server.close(async (err) => {
    if (err) {
      console.error("Error while closing the HTTP server:", err);
      process.exitCode = 1;
    } else {
      console.log("HTTP server closed");
    }
    await eventBus.drain();
    console.log("Event listeners finished");
    if (db) {
      await db.destroy();
      console.log("Database pool closed");
    }
    console.log("Shutdown complete");
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
