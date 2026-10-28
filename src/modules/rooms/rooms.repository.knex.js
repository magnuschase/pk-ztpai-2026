const TABLE = "rooms";
const COLUMNS = ["id", "building_id", "name", "capacity"];

function toRoom(row) {
  return {
    id: row.id,
    buildingId: row.building_id,
    name: row.name,
    capacity: row.capacity,
  };
}

class RoomsKnexRepository {
  #db;

  constructor(db) {
    this.#db = db;
  }

  async findAll() {
    const rows = await this.#db(TABLE).select(COLUMNS).orderBy("id");
    return rows.map(toRoom);
  }

  async findById(id) {
    const row = await this.#db(TABLE).select(COLUMNS).where({ id }).first();
    return row ? toRoom(row) : null;
  }

  async create(data) {
    const [row] = await this.#db(TABLE)
      .insert({
        building_id: data.buildingId,
        name: data.name,
        capacity: data.capacity,
      })
      .returning(COLUMNS);
    return toRoom(row);
  }
}

module.exports = RoomsKnexRepository;
