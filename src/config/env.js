// Loads .env into process.env. Variables already set in the real environment win.
try {
  process.loadEnvFile();
} catch (err) {
  // .env is optional - variables can also come from the real environment
  if (err.code !== "ENOENT") throw err;
}
