/**
 * Audit log: one row per published event (written by the audit log listener).
 * No foreign keys on purpose - the log outlives the records it mentions, and the
 * payload is a snapshot of the event, whatever happens to those records later.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("audit_log", (table) => {
    table.bigIncrements("id").primary();
    table.string("event_type", 100).notNullable();
    // The event payload as published, e.g. { reservationId, roomId, userId, ... }
    table.jsonb("payload").notNullable();
    // When the event happened (set by the publisher), not when the row was written
    table.timestamp("occurred_at", { useTz: true }).notNullable();

    // GET /api/admin/audit-log: newest first, optionally only one event type
    table.index(["occurred_at", "id"], "audit_log_occurred_at_index");
    table.index(["event_type", "occurred_at", "id"], "audit_log_event_type_occurred_at_index");
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable("audit_log");
};
