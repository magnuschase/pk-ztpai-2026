// Audit log scenario (lab 5, zad. 4) against a running API:
//   1. USER creates a reservation               -> 201, event reservation.created
//   2. another USER books an overlapping slot   -> 409, no event
//   3. ADMIN cancels the reservation            -> 200, event reservation.cancelled
//                                                  (+ [notification] in the server log)
//   4. ADMIN cancels it again                   -> 200, no event (idempotent)
// Then prints GET /api/admin/audit-log - two new entries, newest first.
//
// Usage: pnpm audit-log:scenario   (API running, after pnpm seed:run)
// API_URL defaults to http://localhost:$PORT (src/config)
const config = require("../src/config");

const API_URL = config.apiUrl;
const DAY_MS = 24 * 60 * 60 * 1000;

// Seed accounts (db/seeds/01_initial_data.js)
const ACCOUNTS = {
  owner: { email: "jan.kowalski@example.com", password: "user-dev-password" },
  other: { email: "anna.nowak@example.com", password: "user-dev-password" },
  admin: { email: "admin@example.com", password: "admin-dev-password" },
};
const ROOM_ID = 3;

async function api(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function login({ email, password }) {
  const { status, body } = await api("POST", "/api/auth/login", { body: { email, password } });
  if (status !== 200) {
    throw new Error(`Login as ${email} failed (${status}) - run \`pnpm seed:run\``);
  }
  return body.accessToken;
}

function step(label, { status, body }) {
  const detail = body?.error ? body.error.code : (body?.status ?? "");
  console.log(`${label.padEnd(44)} -> ${status} ${detail}`);
}

// 60 days ahead, 10:00-12:00 UTC - far from the seed reservations
function slot(startHour, endHour) {
  const day = new Date(Date.now() + 60 * DAY_MS).toISOString().slice(0, 10);
  const at = (hour) => `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;
  return { startTime: at(startHour), endTime: at(endHour) };
}

async function main() {
  const [owner, other, admin] = await Promise.all([
    login(ACCOUNTS.owner),
    login(ACCOUNTS.other),
    login(ACCOUNTS.admin),
  ]);

  const created = await api("POST", "/api/reservations", {
    token: owner,
    body: { roomId: ROOM_ID, participants: 5, ...slot(10, 12) },
  });
  step("1. jan.kowalski creates a reservation", created);
  if (created.status !== 201) {
    throw new Error(`Could not create the reservation: ${JSON.stringify(created.body)}`);
  }
  const id = created.body.id;

  step(
    "2. anna.nowak books an overlapping slot",
    await api("POST", "/api/reservations", {
      token: other,
      body: { roomId: ROOM_ID, participants: 5, ...slot(11, 13) },
    }),
  );
  step(`3. ADMIN cancels reservation #${id}`, await api("PATCH", `/api/reservations/${id}/cancel`, { token: admin }));
  step(`4. ADMIN cancels reservation #${id} again`, await api("PATCH", `/api/reservations/${id}/cancel`, { token: admin }));

  // Listeners run after the response - give the audit log write a moment
  await new Promise((resolve) => setTimeout(resolve, 300));

  const auditLog = await api("GET", "/api/admin/audit-log?limit=5", { token: admin });
  console.log(`\nGET /api/admin/audit-log?limit=5 -> ${auditLog.status}`);
  console.log(JSON.stringify(auditLog.body, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
