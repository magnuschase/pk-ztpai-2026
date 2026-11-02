const config = require("./src/config");

module.exports = {
  client: "pg",
  connection: config.databaseUrl,
  migrations: {
    directory: "./db/migrations",
  },
  seeds: {
    directory: "./db/seeds",
  },
};
