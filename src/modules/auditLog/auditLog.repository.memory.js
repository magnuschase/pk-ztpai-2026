const { createMemoryDatabase, nextIdOf } = require("../../db/memoryDatabase");

class AuditLogRepository {
  #db;
  #nextId;

  constructor(db = createMemoryDatabase()) {
    this.#db = db;
    this.#nextId = nextIdOf(db.auditLog);
  }

  async create({ eventType, payload, occurredAt }) {
    // A copy, like a jsonb column: later changes of the object do not reach the log
    const entry = { id: this.#nextId++, eventType, payload: structuredClone(payload), occurredAt };
    this.#db.auditLog.push(entry);
    return structuredClone(entry);
  }

  async findPage({ filters, limit, offset }) {
    const matching = this.#db.auditLog
      .filter((entry) => filters.eventType === undefined || entry.eventType === filters.eventType)
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.id - a.id);
    return {
      items: matching.slice(offset, offset + limit).map((entry) => structuredClone(entry)),
      total: matching.length,
    };
  }
}

module.exports = AuditLogRepository;
