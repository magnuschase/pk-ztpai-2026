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
const COLUMNS = Object.values(COLUMN_BY_FIELD);

// pg returns timestamptz as Date; the in-memory repository keeps ISO strings
function toIsoString(date) {
  return date ? date.toISOString() : null;
}

function toReservation(row) {
  return {
    id: row.id,
    roomId: row.room_id,
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

  async findAll() {
    const rows = await this.#db(TABLE).select(COLUMNS).orderBy("id");
    return rows.map(toReservation);
  }

  async findAllByRoomId(roomId) {
    const rows = await this.#db(TABLE).select(COLUMNS).where({ room_id: roomId }).orderBy("id");
    return rows.map(toReservation);
  }

  async findById(id) {
    const row = await this.#db(TABLE).select(COLUMNS).where({ id }).first();
    return row ? toReservation(row) : null;
  }

  async create(data) {
    const [row] = await this.#db(TABLE).insert(toRow(data)).returning(COLUMNS);
    return toReservation(row);
  }

  async update(id, patch) {
    const [row] = await this.#db(TABLE).where({ id }).update(toRow(patch)).returning(COLUMNS);
    return row ? toReservation(row) : null;
  }
}

module.exports = ReservationsKnexRepository;
