const AppError = require("./AppError");

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(message, { statusCode: 401, code });
  }
}

module.exports = UnauthorizedError;
