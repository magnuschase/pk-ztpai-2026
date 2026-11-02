const { uniqueViolation } = require("../../errors/postgres");
const { createMemoryDatabase, nextIdOf } = require("../../db/memoryDatabase");

// Same shape as UsersKnexRepository returns - without passwordHash
function toUser(user) {
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };
}

class UsersRepository {
  #db;
  #nextId;

  constructor(db = createMemoryDatabase()) {
    this.#db = db;
    this.#nextId = nextIdOf(db.users);
  }

  async findById(id) {
    const user = this.#db.users.find((user) => user.id === id);
    return user ? toUser(user) : null;
  }

  async findByEmailWithPasswordHash(email) {
    const user = this.#db.users.find((user) => user.email === email);
    return user ? { ...toUser(user), passwordHash: user.passwordHash } : null;
  }

  async create(data) {
    if (this.#db.users.some((user) => user.email === data.email)) {
      throw uniqueViolation("users_email_unique");
    }
    const user = { id: this.#nextId++, ...data, createdAt: new Date().toISOString() };
    this.#db.users.push(user);
    return toUser(user);
  }
}

module.exports = UsersRepository;
