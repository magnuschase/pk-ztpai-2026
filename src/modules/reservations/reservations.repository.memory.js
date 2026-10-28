const { exclusionViolation } = require("../../errors/postgres");
const { createMemoryDatabase, nextIdOf } = require("../../db/memoryDatabase");

// Emulates the reservations_no_overlap exclusion constraint
function overlapsConfirmed(a, b) {
  return (
    a.roomId === b.roomId &&
    a.status === "CONFIRMED" &&
    b.status === "CONFIRMED" &&
    Date.parse(a.startTime) < Date.parse(b.endTime) &&
    Date.parse(b.startTime) < Date.parse(a.endTime)
  );
}

class ReservationsRepository {
  #db;
  #nextId;

  constructor(db = createMemoryDatabase()) {
    this.#db = db;
    this.#nextId = nextIdOf(db.reservations);
  }

  // Emulates JOIN rooms JOIN buildings
  #withRoom(reservation) {
    const room = this.#db.rooms.find((room) => room.id === reservation.roomId);
    const building = this.#db.buildings.find((building) => building.id === room.buildingId);
    return {
      ...reservation,
      room: {
        id: room.id,
        name: room.name,
        building: { id: building.id, name: building.name },
      },
    };
  }

  async findAll() {
    return this.#db.reservations.map((reservation) => this.#withRoom(reservation));
  }

  async findPage({ filters, sort, limit, offset }) {
    const { roomId, buildingId, status, from, to } = filters;
    const matching = this.#db.reservations
      .map((reservation) => this.#withRoom(reservation))
      .filter(
        (reservation) =>
          (roomId === undefined || reservation.roomId === roomId) &&
          (buildingId === undefined || reservation.room.building.id === buildingId) &&
          (status === undefined || reservation.status === status) &&
          (to === undefined || Date.parse(reservation.startTime) < Date.parse(to)) &&
          (from === undefined || Date.parse(reservation.endTime) > Date.parse(from)),
      );

    const sortValue = {
      startTime: (reservation) => Date.parse(reservation.startTime),
      createdAt: (reservation) => Date.parse(reservation.createdAt),
      participants: (reservation) => reservation.participants,
    }[sort.field];
    const sign = sort.direction === "desc" ? -1 : 1;
    matching.sort((a, b) => sign * (sortValue(a) - sortValue(b) || a.id - b.id));

    return { items: matching.slice(offset, offset + limit), total: matching.length };
  }

  async findAllByRoomId(roomId) {
    return this.#db.reservations
      .filter((reservation) => reservation.roomId === roomId)
      .map((reservation) => this.#withRoom(reservation));
  }

  async findById(id) {
    const reservation = this.#db.reservations.find((reservation) => reservation.id === id);
    return reservation ? this.#withRoom(reservation) : null;
  }

  async create(data) {
    if (this.#db.reservations.some((existing) => overlapsConfirmed(existing, data))) {
      throw exclusionViolation("reservations_no_overlap");
    }
    const reservation = { id: this.#nextId++, ...data };
    this.#db.reservations.push(reservation);
    return this.#withRoom(reservation);
  }

  async update(id, patch) {
    const reservation = this.#db.reservations.find((reservation) => reservation.id === id);
    if (!reservation) return null;
    Object.assign(reservation, patch);
    return this.#withRoom(reservation);
  }
}

module.exports = ReservationsRepository;
