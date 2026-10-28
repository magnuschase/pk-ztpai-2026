const AppError = require("./AppError");

class ConflictError extends AppError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(message, { statusCode: 409, code });
  }
}

module.exports = ConflictError;
