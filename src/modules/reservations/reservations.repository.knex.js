const TABLE = "reservations";

// Domain field (camelCase) -> column (snake_case)
const COLUMN_BY_FIELD = {
  id: "id",
  roomId: "room_id",
  reservedBy: "reserved_by",
  participants: "participants",
  startTime: "start_time",
  endTime: "end_time",
  status: "status",
  createdAt: "created_at",
  cancelledAt: "cancelled_at",
};

const SELECT_COLUMNS = [
  ...Object.values(COLUMN_BY_FIELD).map((column) => `res.${column}`),
  { room_name: "r.name", building_id: "r.building_id", building_name: "b.name" },
];

// pg returns timestamptz as Date; the in-memory repository keeps ISO strings
function toIsoString(date) {
  return date ? date.toISOString() : null;
}

function toReservation(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    room: {
      id: row.room_id,
      name: row.room_name,
      building: { id: row.building_id, name: row.building_name },
    },
    reservedBy: row.reserved_by,
    participants: row.participants,
    startTime: toIsoString(row.start_time),
    endTime: toIsoString(row.end_time),
    status: row.status,
    createdAt: toIsoString(row.created_at),
    cancelledAt: toIsoString(row.cancelled_at),
  };
}

// Fields without a column (e.g. internalNote set by the service) are not persisted
function toRow(data) {
  const row = {};
  for (const [field, column] of Object.entries(COLUMN_BY_FIELD)) {
    if (data[field] !== undefined) row[column] = data[field];
  }
  return row;
}

class ReservationsKnexRepository {
  #db;

  constructor(db) {
    this.#db = db;
  }

  // Reservation + room + building in one query, no matter how many rows (no N+1)
  #selectWithRoom() {
    return this.#db({ res: TABLE })
      .join({ r: "rooms" }, "r.id", "res.room_id")
      .join({ b: "buildings" }, "b.id", "r.building_id")
      .select(SELECT_COLUMNS);
  }

  async findAll() {
    const rows = await this.#selectWithRoom().orderBy("res.id");
    return rows.map(toReservation);
  }

  async findAllByRoomId(roomId) {
    const rows = await this.#selectWithRoom().where("res.room_id", roomId).orderBy("res.id");
    return rows.map(toReservation);
  }

  async findById(id) {
    const row = await this.#selectWithRoom().where("res.id", id).first();
    return row ? toReservation(row) : null;
  }

  async create(data) {
    const [{ id }] = await this.#db(TABLE).insert(toRow(data)).returning("id");
    return this.findById(id);
  }

  async update(id, patch) {
    const [row] = await this.#db(TABLE).where({ id }).update(toRow(patch)).returning("id");
    return row ? this.findById(row.id) : null;
  }
}

module.exports = ReservationsKnexRepository;
