/**
 * Last line of defence against double booking: two CONFIRMED reservations of
 * the same room cannot overlap, no matter what the application does.
 * Fails if the table already contains overlapping CONFIRMED reservations.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // btree_gist lets a GiST index handle plain "=" on room_id next to the range "&&"
  await knex.raw("CREATE EXTENSION IF NOT EXISTS btree_gist");
  // '[)' - end is exclusive, so 10:00-12:00 and 12:00-13:00 do not overlap.
  // WHERE - cancelled reservations do not block the room.
  await knex.raw(`
    ALTER TABLE reservations
    ADD CONSTRAINT reservations_no_overlap
    EXCLUDE USING gist (
      room_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    )
    WHERE (status = 'CONFIRMED')
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw("ALTER TABLE reservations DROP CONSTRAINT reservations_no_overlap");
  await knex.raw("DROP EXTENSION IF EXISTS btree_gist");
};
