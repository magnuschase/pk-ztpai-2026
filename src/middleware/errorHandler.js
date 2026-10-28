const { AppError } = require("../errors");

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

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
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
