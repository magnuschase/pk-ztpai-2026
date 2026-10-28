const { NotFoundError } = require("../errors");

function notFound(req, res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`, "ROUTE_NOT_FOUND"));
}

module.exports = notFound;
