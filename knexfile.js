require("./src/config/env");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

module.exports = {
  client: "pg",
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: "./db/migrations",
  },
  seeds: {
    directory: "./db/seeds",
  },
};
