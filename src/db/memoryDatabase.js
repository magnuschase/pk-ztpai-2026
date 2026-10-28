const HOUR_MS = 60 * 60 * 1000;

// In-memory "database" shared by the in-memory repositories, so they can
// resolve relations (room -> building, reservation -> room) like JOINs do.
function createMemoryDatabase() {
  const now = Date.now();

  return {
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
        reservedBy: "Jan Kowalski",
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
        reservedBy: "Anna Nowak",
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
