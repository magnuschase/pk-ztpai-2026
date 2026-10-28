/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("reservations", (table) => {
    table.increments("id").primary();
    // RESTRICT: reservations are a business record (who booked what and when).
    // Deleting a room must not wipe them out - future bookings have to be
    // cancelled / moved first, and history stays intact.
    table
      .integer("room_id")
      .notNullable()
      .references("id")
      .inTable("rooms")
      .onDelete("RESTRICT");
    table.string("reserved_by", 100).notNullable();
    table.integer("participants").notNullable().checkPositive("reservations_participants_check");
    table.timestamp("start_time", { useTz: true }).notNullable();
    table.timestamp("end_time", { useTz: true }).notNullable();
    table
      .string("status", 20)
      .notNullable()
      .defaultTo("CONFIRMED")
      .checkIn(["CONFIRMED", "CANCELLED"], "reservations_status_check");
    table.timestamp("cancelled_at", { useTz: true }).nullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check("?? > ??", ["end_time", "start_time"], "reservations_time_range_check");
    // cancelled_at is filled exactly when the reservation is cancelled
    table.check(
      "(?? = 'CANCELLED') = (?? IS NOT NULL)",
      ["status", "cancelled_at"],
      "reservations_cancelled_at_check",
    );

    // Collision check: WHERE room_id = ? AND start_time < :end AND end_time > :start.
    // room_id as the leading column also serves the FK (Postgres does not index FKs).
    table.index(["room_id", "start_time", "end_time"], "reservations_room_id_time_index");
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable("reservations");
};
