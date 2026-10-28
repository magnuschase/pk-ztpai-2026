const AppError = require("./AppError");

class NotFoundError extends AppError {
  constructor(message = "Resource not found", code = "NOT_FOUND") {
    super(message, { statusCode: 404, code });
  }
}

module.exports = NotFoundError;
