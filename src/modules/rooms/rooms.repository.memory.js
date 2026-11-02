const { uniqueViolation, foreignKeyViolation } = require("../../errors/postgres");
const { createMemoryDatabase, nextIdOf } = require("../../db/memoryDatabase");

class RoomsRepository {
  #db;
  #nextId;

  constructor(db = createMemoryDatabase()) {
    this.#db = db;
    this.#nextId = nextIdOf(db.rooms);
  }

  // Emulates JOIN buildings
  #withBuilding(room) {
    const building = this.#db.buildings.find((building) => building.id === room.buildingId);
    return { ...room, building: { id: building.id, name: building.name } };
  }

  async findAll() {
    return this.#db.rooms.map((room) => this.#withBuilding(room));
  }

  async findAllByBuildingId(buildingId) {
    return this.#db.rooms
      .filter((room) => room.buildingId === buildingId)
      .map((room) => this.#withBuilding(room));
  }

  async findById(id) {
    const room = this.#db.rooms.find((room) => room.id === id);
    return room ? this.#withBuilding(room) : null;
  }

  // No row locks in memory - runInTransaction runs units of work one at a time instead
  async findByIdForUpdate(id) {
    return this.findById(id);
  }

  async create(data) {
    const duplicate = this.#db.rooms.some(
      (room) => room.buildingId === data.buildingId && room.name === data.name,
    );
    if (duplicate) {
      throw uniqueViolation("rooms_building_id_name_unique");
    }
    const room = { id: this.#nextId++, ...data };
    this.#db.rooms.push(room);
    return this.#withBuilding(room);
  }

  async update(id, data) {
    const room = this.#db.rooms.find((room) => room.id === id);
    if (!room) return null;
    const duplicate = this.#db.rooms.some(
      (other) =>
        other.id !== id &&
        other.buildingId === room.buildingId &&
        data.name !== undefined &&
        other.name === data.name,
    );
    if (duplicate) {
      throw uniqueViolation("rooms_building_id_name_unique");
    }
    if (data.name !== undefined) room.name = data.name;
    if (data.capacity !== undefined) room.capacity = data.capacity;
    return this.#withBuilding(room);
  }

  // Emulates ON DELETE RESTRICT of reservations.room_id
  async delete(id) {
    const index = this.#db.rooms.findIndex((room) => room.id === id);
    if (index === -1) return false;
    if (this.#db.reservations.some((reservation) => reservation.roomId === id)) {
      throw foreignKeyViolation("rooms", "reservations_room_id_foreign");
    }
    this.#db.rooms.splice(index, 1);
    return true;
  }
}

module.exports = RoomsRepository;
