const { ConflictError, UnauthorizedError } = require("../../errors");
const { PG_UNIQUE_VIOLATION } = require("../../errors/postgres");
const { ROLES } = require("../users/users.roles");
const { hashPassword, verifyPassword } = require("./password");

function createAuthService({ usersRepository, tokenService }) {
  // No "is this email free?" SELECT before the INSERT - two parallel registrations
  // would both pass it. The UNIQUE constraint decides, the loser gets 23505 -> 409.
  async function register({ email, password }) {
    const passwordHash = await hashPassword(password);

    try {
      // Role is never taken from the input - ADMIN accounts come only from the seed
      return await usersRepository.create({ email, passwordHash, role: ROLES.USER });
    } catch (err) {
      if (err.code === PG_UNIQUE_VIOLATION && err.constraint === "users_email_unique") {
        throw new ConflictError("Email is already taken", "EMAIL_TAKEN");
      }
      throw err;
    }
  }

  // Unknown email and wrong password end in the same error (code and message),
  // so the response does not reveal whether an account exists
  async function login({ email, password }) {
    const user = await usersRepository.findByEmailWithPasswordHash(email);
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? null);
    if (!user || !passwordMatches) {
      throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    return {
      accessToken: tokenService.signAccessToken(user),
      tokenType: "Bearer",
      expiresIn: tokenService.expiresIn,
    };
  }

  // Read from the database, not from the token - the token carries only id and role
  async function getCurrentUser(currentUser) {
    const user = await usersRepository.findById(currentUser.id);
    if (!user) {
      // Valid signature, but the account behind it no longer exists
      throw new UnauthorizedError("Invalid token", "INVALID_TOKEN");
    }
    return user;
  }

  return { register, login, getCurrentUser };
}

module.exports = createAuthService;
