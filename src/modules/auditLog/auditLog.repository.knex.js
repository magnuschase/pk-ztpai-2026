const TABLE = "audit_log";

function toEntry(row) {
  return {
    // bigint - pg returns it as a string
    id: Number(row.id),
    eventType: row.event_type,
    payload: row.payload,
    occurredAt: row.occurred_at.toISOString(),
  };
}

function applyFilters(query, { eventType }) {
  if (eventType !== undefined) query.where("event_type", eventType);
}

class AuditLogKnexRepository {
  #db;

  constructor(db) {
    this.#db = db;
  }

  async create({ eventType, payload, occurredAt }) {
    const [row] = await this.#db(TABLE)
      .insert({ event_type: eventType, payload: JSON.stringify(payload), occurred_at: occurredAt })
      .returning("*");
    return toEntry(row);
  }

  // Newest first; id breaks ties between events from the same moment
  async findPage({ filters, limit, offset }) {
    const [rows, [{ total }]] = await Promise.all([
      this.#db(TABLE)
        .modify(applyFilters, filters)
        .orderBy([
          { column: "occurred_at", order: "desc" },
          { column: "id", order: "desc" },
        ])
        .limit(limit)
        .offset(offset),
      this.#db(TABLE).modify(applyFilters, filters).count({ total: "*" }),
    ]);
    return { items: rows.map(toEntry), total: Number(total) };
  }
}

module.exports = AuditLogKnexRepository;
