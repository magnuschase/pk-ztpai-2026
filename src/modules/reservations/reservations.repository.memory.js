const HOUR_MS = 60 * 60 * 1000;

function buildSeed() {
  const now = Date.now();

  return [
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
  ];
}

class ReservationsRepository {
  #reservations;
  #nextId;

  constructor() {
    this.#reservations = buildSeed();
    this.#nextId = this.#reservations.length + 1;
  }

  async findAll() {
    return this.#reservations;
  }

  async findAllByRoomId(roomId) {
    return this.#reservations.filter((reservation) => reservation.roomId === roomId);
  }

  async findById(id) {
    return this.#reservations.find((reservation) => reservation.id === id) ?? null;
  }

  async create(data) {
    const reservation = { id: this.#nextId++, ...data };
    this.#reservations.push(reservation);
    return reservation;
  }

  async update(id, patch) {
    const reservation = await this.findById(id);
    if (!reservation) return null;
    Object.assign(reservation, patch);
    return reservation;
  }
}

module.exports = ReservationsRepository;
