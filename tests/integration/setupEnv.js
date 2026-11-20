const { loadDotEnv, resolveTestDatabaseUrl } = require("./testDatabase");

// Fixed for tests - no secret from .env is needed (also in CI)
process.env.JWT_SECRET = "integration-tests-only-jwt-secret-0123456789";
process.env.JWT_EXPIRES_IN = "15m";
process.env.REPOSITORY_DRIVER = "knex";

loadDotEnv();

// The app and knexfile read DATABASE_URL - point it at the test database
process.env.DATABASE_URL = resolveTestDatabaseUrl();
