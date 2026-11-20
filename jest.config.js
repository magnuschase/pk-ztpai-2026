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
  ],
};
