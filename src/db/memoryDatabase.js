const HOUR_MS = 60 * 60 * 1000;

// bcrypt (cost 12) of "admin-dev-password" and "user-dev-password" - the same accounts
// as in the knex seed
const ADMIN_PASSWORD_HASH = "$2b$12$ky6Yybu9Qd.78UQvf3W2LOIXVUxOYEeUotsnPoS4fymu67sDI9Oja";
const USER_PASSWORD_HASH = "$2b$12$8Xr/nhFsmhvfcH6oQJMcmuKa6E0/NUtdlM2l0ZxB1DmueSavShJ6m";

// In-memory "database" shared by the in-memory repositories, so they can resolve
// relations (room -> building, reservation -> room / user) like JOINs do.
function createMemoryDatabase() {
  const now = Date.now();
  const user = (id, email, role, passwordHash) => ({
    id,
    email,
    passwordHash,
    role,
    createdAt: new Date(now).toISOString(),
  });

  return {
    users: [
      user(1, "admin@example.com", "ADMIN", ADMIN_PASSWORD_HASH),
      user(2, "jan.kowalski@example.com", "USER", USER_PASSWORD_HASH),
      user(3, "anna.nowak@example.com", "USER", USER_PASSWORD_HASH),
    ],
    buildings: [
      { id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
      { id: 2, name: "Budynek B", address: "al. Jana Pawła II 37, Kraków" },
    ],
    rooms: [
      { id: 1, buildingId: 1, name: "A101", capacity: 30 },
      { id: 2, buildingId: 1, name: "A102", capacity: 25 },
      { id: 3, buildingId: 1, name: "A103", capacity: 35 },
      { id: 4, buildingId: 2, name: "A104", capacity: 40 },
    ],
    reservations: [
      {
        id: 1,
        roomId: 1,
        userId: 2,
        participants: 20,
        startTime: new Date(now + 24 * HOUR_MS).toISOString(),
        endTime: new Date(now + 26 * HOUR_MS).toISOString(),
        status: "CONFIRMED",
        createdAt: new Date(now).toISOString(),
        cancelledAt: null,
        internalNote: "seed: upcoming reservation used for overlap tests",
      },
      {
        id: 2,
        roomId: 2,
        userId: 3,
        participants: 10,
        // started half an hour ago and not yet finished -> used to test
        // "cannot cancel a reservation that has already started"
        startTime: new Date(now - 0.5 * HOUR_MS).toISOString(),
        endTime: new Date(now + 0.5 * HOUR_MS).toISOString(),
        status: "CONFIRMED",
        createdAt: new Date(now - 2 * HOUR_MS).toISOString(),
        cancelledAt: null,
        internalNote: "seed: already started, used for RESERVATION_ALREADY_STARTED",
      },
    ],
  };
}

function nextIdOf(rows) {
  return Math.max(0, ...rows.map((row) => row.id)) + 1;
}

module.exports = { createMemoryDatabase, nextIdOf };
