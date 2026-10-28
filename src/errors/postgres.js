// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = "23505";

// Error shaped like the one thrown by `pg`. In-memory repositories use it to
// emulate UNIQUE constraints, so both implementations share the error handling.
function uniqueViolation(constraint) {
  const err = new Error(`duplicate key value violates unique constraint "${constraint}"`);
  err.code = PG_UNIQUE_VIOLATION;
  err.constraint = constraint;
  return err;
}

module.exports = { PG_UNIQUE_VIOLATION, uniqueViolation };
