const { ForbiddenError, UnauthorizedError } = require("../errors");
const { ROLES } = require("../modules/users/users.roles");

// Usage: router.post("/", authorize(ROLES.ADMIN), ...). Runs after authenticate,
// which sets req.user = { id, role } from the token.
function authorize(...allowedRoles) {
  // A typo (e.g. ROLES.ADMNI -> undefined) would lock everyone out - fail at startup instead
  const knownRoles = Object.values(ROLES);
  if (allowedRoles.length === 0 || !allowedRoles.every((role) => knownRoles.includes(role))) {
    throw new Error(
      `authorize() needs known roles, got: ${allowedRoles.map(String).join(", ") || "none"}`,
    );
  }

  return function authorizeRole(req, res, next) {
    // No req.user means authenticate did not run for this route - deny, do not guess
    if (!req.user) {
      return next(new UnauthorizedError("Missing Authorization header", "MISSING_TOKEN"));
    }
    // 401 = we do not know who you are, 403 = we know, and you are not allowed
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError("You do not have permission to perform this action"));
    }
    next();
  };
}

module.exports = authorize;
