// Runs once before the integration tests: every run starts from a fresh, empty test
// database. The schema is then built by the migrations in beforeAll (helpers/setup.js).
const { Client } = require("pg");
const {
  loadDotEnv,
  databaseNameOf,
  withDatabaseName,
  resolveTestDatabaseUrl,
} = require("./testDatabase");

module.exports = async function globalSetup() {
  loadDotEnv();
  const testUrl = resolveTestDatabaseUrl();
  const testDatabase = databaseNameOf(testUrl);

  // CREATE / DROP DATABASE cannot run inside the database itself - use the
  // maintenance database "postgres" on the same server
  const client = new Client({ connectionString: withDatabaseName(testUrl, "postgres") });
  try {
    await client.connect();
  } catch (err) {
    const { hostname, port } = new URL(testUrl);
    throw new Error(
      `Cannot connect to PostgreSQL at ${hostname}:${port || 5432} for the integration ` +
        `tests - is it running? (npm run db:up)\n${err.message}`,
    );
  }

  try {
    const name = client.escapeIdentifier(testDatabase);
    // FORCE: also when a leftover connection (e.g. psql) is still open
    await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${name}`);
  } finally {
    await client.end();
  }
};
