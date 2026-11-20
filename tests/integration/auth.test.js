const { setupIntegrationTests } = require("./helpers/setup");

const { api, db } = setupIntegrationTests();

describe("auth", () => {
  test("register, login and GET /api/auth/me return the same account", async () => {
    const credentials = { email: "new.user@example.com", password: "correct-horse-battery" };

    const registered = await api.post("/api/auth/register").send(credentials);
    expect(registered.status).toBe(201);
    expect(registered.body).toEqual({
      id: expect.any(Number),
      email: credentials.email,
      role: "USER",
      createdAt: expect.any(String),
    });

    // Stored as a bcrypt hash, never as the password itself
    const row = await db("users").where({ id: registered.body.id }).first();
    expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/);

    const login = await api.post("/api/auth/login").send(credentials);
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ accessToken: expect.any(String), tokenType: "Bearer" });

    const me = await api
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual(registered.body);
  });

  test("GET /api/auth/me without a token is 401 MISSING_TOKEN", async () => {
    const res = await api.get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("MISSING_TOKEN");
  });
});
