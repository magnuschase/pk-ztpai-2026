// Every 401 case of the authenticate middleware, sent to one protected endpoint
// (GET /api/reservations). Logs in as a seed user first and breaks that token.
//
// Expired token: start the server with a short lifetime (JWT_EXPIRES_IN=10s pnpm dev) -
// the script then waits until the token expires. With a long lifetime it skips that case.
//
// Usage: node scripts/auth-401.js
// API_URL defaults to http://localhost:$PORT (from .env)
require("../src/config/env");

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const ENDPOINT = `${API_URL}/api/reservations`;
// Seed account (db/seeds/01_initial_data.js)
const CREDENTIALS = { email: "jan.kowalski@example.com", password: "user-dev-password" };
const MAX_WAIT_S = 60;
const SECONDS_PER_UNIT = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 };

const toBase64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const fromBase64url = (part) => JSON.parse(Buffer.from(part, "base64url").toString());

async function login() {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CREDENTIALS),
  });
  if (!res.ok) {
    throw new Error(`Login as ${CREDENTIALS.email} failed (${res.status}) - run \`pnpm seed:run\``);
  }
  return res.json();
}

async function check(name, authorization) {
  const res = await fetch(ENDPOINT, {
    headers: authorization === undefined ? {} : { Authorization: authorization },
  });
  const payload = await res.json().catch(() => null);
  const error = payload?.error ? `${payload.error.code} - ${payload.error.message}` : "OK";
  console.log(`${name.padEnd(46)} ${res.status} ${error}`);
}

// Swaps one character in the middle of the signature. Not the last one: in base64url
// its lowest bits are padding, so some swaps there would not change the decoded bytes.
function changeOneSignatureChar(token) {
  const [header, payload, signature] = token.split(".");
  const i = Math.floor(signature.length / 2);
  const swapped = signature[i] === "A" ? "B" : "A";
  return `${header}.${payload}.${signature.slice(0, i)}${swapped}${signature.slice(i + 1)}`;
}

// role -> ADMIN in the payload, header and signature stay the original ones
function escalateRole(token) {
  const [header, payload, signature] = token.split(".");
  return `${header}.${toBase64url({ ...fromBase64url(payload), role: "ADMIN" })}.${signature}`;
}

function algNone(token) {
  const payload = token.split(".")[1];
  return `${toBase64url({ alg: "none", typ: "JWT" })}.${payload}.`;
}

async function main() {
  const { accessToken, expiresIn } = await login();
  console.log(`GET ${ENDPOINT}, token of ${CREDENTIALS.email} (expiresIn: ${expiresIn})\n`);

  await check("valid token (reference)", `Bearer ${accessToken}`);
  await check("no Authorization header", undefined);
  await check("Basic scheme", "Basic amFuOnRham5lLWhhc2xv");
  await check("Bearer without a token", "Bearer");
  await check("token without Bearer", accessToken);
  await check("bad signature (1 character changed)", `Bearer ${changeOneSignatureChar(accessToken)}`);
  await check("payload role -> ADMIN, original signature", `Bearer ${escalateRole(accessToken)}`);
  await check('header "alg": "none", no signature', `Bearer ${algNone(accessToken)}`);
  await check("not a JWT at all", "Bearer not-a-jwt");

  const [, amount, unit] = /^(\d+)([smhd])$/.exec(expiresIn) ?? [];
  const lifetimeS = Number(amount) * SECONDS_PER_UNIT[unit];
  if (!(lifetimeS <= MAX_WAIT_S)) {
    console.log(`expired token: skipped - restart the server with JWT_EXPIRES_IN=10s`);
    return;
  }
  console.log(`\nwaiting ${lifetimeS + 1} s for the token to expire...`);
  await new Promise((resolve) => setTimeout(resolve, (lifetimeS + 1) * 1000));
  await check("expired token", `Bearer ${accessToken}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
