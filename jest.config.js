/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
      // Unit tests run on the in-memory repositories only. If anything they load
      // reaches for the database driver, the require fails instead of connecting.
      moduleNameMapper: {
        "^pg$": "<rootDir>/tests/unit/noDatabase.js",
        "^knex$": "<rootDir>/tests/unit/noDatabase.js",
      },
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
      // Once per run (only when integration tests are selected): drop and create
      // the test database, so every run starts from an empty one
      globalSetup: "<rootDir>/tests/integration/globalSetup.js",
      // Before each test file: test configuration
      setupFiles: ["<rootDir>/tests/integration/setupEnv.js"],
      // bcrypt (cost 12) in register / login takes a few hundred ms per call
      testTimeout: 15000,
    },
  ],
};
