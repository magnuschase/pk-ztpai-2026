const { uniqueViolation, foreignKeyViolation } = require("../../errors/postgres");
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

  async update(id, data) {
    const building = this.#db.buildings.find((building) => building.id === id);
    if (!building) return null;
    const duplicate = this.#db.buildings.some(
      (other) => other.id !== id && data.name !== undefined && other.name === data.name,
    );
    if (duplicate) {
      throw uniqueViolation("buildings_name_unique");
    }
    if (data.name !== undefined) building.name = data.name;
    if (data.address !== undefined) building.address = data.address;
    return this.#withRoomsCount(building);
  }

  // Emulates ON DELETE RESTRICT of rooms.building_id
  async delete(id) {
    const index = this.#db.buildings.findIndex((building) => building.id === id);
    if (index === -1) return false;
    if (this.#db.rooms.some((room) => room.buildingId === id)) {
      throw foreignKeyViolation("buildings", "rooms_building_id_foreign");
    }
    this.#db.buildings.splice(index, 1);
    return true;
  }
}

module.exports = BuildingsRepository;
