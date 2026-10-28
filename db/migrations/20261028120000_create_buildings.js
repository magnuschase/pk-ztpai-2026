/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("buildings", (table) => {
    table.increments("id").primary();
    table.string("name", 100).notNullable().unique({ indexName: "buildings_name_unique" });
    table.string("address", 255).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable("buildings");
};
