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

// Sort whitelist: API field -> column. User input never reaches ORDER BY directly.
const SORT_COLUMNS = {
  startTime: "res.start_time",
  createdAt: "res.created_at",
  participants: "res.participants",
};

// Expects the query to have "res" (reservations) and "r" (rooms) in FROM
function applyFilters(query, { roomId, buildingId, status, from, to }) {
  if (roomId !== undefined) query.where("res.room_id", roomId);
  if (buildingId !== undefined) query.where("r.building_id", buildingId);
  if (status !== undefined) query.where("res.status", status);
  // Overlaps [from, to): start < to AND end > from - touching ranges do not overlap
  if (to !== undefined) query.where("res.start_time", "<", to);
  if (from !== undefined) query.where("res.end_time", ">", from);
}

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

  // Filtering, sorting and paging happen in SQL. Rows and total are separate queries,
  // so total is known even for a page past the end (no rows to read it from).
  async findPage({ filters, sort, limit, offset }) {
    const sortColumn = SORT_COLUMNS[sort.field];
    if (!sortColumn) {
      throw new Error(`Unsupported sort field: ${sort.field}`);
    }

    const [rows, [{ total }]] = await Promise.all([
      this.#selectWithRoom()
        .modify(applyFilters, filters)
        .orderBy([
          { column: sortColumn, order: sort.direction },
          // Tie-breaker: rows with equal sort values keep a stable order across pages
          { column: "res.id", order: sort.direction },
        ])
        .limit(limit)
        .offset(offset),
      this.#db({ res: TABLE })
        .join({ r: "rooms" }, "r.id", "res.room_id")
        .modify(applyFilters, filters)
        .count({ total: "*" }),
    ]);

    return { items: rows.map(toReservation), total: Number(total) };
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
