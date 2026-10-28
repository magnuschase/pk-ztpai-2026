// PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_UNIQUE_VIOLATION = "23505";
const PG_EXCLUSION_VIOLATION = "23P01";
const PG_DEADLOCK_DETECTED = "40P01";

// Errors shaped like the ones thrown by `pg`. In-memory repositories use them to
// emulate database constraints, so both implementations share the error handling.
function pgError(code, message, constraint) {
  const err = new Error(message);
  err.code = code;
  err.constraint = constraint;
  return err;
}

function uniqueViolation(constraint) {
  return pgError(
    PG_UNIQUE_VIOLATION,
    `duplicate key value violates unique constraint "${constraint}"`,
    constraint,
  );
}

function exclusionViolation(constraint) {
  return pgError(
    PG_EXCLUSION_VIOLATION,
    `conflicting key value violates exclusion constraint "${constraint}"`,
    constraint,
  );
}

module.exports = {
  PG_UNIQUE_VIOLATION,
  PG_EXCLUSION_VIOLATION,
  PG_DEADLOCK_DETECTED,
  uniqueViolation,
  exclusionViolation,
};
