// The only place in the project that reads process.env. Everything else imports
// the validated values from here: require("./config") / require("../src/config").
const path = require("path");
const { z } = require("zod");

// Loads .env (from the project root, whatever the working directory) into process.env.
// Variables already set in the real environment win.
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch (err) {
  // .env is optional - variables can also come from the real environment
  if (err.code !== "ENOENT") throw err;
}

// "is required" for a missing variable, `invalid` for a present but wrong one
const required = (invalid) => (issue) => (issue.input === undefined ? "is required" : invalid);

const envSchema = z.object({
  PORT: z.coerce
    .number({ error: "must be a port number (1-65535)" })
    .int("must be a port number (1-65535)")
    .min(1, "must be a port number (1-65535)")
    .max(65535, "must be a port number (1-65535)")
    .default(3000),
  REPOSITORY_DRIVER: z
    .enum(["knex", "memory"], { error: 'must be "knex" or "memory"' })
    .default("knex"),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: required("must be a postgres:// URL, e.g. postgres://user:password@localhost:5432/db"),
  }),
  // HS256 key - a short one can be brute forced offline from any issued token
  JWT_SECRET: z
    .string({ error: required("must be a string") })
    .min(32, "must be at least 32 characters long (generate one: openssl rand -hex 32)"),
  // A unit is required: jsonwebtoken reads a bare "900" as 900 milliseconds, not seconds,
  // so every token would be expired as soon as it is issued
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "must be a number with a unit: 10s, 15m, 1h or 7d")
    .default("15m"),
  // Base URL of a running API - used only by the scripts in scripts/
  API_URL: z.url({ error: "must be a URL, e.g. http://localhost:3000" }).optional(),
});

// "JWT_SECRET=" (empty, as in .env.example) counts as not set
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));
const result = envSchema.safeParse(env);

if (!result.success) {
  // Only names and rules are printed, never the values - they may be secrets
  const problems = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  console.error(
    [
      "Invalid configuration - the application will not start:",
      ...problems,
      "Set the variables in .env (see .env.example) or in the environment.",
    ].join("\n"),
  );
  process.exit(1);
}

const { data } = result;

module.exports = Object.freeze({
  port: data.PORT,
  repositoryDriver: data.REPOSITORY_DRIVER,
  databaseUrl: data.DATABASE_URL,
  jwt: Object.freeze({ secret: data.JWT_SECRET, expiresIn: data.JWT_EXPIRES_IN }),
  apiUrl: data.API_URL ?? `http://localhost:${data.PORT}`,
});
