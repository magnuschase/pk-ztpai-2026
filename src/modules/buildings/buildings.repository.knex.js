const TABLE = "buildings";

function toBuilding(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    // pg returns COUNT (bigint) as a string
    roomsCount: Number(row.rooms_count),
  };
}

class BuildingsKnexRepository {
  #db;

  constructor(db) {
    this.#db = db;
  }

  // LEFT JOIN keeps buildings without rooms (COUNT(r.id) = 0) - INNER JOIN would drop them.
  // GROUP BY b.id is enough, b.name / b.address depend on the primary key.
  #selectWithRoomsCount() {
    return this.#db({ b: TABLE })
      .leftJoin({ r: "rooms" }, "r.building_id", "b.id")
      .select("b.id", "b.name", "b.address")
      .count({ rooms_count: "r.id" })
      .groupBy("b.id");
  }

  async findAll() {
    const rows = await this.#selectWithRoomsCount().orderBy("b.id");
    return rows.map(toBuilding);
  }

  async findById(id) {
    const row = await this.#selectWithRoomsCount().where("b.id", id).first();
    return row ? toBuilding(row) : null;
  }

  async create(data) {
    const [row] = await this.#db(TABLE)
      .insert({ name: data.name, address: data.address })
      .returning(["id", "name", "address"]);
    return toBuilding({ ...row, rooms_count: 0 });
  }
}

module.exports = BuildingsKnexRepository;
