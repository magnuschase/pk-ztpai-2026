const TABLE = "buildings";
const COLUMNS = ["id", "name", "address"];

function toBuilding(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
  };
}

class BuildingsKnexRepository {
  #db;

  constructor(db) {
    this.#db = db;
  }

  async findAll() {
    const rows = await this.#db(TABLE).select(COLUMNS).orderBy("id");
    return rows.map(toBuilding);
  }

  async findById(id) {
    const row = await this.#db(TABLE).select(COLUMNS).where({ id }).first();
    return row ? toBuilding(row) : null;
  }

  async create(data) {
    const [row] = await this.#db(TABLE)
      .insert({ name: data.name, address: data.address })
      .returning(COLUMNS);
    return toBuilding(row);
  }
}

module.exports = BuildingsKnexRepository;
