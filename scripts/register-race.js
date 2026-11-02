// Parallel registrations of one email: sends N POST /api/auth/register at once,
// with the same address in different letter case, then counts the matching rows
// in the database. Correct result: one 201, the rest 409 EMAIL_TAKEN, exactly 1 row.
//
// Usage: node scripts/register-race.js [requests=10]
// API_URL defaults to http://localhost:$PORT (src/config)
const config = require("../src/config");
const knex = require("knex")(require("../knexfile"));

const API_URL = config.apiUrl;

// Every variant normalizes to the same lowercase email
function letterCaseVariant(email, i) {
  if (i % 3 === 1) return email.toUpperCase();
  if (i % 3 === 2) return email[0].toUpperCase() + email.slice(1);
  return email;
}

async function register(body) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  return {
    status: res.status,
    detail: res.ok ? `id=${payload.id}` : (payload?.error?.code ?? "?"),
  };
}

async function main() {
  const requests = Number(process.argv[2] ?? 10);
  // A new address on every run, so the race starts from a free email
  const email = `race-${Date.now()}@example.com`;

  console.log(`POST ${API_URL}/api/auth/register x${requests} in parallel`);
  console.log(`email ${email} (mixed letter case)\n`);

  const results = await Promise.all(
    Array.from({ length: requests }, (_, i) =>
      register({ email: letterCaseVariant(email, i), password: "bardzo-dlugie-haslo" }),
    ),
  );
  results.forEach((result, i) => {
    const sent = letterCaseVariant(email, i);
    console.log(`request ${String(i + 1).padStart(2)}: ${result.status} ${result.detail} (${sent})`);
  });

  const byStatus = {};
  for (const { status } of results) byStatus[status] = (byStatus[status] ?? 0) + 1;
  console.log(
    `\nstatus codes: ${Object.entries(byStatus).map(([status, n]) => `${n}x ${status}`).join(", ")}`,
  );

  const { users } = await knex("users")
    .whereRaw("lower(email) = ?", [email])
    .count({ users: "*" })
    .first();
  const count = Number(users);

  console.log(`users in the database with this email: ${count}`);
  console.log(count === 1 ? "OK - no duplicate account" : `DUPLICATE - ${count} accounts`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
