const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const BCRYPT_COST = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

// reserved_by holds free text "Imię Nazwisko". Each name becomes the account
// imie.nazwisko@example.com - the address that person uses to register, so a user
// who already has an account keeps their reservations instead of getting a second one.
//   "Piotr Wiśniewski" -> "piotr.wisniewski@example.com"
//   "JAN KOWALSKI"     -> "jan.kowalski@example.com" (same account as "Jan Kowalski")
// A name that already is an email (e.g. after `down`) is kept as is.
function emailForName(name) {
  const trimmed = name.trim();
  if (EMAIL_PATTERN.test(trimmed)) return trimmed.toLowerCase();

  const localPart = trimmed
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining accents: ś -> s, ó -> o
    .replace(/ł/g, "l") // ł does not decompose in NFD
    .replace(/Ł/g, "L")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  // A name without any latin letters or digits still needs a stable, unique address
  const fallback = `user.${crypto.createHash("sha256").update(trimmed).digest("hex").slice(0, 8)}`;
  return `${localPart || fallback}@example.com`;
}

/**
 * reservations.reserved_by (free text) -> reservations.user_id (FK to users).
 * Works on a table with data: every existing reservation gets an owner before
 * user_id becomes NOT NULL. Knex runs the whole migration in one transaction.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  // 1. Nullable for now - existing rows get their value in step 2
  await knex.schema.alterTable("reservations", (table) => {
    // RESTRICT: a user with reservations cannot be deleted - like rooms, reservations
    // are a business record and must not disappear with the account
    table.integer("user_id").nullable().references("id").inTable("users").onDelete("RESTRICT");
  });

  // 2. One account per distinct name, existing accounts are reused
  const names = await knex("reservations").distinct("reserved_by").pluck("reserved_by");
  // These people never chose a password - the hash of a random, discarded secret means
  // nobody can log into the created accounts until a password is set for them
  let lockedPasswordHash;

  for (const name of names) {
    const email = emailForName(name);
    let user = await knex("users").where({ email }).first("id");
    if (!user) {
      lockedPasswordHash ??= await bcrypt.hash(crypto.randomBytes(32).toString("hex"), BCRYPT_COST);
      [user] = await knex("users")
        .insert({ email, password_hash: lockedPasswordHash, role: "USER" })
        .returning("id");
    }
    await knex("reservations").where({ reserved_by: name }).update({ user_id: user.id });
  }

  // 3. Every reservation has an owner now
  await knex.schema.alterTable("reservations", (table) => {
    table.dropNullable("user_id");
    table.dropColumn("reserved_by");
    // "My reservations" (WHERE user_id = ?) and FK checks when a user is deleted
    table.index(["user_id"], "reservations_user_id_index");
  });
};

/**
 * The original name text is not stored anywhere after `up` - reserved_by gets the
 * owner's email instead. Accounts created by `up` stay in users.
 *
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("reservations", (table) => {
    table.string("reserved_by", 100).nullable();
  });

  await knex.raw(`
    UPDATE reservations AS r
    SET reserved_by = left(u.email, 100)
    FROM users AS u
    WHERE u.id = r.user_id
  `);

  await knex.schema.alterTable("reservations", (table) => {
    table.dropNullable("reserved_by");
    // Drops the FK constraint and the index together with the column
    table.dropColumn("user_id");
  });
};
