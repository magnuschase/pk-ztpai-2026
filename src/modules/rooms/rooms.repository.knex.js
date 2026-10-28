const TABLE = "rooms";

function toRoom(row) {
  return {
    id: row.id,
    buildingId: row.building_id,
    name: row.name,
    capacity: row.capacity,
    building: { id: row.building_id, name: row.building_name },
  };
}

class RoomsKnexRepository {
  #db;

  constructor(db) {
    this.#db = db;
  }

  // One query with JOIN instead of fetching the building for every room (N+1)
  #selectWithBuilding() {
    return this.#db({ r: TABLE })
      .join({ b: "buildings" }, "b.id", "r.building_id")
      .select("r.id", "r.building_id", "r.name", "r.capacity", { building_name: "b.name" });
  }

  async findAll() {
    const rows = await this.#selectWithBuilding().orderBy("r.id");
    return rows.map(toRoom);
  }

  async findAllByBuildingId(buildingId) {
    const rows = await this.#selectWithBuilding().where("r.building_id", buildingId).orderBy("r.id");
    return rows.map(toRoom);
  }

  async findById(id) {
    const row = await this.#selectWithBuilding().where("r.id", id).first();
    return row ? toRoom(row) : null;
  }

  async create(data) {
    const [{ id }] = await this.#db(TABLE)
      .insert({
        building_id: data.buildingId,
        name: data.name,
        capacity: data.capacity,
      })
      .returning("id");
    return this.findById(id);
  }
}

module.exports = RoomsKnexRepository;
