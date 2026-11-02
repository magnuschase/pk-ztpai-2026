const AppError = require("./AppError");

class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(message, { statusCode: 403, code });
  }
}

module.exports = ForbiddenError;
