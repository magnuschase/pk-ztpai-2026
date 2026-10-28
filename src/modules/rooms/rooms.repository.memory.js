const { uniqueViolation } = require("../../errors/postgres");
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
}

module.exports = RoomsRepository;
