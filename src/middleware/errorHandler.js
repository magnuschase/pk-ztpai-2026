const { AppError, ConflictError } = require("../errors");
const { PG_UNIQUE_VIOLATION, PG_EXCLUSION_VIOLATION } = require("../errors/postgres");

function toAppError(err) {
  if (err instanceof AppError) return err;

  // Constraint, table and column names stay in the server - the client gets a generic message
  if (err.code === PG_UNIQUE_VIOLATION) {
    return new ConflictError("Resource with the same unique fields already exists", "ALREADY_EXISTS");
  }

  // The only exclusion constraint: overlapping CONFIRMED reservations of one room
  if (err.code === PG_EXCLUSION_VIOLATION) {
    return new ConflictError(
      "Room is already booked for the requested time range",
      "ROOM_ALREADY_BOOKED",
    );
  }

  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const requestId = req.requestId;

  // body-parser (express.json) sets these fields when JSON.parse fails
  if (err.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400 && "body" in err)) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON",
        requestId,
      },
    });
  }

  const appError = toAppError(err);
  if (appError) {
    return res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
        requestId,
      },
    });
  }

  console.error(err);

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId,
    },
  });
}

module.exports = errorHandler;
