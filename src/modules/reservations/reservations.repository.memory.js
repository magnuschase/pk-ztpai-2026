const { createMemoryDatabase, nextIdOf } = require("../../db/memoryDatabase");

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
