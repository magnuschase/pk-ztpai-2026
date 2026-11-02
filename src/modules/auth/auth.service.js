const { ConflictError } = require("../../errors");
const { PG_UNIQUE_VIOLATION } = require("../../errors/postgres");
const { hashPassword } = require("./password");

function createAuthService({ usersRepository }) {
  // No "is this email free?" SELECT before the INSERT - two parallel registrations
  // would both pass it. The UNIQUE constraint decides, the loser gets 23505 -> 409.
  async function register({ email, password }) {
    const passwordHash = await hashPassword(password);

    try {
      // Role is never taken from the input - ADMIN accounts come only from the seed
      return await usersRepository.create({ email, passwordHash, role: "USER" });
    } catch (err) {
      if (err.code === PG_UNIQUE_VIOLATION && err.constraint === "users_email_unique") {
        throw new ConflictError("Email is already taken", "EMAIL_TAKEN");
      }
      throw err;
    }
  }

  return { register };
}

module.exports = createAuthService;
