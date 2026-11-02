// Permission matrix (zad. 4): every endpoint x (no token / USER owner / USER other / ADMIN).
// Sends the real requests, compares each status code with the expected one and prints a
// Markdown table for the report, then the ownership and business-rule checks.
// Test data (buildings, rooms, reservations) is created through the API.
//
// Usage: node scripts/permissions-matrix.js   (after pnpm seed:run)
// API_URL defaults to http://localhost:$PORT (from .env)
require("../src/config/env");

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Seed accounts (db/seeds/01_initial_data.js)
const ACCOUNTS = {
  owner: { email: "jan.kowalski@example.com", password: "user-dev-password" },
  other: { email: "anna.nowak@example.com", password: "user-dev-password" },
  admin: { email: "admin@example.com", password: "admin-dev-password" },
};
const COLUMNS = { none: "brak tokenu", owner: "USER właściciel", other: "USER obcy", admin: "ADMIN" };
// Seed rooms: 3 = capacity 60, 1 = has reservations. Seed building 1 has rooms,
// seed reservation 2 has already started.
const ROOM_ID = 3;
const ROOM_CAPACITY = 60;

let failures = 0;

async function api(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function login(account) {
  const { status, body } = await api("POST", "/api/auth/login", { body: account });
  if (status !== 200) {
    throw new Error(`Login as ${account.email} failed (${status}) - run \`pnpm seed:run\``);
  }
  return body.accessToken;
}

function check(description, ok, details = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${description}${details ? ` (${details})` : ""}`);
}

async function main() {
  const tokens = { none: null };
  for (const role of ["owner", "other", "admin"]) tokens[role] = await login(ACCOUNTS[role]);
  const ownerId = (await api("GET", "/api/auth/me", { token: tokens.owner })).body.id;
  const otherId = (await api("GET", "/api/auth/me", { token: tokens.other })).body.id;

  // Free reservation slots: a day after the latest reservation start (they last at most
  // 8 h, so nothing overlaps there), 3 h apart
  const latest = await api("GET", "/api/reservations?sort=-startTime&limit=1", {
    token: tokens.admin,
  });
  const latestStart = latest.body.data[0] ? Date.parse(latest.body.data[0].startTime) : 0;
  let nextSlotMs = Math.ceil((Math.max(latestStart, Date.now()) + DAY_MS) / HOUR_MS) * HOUR_MS;
  function reservationBody(participants = 5) {
    const start = nextSlotMs;
    nextSlotMs += 3 * HOUR_MS;
    return {
      roomId: ROOM_ID,
      participants,
      startTime: new Date(start).toISOString(),
      endTime: new Date(start + HOUR_MS).toISOString(),
    };
  }
  const createReservation = async (token) =>
    (await api("POST", "/api/reservations", { token, body: reservationBody() })).body;

  let counter = 0;
  const unique = () => `${Date.now()}-${++counter}`;
  const createBuilding = async () =>
    (
      await api("POST", "/api/buildings", {
        token: tokens.admin,
        body: { name: `Matrix ${unique()}`, address: "ul. Testowa 1, Kraków" },
      })
    ).body.id;
  const createRoom = async (buildingId) =>
    (
      await api("POST", "/api/rooms", {
        token: tokens.admin,
        body: { buildingId, name: `M-${unique()}`, capacity: 10 },
      })
    ).body.id;

  // Fixtures - only the ADMIN column (last) changes them, so one per row is enough
  const building = await createBuilding();
  const emptyBuilding = await createBuilding();
  const room = await createRoom(building);
  const roomToDelete = await createRoom(building);
  const ownerReservation = await createReservation(tokens.owner);

  const userOnly = { none: 401, owner: 200, other: 200, admin: 200 };
  const adminOnly = (status) => ({ none: 401, owner: 403, other: 403, admin: status });
  const rows = [
    ["GET", () => "/api/buildings", userOnly],
    ["GET", () => "/api/buildings/1", userOnly],
    ["GET", () => "/api/buildings/1/rooms", userOnly],
    [
      "POST",
      () => ["/api/buildings", { name: `Matrix ${unique()}`, address: "ul. Nowa 2, Kraków" }],
      adminOnly(201),
    ],
    ["PATCH", () => [`/api/buildings/${building}`, { address: "ul. Zmieniona 3, Kraków" }], adminOnly(200)],
    ["DELETE", () => `/api/buildings/${emptyBuilding}`, adminOnly(204)],
    ["GET", () => "/api/rooms", userOnly],
    ["GET", () => "/api/rooms/1", userOnly],
    ["POST", () => ["/api/rooms", { buildingId: building, name: `M-${unique()}`, capacity: 20 }], adminOnly(201)],
    ["PATCH", () => [`/api/rooms/${room}`, { capacity: 12 }], adminOnly(200)],
    ["DELETE", () => `/api/rooms/${roomToDelete}`, adminOnly(204)],
    ["GET", () => "/api/auth/me", userOnly],
    ["GET", () => "/api/reservations", userOnly],
    ["GET", () => `/api/reservations?userId=${ownerId}`, adminOnly(200)],
    ["POST", () => ["/api/reservations", reservationBody()], { none: 401, owner: 201, other: 201, admin: 201 }],
    [
      "GET",
      () => `/api/reservations/${ownerReservation.id}`,
      { none: 401, owner: 200, other: 404, admin: 200 },
    ],
    [
      "PATCH",
      // A fresh reservation of the owner for every cell - a cancelled one stays cancelled
      async () => `/api/reservations/${(await createReservation(tokens.owner)).id}/cancel`,
      { none: 401, owner: 200, other: 404, admin: 200 },
    ],
  ];

  const lines = [
    `| Endpoint | ${Object.values(COLUMNS).join(" | ")} |`,
    `|---|${Object.keys(COLUMNS).map(() => "---").join("|")}|`,
  ];
  for (const [method, target, expected] of rows) {
    const cells = [];
    let label;
    for (const column of Object.keys(COLUMNS)) {
      const resolved = await target();
      const [path, body] = Array.isArray(resolved) ? resolved : [resolved];
      label ??= `${method} ${path.replace(/\/\d+(?=\/|$|\?)/g, "/:id").replace(/=\d+/, "=:id")}`;
      const { status } = await api(method, path, { token: tokens[column], body });
      if (status !== expected[column]) failures++;
      cells.push(status === expected[column] ? `${status}` : `${status} ✗ (oczekiwano ${expected[column]})`);
    }
    lines.push(`| \`${label}\` | ${cells.join(" | ")} |`);
  }
  console.log(lines.join("\n"));
  console.log(`\n${failures === 0 ? "✓ every cell matches" : `✗ ${failures} cell(s) differ`}\n`);

  // Ownership of the list
  const ownList = await api("GET", "/api/reservations?limit=100", { token: tokens.owner });
  const ownerIds = new Set(ownList.body.data.map((reservation) => reservation.user.id));
  check(
    "USER list: only own reservations",
    ownerIds.size === 1 && ownerIds.has(ownerId),
    `${ownList.body.meta.total} reservations, user ids: ${[...ownerIds].join(", ")}`,
  );
  const adminFiltered = await api("GET", `/api/reservations?userId=${ownerId}&limit=100`, {
    token: tokens.admin,
  });
  check(
    "ADMIN ?userId=<owner>: the same reservations as the owner sees",
    adminFiltered.body.meta.total === ownList.body.meta.total &&
      adminFiltered.body.data.every((reservation) => reservation.user.id === ownerId),
    `total ${adminFiltered.body.meta.total}`,
  );
  const adminAll = await api("GET", "/api/reservations?limit=100", { token: tokens.admin });
  const allUserIds = new Set(adminAll.body.data.map((reservation) => reservation.user.id));
  check(
    "ADMIN list: reservations of every user",
    allUserIds.size > 1 && adminAll.body.meta.total > ownList.body.meta.total,
    `${adminAll.body.meta.total} reservations, ${allUserIds.size} users`,
  );
  const otherFilter = await api("GET", `/api/reservations?userId=${otherId}`, { token: tokens.owner });
  check("USER ?userId=<someone else> -> 403", otherFilter.status === 403, `${otherFilter.status}`);
  const paged = await api(
    "GET",
    "/api/reservations?status=CONFIRMED&sort=-startTime&limit=1&page=2",
    { token: tokens.owner },
  );
  check(
    "USER pagination + filters still work, still only own",
    paged.status === 200 &&
      paged.body.meta.limit === 1 &&
      paged.body.meta.page === 2 &&
      paged.body.data.every((r) => r.user.id === ownerId && r.status === "CONFIRMED"),
    `meta ${JSON.stringify(paged.body.meta)}`,
  );
  const missing = await api("GET", "/api/reservations/999999", { token: tokens.other });
  const foreign = await api("GET", `/api/reservations/${ownerReservation.id}`, { token: tokens.other });
  check(
    "USER: someone else's reservation looks exactly like a missing one",
    foreign.status === missing.status &&
      foreign.body.error.code === missing.body.error.code &&
      foreign.body.error.message === missing.body.error.message,
    `${foreign.status} ${foreign.body.error.code}`,
  );

  // Business rules apply to ADMIN too
  console.log("");
  const expectError = async (description, request, code) => {
    const { status, body } = await request;
    check(description, body?.error?.code === code, `${status} ${body?.error?.code}`);
  };
  await expectError(
    "ADMIN cancels a reservation that has started",
    api("PATCH", "/api/reservations/2/cancel", { token: tokens.admin }),
    "RESERVATION_ALREADY_STARTED",
  );
  await expectError(
    "ADMIN books a taken slot",
    api("POST", "/api/reservations", {
      token: tokens.admin,
      body: { roomId: ROOM_ID, participants: 5, startTime: ownerReservation.startTime, endTime: ownerReservation.endTime },
    }),
    "ROOM_ALREADY_BOOKED",
  );
  await expectError(
    "ADMIN exceeds room capacity",
    api("POST", "/api/reservations", { token: tokens.admin, body: reservationBody(ROOM_CAPACITY + 1) }),
    "ROOM_CAPACITY_EXCEEDED",
  );
  await expectError(
    "ADMIN deletes a building that has rooms",
    api("DELETE", "/api/buildings/1", { token: tokens.admin }),
    "BUILDING_HAS_ROOMS",
  );
  await expectError(
    "ADMIN deletes a room that has reservations",
    api("DELETE", "/api/rooms/1", { token: tokens.admin }),
    "ROOM_HAS_RESERVATIONS",
  );

  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
