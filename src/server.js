// First: an invalid configuration stops the process here, before anything starts
const config = require("./config");
const knex = require("knex");
const createApp = require("./app");
const { createKnexRepositories, createMemoryRepositories } = require("./db/repositories");

// The only place that decides which repository implementation the app uses
function createRepositories(driver) {
  if (driver === "memory") return createMemoryRepositories();
  if (driver === "knex") return createKnexRepositories(knex(require("../knexfile")));
  throw new Error(`Unknown REPOSITORY_DRIVER "${driver}" (expected "knex" or "memory")`);
}

const app = createApp({
  ...createRepositories(config.repositoryDriver),
  jwt: config.jwt,
});

// Express 5 passes listen errors (e.g. EADDRINUSE) to the callback
app.listen(config.port, (err) => {
  if (err) throw err;
  console.log(
    `Server is running at http://localhost:${config.port} (repositories: ${config.repositoryDriver})`,
  );
  console.log(`API docs: http://localhost:${config.port}/api/docs`);
});
