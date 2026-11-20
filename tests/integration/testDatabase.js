// Where the integration tests run - shared by globalSetup.js and setupEnv.js
const path = require("path");

const TEST_DATABASE_SUFFIX = "_test";

// .env from the project root, without overriding variables that are already set
function loadDotEnv() {
  try {
    process.loadEnvFile(path.join(__dirname, "../../.env"));
  } catch (err) {
    // No .env (e.g. in CI) - everything comes from the real environment
    if (err.code !== "ENOENT") throw err;
  }
}

function databaseNameOf(url) {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

function withDatabaseName(url, name) {
  const result = new URL(url);
  result.pathname = `/${encodeURIComponent(name)}`;
  return result.toString();
}

// TEST_DATABASE_URL, or else DATABASE_URL with "_test" appended to the database name
// (room_booking -> room_booking_test). Never the development database: the name has
// to end with "_test", because every test run drops and recreates this database.
function resolveTestDatabaseUrl(env = process.env) {
  let url = env.TEST_DATABASE_URL;
  if (!url) {
    if (!env.DATABASE_URL) {
      throw new Error("Set TEST_DATABASE_URL (or DATABASE_URL) for the integration tests");
    }
    const name = databaseNameOf(env.DATABASE_URL);
    url = name.endsWith(TEST_DATABASE_SUFFIX)
      ? env.DATABASE_URL
      : withDatabaseName(env.DATABASE_URL, `${name}${TEST_DATABASE_SUFFIX}`);
  }

  const name = databaseNameOf(url);
  if (!name.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `Refusing to run integration tests on database "${name}" - ` +
        `the test database name must end with "${TEST_DATABASE_SUFFIX}"`,
    );
  }
  return url;
}

module.exports = { loadDotEnv, databaseNameOf, withDatabaseName, resolveTestDatabaseUrl };
