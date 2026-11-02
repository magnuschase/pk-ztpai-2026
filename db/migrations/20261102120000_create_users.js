/**
 * @param { import("knex").Knex } knex
 */
exports.up = function (knex) {
  return knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    // Stored lowercase (normalized by the API, enforced by users_email_lowercase_check),
    // so the UNIQUE constraint also rejects emails that differ only in letter case
    table.string("email", 254).notNullable().unique({ indexName: "users_email_unique" });
    // bcrypt hash ("$2b$<cost>$<salt><hash>", 60 chars) - the password itself is never stored
    table.string("password_hash", 255).notNullable();
    table
      .string("role", 20)
      .notNullable()
      .defaultTo("USER")
      .checkIn(["USER", "ADMIN"], "users_role_check");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check("?? = lower(??)", ["email", "email"], "users_email_lowercase_check");
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function (knex) {
  return knex.schema.dropTable("users");
};
