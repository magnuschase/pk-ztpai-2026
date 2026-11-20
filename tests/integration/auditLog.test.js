const { NOW, tomorrow, bearer, setupIntegrationTests } = require("./helpers/setup");

const { api, db, eventBus, createUser, createRoom } = setupIntegrationTests();

// The scenario from the assignment: create -> failed collision -> ADMIN cancels ->
// ADMIN cancels again. Returns the users, the room and the created reservation.
async function runScenario() {
  const owner = await createUser({ email: "owner@example.com" });
  const other = await createUser({ email: "other@example.com" });
  const admin = await createUser({ email: "admin@example.com", role: "ADMIN" });
  const room = await createRoom();

  const created = await api
    .post("/api/reservations")
    .set(bearer(owner))
    .send({ roomId: room.id, participants: 2, startTime: tomorrow("10:00"), endTime: tomorrow("12:00") });
  expect(created.status).toBe(201);

  const collision = await api
    .post("/api/reservations")
    .set(bearer(other))
    .send({ roomId: room.id, participants: 2, startTime: tomorrow("11:00"), endTime: tomorrow("13:00") });
  expect(collision.status).toBe(409);

  const cancelled = await api.patch(`/api/reservations/${created.body.id}/cancel`).set(bearer(admin));
  expect(cancelled.status).toBe(200);
  const cancelledAgain = await api.patch(`/api/reservations/${created.body.id}/cancel`).set(bearer(admin));
  expect(cancelledAgain.status).toBe(200);

  await eventBus.drain();
  return { owner, admin, room, reservationId: created.body.id };
}

describe("audit log", () => {
  test("the scenario stores exactly two events - no 409, no repeated cancel", async () => {
    const { owner, admin, room, reservationId } = await runScenario();

    const rows = await db("audit_log").orderBy("id");
    expect(rows).toEqual([
      {
        id: "1",
        event_type: "reservation.created",
        payload: {
          reservationId,
          roomId: room.id,
          userId: owner.id,
          startTime: tomorrow("10:00"),
          endTime: tomorrow("12:00"),
        },
        occurred_at: NOW,
      },
      {
        id: "2",
        event_type: "reservation.cancelled",
        payload: { reservationId, roomId: room.id, userId: owner.id, cancelledBy: admin.id },
        occurred_at: NOW,
      },
    ]);

    // The owner is notified, because an ADMIN cancelled their reservation
    expect(console.log).toHaveBeenCalledWith(
      expect.stringMatching(/^\[notification\] to: owner@example\.com /),
    );
  });

  test("GET /api/admin/audit-log - newest first, filter and pagination", async () => {
    const { admin } = await runScenario();

    const all = await api.get("/api/admin/audit-log").set(bearer(admin));
    expect(all.status).toBe(200);
    expect(all.body.data.map((entry) => entry.eventType)).toEqual([
      "reservation.cancelled",
      "reservation.created",
    ]);
    expect(all.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });

    const created = await api
      .get("/api/admin/audit-log?eventType=reservation.created&limit=1")
      .set(bearer(admin));
    expect(created.status).toBe(200);
    expect(created.body.data).toHaveLength(1);
    expect(created.body.data[0]).toMatchObject({ eventType: "reservation.created" });
    expect(created.body.meta).toEqual({ page: 1, limit: 1, total: 1, totalPages: 1 });
  });

  test("GET /api/admin/audit-log is 403 FORBIDDEN for a USER", async () => {
    const user = await createUser({ email: "user@example.com" });

    const res = await api.get("/api/admin/audit-log").set(bearer(user));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("GET /api/admin/audit-log rejects an unknown eventType with 400", async () => {
    const admin = await createUser({ email: "admin@example.com", role: "ADMIN" });

    const res = await api.get("/api/admin/audit-log?eventType=room.deleted").set(bearer(admin));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: [{ location: "query", field: "eventType" }],
    });
  });
});
