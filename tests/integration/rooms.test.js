const { bearer, setupIntegrationTests } = require("./helpers/setup");

const { api, db, createUser, createBuilding } = setupIntegrationTests();

describe("POST /api/rooms", () => {
  test("403 FORBIDDEN for a USER, nothing is created", async () => {
    const user = await createUser({ email: "user@example.com" });
    const building = await createBuilding();

    const res = await api
      .post("/api/rooms")
      .set(bearer(user))
      .send({ buildingId: building.id, name: "101", capacity: 20 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await db("rooms").count({ count: "*" })).toEqual([{ count: "0" }]);
  });

  test("201 for an ADMIN with the same body", async () => {
    const admin = await createUser({ email: "admin@example.com", role: "ADMIN" });
    const building = await createBuilding();

    const res = await api
      .post("/api/rooms")
      .set(bearer(admin))
      .send({ buildingId: building.id, name: "101", capacity: 20 });

    expect(res.status).toBe(201);
    expect(await db("rooms").where({ id: res.body.id }).first()).toMatchObject({
      building_id: building.id,
      name: "101",
      capacity: 20,
    });
  });
});
