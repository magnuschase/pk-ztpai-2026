const { uniqueViolation } = require("../../errors/postgres");
const { createMemoryDatabase, nextIdOf } = require("../../db/memoryDatabase");

class BuildingsRepository {
  #db;
  #nextId;

  constructor(db = createMemoryDatabase()) {
    this.#db = db;
    this.#nextId = nextIdOf(db.buildings);
  }

  // Emulates LEFT JOIN rooms + COUNT
  #withRoomsCount(building) {
    const roomsCount = this.#db.rooms.filter((room) => room.buildingId === building.id).length;
    return { ...building, roomsCount };
  }

  async findAll() {
    return this.#db.buildings.map((building) => this.#withRoomsCount(building));
  }

  async findById(id) {
    const building = this.#db.buildings.find((building) => building.id === id);
    return building ? this.#withRoomsCount(building) : null;
  }

  async create(data) {
    if (this.#db.buildings.some((building) => building.name === data.name)) {
      throw uniqueViolation("buildings_name_unique");
    }
    const building = { id: this.#nextId++, ...data };
    this.#db.buildings.push(building);
    return this.#withRoomsCount(building);
  }
}

module.exports = BuildingsRepository;
