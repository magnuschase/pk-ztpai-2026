const TABLE = "users";

// password_hash is left out on purpose - it is not needed outside the login flow
const PUBLIC_COLUMNS = ["id", "email", "role", "created_at"];

function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    // pg returns timestamptz as Date; the in-memory repository keeps ISO strings
    createdAt: row.created_at.toISOString(),
  };
}

class UsersKnexRepository {
  #db;

  constructor(db) {
    this.#db = db;
  }

  // A taken email fails with 23505 on users_email_unique
  async create(data) {
    const [row] = await this.#db(TABLE)
      .insert({ email: data.email, password_hash: data.passwordHash, role: data.role })
      .returning(PUBLIC_COLUMNS);
    return toUser(row);
  }
}

module.exports = UsersKnexRepository;
