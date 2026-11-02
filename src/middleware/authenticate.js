const { UnauthorizedError } = require("../errors");

// "Bearer <token>" - the scheme name is case-insensitive (RFC 7235)
const BEARER_PATTERN = /^Bearer +(\S+)$/i;

function createAuthenticate({ tokenService }) {
  return function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header) {
      return next(new UnauthorizedError("Missing Authorization header", "MISSING_TOKEN"));
    }

    const match = BEARER_PATTERN.exec(header);
    if (!match) {
      return next(
        new UnauthorizedError(
          "Authorization header must have the format: Bearer <token>",
          "INVALID_AUTH_HEADER",
        ),
      );
    }

    // Throws UnauthorizedError (TOKEN_EXPIRED / INVALID_TOKEN) - Express passes it to errorHandler
    req.user = tokenService.verifyAccessToken(match[1]);
    next();
  };
}

module.exports = createAuthenticate;
