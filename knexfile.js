try {
  process.loadEnvFile();
} catch (err) {
  // .env is optional - variables can also come from the real environment
  if (err.code !== "ENOENT") throw err;
}

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
