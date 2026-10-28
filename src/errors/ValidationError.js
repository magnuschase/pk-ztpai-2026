const AppError = require("./AppError");

class ValidationError extends AppError {
  constructor(details, message = "Validation failed") {
    super(message, { statusCode: 400, code: "VALIDATION_ERROR", details });
  }
}

module.exports = ValidationError;
