const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../../errors");

const ALGORITHM = "HS256";

// secret and expiresIn come from src/config, which validates them at startup
// (length of the secret, unit in expiresIn)
function createTokenService({ secret, expiresIn }) {
  // The payload is only base64url-encoded - anyone holding the token can read it, so it
  // carries just what authorization needs: no email, password hash or other personal data.
  // jsonwebtoken adds iat (and exp from expiresIn) on its own.
  function signAccessToken(user) {
    return jwt.sign({ role: user.role }, secret, {
      algorithm: ALGORITHM,
      subject: String(user.id),
      expiresIn,
    });
  }

  // algorithms is pinned: a token with "alg": "none" or any other algorithm is rejected,
  // whatever its header claims
  function verifyAccessToken(token) {
    let payload;
    try {
      payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token expired", "TOKEN_EXPIRED");
      }
      // Bad signature, modified payload, malformed token, wrong algorithm
      if (err instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError("Invalid token", "INVALID_TOKEN");
      }
      throw err;
    }

    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0 || typeof payload.role !== "string") {
      throw new UnauthorizedError("Invalid token", "INVALID_TOKEN");
    }
    return { id, role: payload.role };
  }

  return { signAccessToken, verifyAccessToken, expiresIn };
}

module.exports = createTokenService;
