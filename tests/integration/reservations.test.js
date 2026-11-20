const { tomorrow, bearer, setupIntegrationTests } = require("./helpers/setup");

const { api, db, createUser, createRoom, createReservation } = setupIntegrationTests();

describe("POST /api/reservations", () => {
  test("201 with a Location header, and the reservation is stored in the database", async () => {
    const owner = await createUser({ email: "owner@example.com" });
    const room = await createRoom({ capacity: 10 });
    const body = {
      roomId: room.id,
      participants: 4,
      startTime: tomorrow("10:00"),
      endTime: tomorrow("12:00"),
    };

    const res = await api.post("/api/reservations").set(bearer(owner)).send(body);

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);
    expect(res.body).toMatchObject({
      room: { id: room.id },
      user: { id: owner.id, email: owner.email },
      participants: 4,
      startTime: body.startTime,
      endTime: body.endTime,
      status: "CONFIRMED",
      cancelledAt: null,
    });

    const row = await db("reservations").where({ id: res.body.id }).first();
    expect(row).toMatchObject({
      room_id: room.id,
      user_id: owner.id,
      participants: 4,
      status: "CONFIRMED",
      cancelled_at: null,
    });
    expect(row.start_time.toISOString()).toBe(body.startTime);
    expect(row.end_time.toISOString()).toBe(body.endTime);
  });

  test("400 VALIDATION_ERROR with details for every invalid field", async () => {
    const owner = await createUser({ email: "owner@example.com" });
    const room = await createRoom();

    const res = await api
      .post("/api/reservations")
      .set(bearer(owner))
      .send({
        roomId: String(room.id), // a string, not a number
        participants: 0,
        startTime: "2026-12-08T10:00:00", // no timezone
        endTime: tomorrow("12:00"),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toHaveLength(3);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ location: "body", field: "roomId" }),
        expect.objectContaining({ location: "body", field: "participants" }),
        expect.objectContaining({ location: "body", field: "startTime" }),
      ]),
    );
    expect(await db("reservations").count({ count: "*" })).toEqual([{ count: "0" }]);
  });

  test("409 ROOM_ALREADY_BOOKED for a range overlapping a CONFIRMED reservation", async () => {
    const owner = await createUser({ email: "owner@example.com" });
    const other = await createUser({ email: "other@example.com" });
    const room = await createRoom();
    await createReservation({
      room,
      user: owner,
      startTime: tomorrow("10:00"),
      endTime: tomorrow("12:00"),
    });

    const res = await api
      .post("/api/reservations")
      .set(bearer(other))
      .send({
        roomId: room.id,
        participants: 2,
        startTime: tomorrow("11:00"),
        endTime: tomorrow("13:00"),
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
    expect(await db("reservations").count({ count: "*" })).toEqual([{ count: "1" }]);
  });
});

describe("GET /api/reservations", () => {
  test("401 MISSING_TOKEN without a token", async () => {
    const res = await api.get("/api/reservations");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("MISSING_TOKEN");
  });

  test("pagination: limit below the number of records gives one page and the full total", async () => {
    const owner = await createUser({ email: "owner@example.com" });
    const other = await createUser({ email: "other@example.com" });
    const room = await createRoom();
    for (const [start, end] of [
      ["08:00", "09:00"],
      ["09:00", "10:00"],
      ["10:00", "11:00"],
    ]) {
      await createReservation({ room, user: owner, startTime: tomorrow(start), endTime: tomorrow(end) });
    }
    // Not the owner's - a USER sees only their own reservations, so it is not counted
    await createReservation({ room, user: other, startTime: tomorrow("12:00"), endTime: tomorrow("13:00") });

    const firstPage = await api.get("/api/reservations?limit=2").set(bearer(owner));
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const lastPage = await api.get("/api/reservations?limit=2&page=2").set(bearer(owner));
    expect(lastPage.body.data).toHaveLength(1);
    expect(lastPage.body.meta).toMatchObject({ page: 2, total: 3 });
  });
});

describe("GET /api/reservations/:id", () => {
  test("404 RESERVATION_NOT_FOUND for another USER's reservation", async () => {
    const owner = await createUser({ email: "owner@example.com" });
    const other = await createUser({ email: "other@example.com" });
    const room = await createRoom();
    const reservation = await createReservation({
      room,
      user: owner,
      startTime: tomorrow("10:00"),
      endTime: tomorrow("12:00"),
    });

    const res = await api.get(`/api/reservations/${reservation.id}`).set(bearer(other));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("RESERVATION_NOT_FOUND");

    // The reservation exists - its owner gets it
    const ownRes = await api.get(`/api/reservations/${reservation.id}`).set(bearer(owner));
    expect(ownRes.status).toBe(200);
  });
});
