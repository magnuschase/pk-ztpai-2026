/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("rooms", (table) => {
    table.increments("id").primary();
    // RESTRICT: a building that still has rooms cannot be deleted - its rooms
    // (and their reservations) would otherwise disappear silently.
    table
      .integer("building_id")
      .notNullable()
      .references("id")
      .inTable("buildings")
      .onDelete("RESTRICT");
    table.string("name", 50).notNullable();
    table.integer("capacity").notNullable().checkPositive("rooms_capacity_check");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // The same room name may exist in different buildings, but not twice in one.
    // The index also covers lookups by building_id (FK checks, rooms of a building).
    table.unique(["building_id", "name"], { indexName: "rooms_building_id_name_unique" });
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable("rooms");
};
