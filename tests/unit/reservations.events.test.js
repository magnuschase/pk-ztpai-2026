const {
  USERS,
  ROOM,
  today,
  tomorrow,
  createReservationsTestContext,
} = require("./helpers/reservationsTestContext");

// Already stored: CONFIRMED, ROOM, tomorrow 10:00-12:00, owned by USERS.owner (id 1)
const existingReservation = (overrides = {}) => ({
  roomId: ROOM.id,
  userId: USERS.owner.id,
  startTime: tomorrow("10:00"),
  endTime: tomorrow("12:00"),
  ...overrides,
});

const newBooking = (overrides = {}) => ({
  roomId: ROOM.id,
  participants: 2,
  startTime: tomorrow("14:00"),
  endTime: tomorrow("15:00"),
  ...overrides,
});

describe("createReservation - events", () => {
  test("publishes reservation.created with the stored reservation", async () => {
    const { service, eventBus } = createReservationsTestContext();

    const created = await service.createReservation(newBooking(), USERS.owner);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.created", {
      reservationId: created.id,
      roomId: ROOM.id,
      userId: USERS.owner.id,
      startTime: tomorrow("14:00"),
      endTime: tomorrow("15:00"),
    });
  });

  test.each([
    ["ROOM_ALREADY_BOOKED", { startTime: tomorrow("11:00"), endTime: tomorrow("13:00") }],
    ["ROOM_CAPACITY_EXCEEDED", { participants: ROOM.capacity + 1 }],
    ["VALIDATION_ERROR", { endTime: tomorrow("14:10") }],
    ["ROOM_NOT_FOUND", { roomId: 999 }],
  ])("publishes nothing when booking fails with %s", async (code, overrides) => {
    const { service, eventBus } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    await expect(
      service.createReservation(newBooking(overrides), USERS.other),
    ).rejects.toMatchObject({ code });
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test("publishes only after the transaction has committed", async () => {
    const steps = [];
    const { service, eventBus } = createReservationsTestContext({
      wrapTransaction: (runInTransaction) => async (work) => {
        const result = await runInTransaction(work);
        steps.push("commit");
        return result;
      },
    });
    eventBus.publish.mockImplementation((type) => steps.push(`publish ${type}`));

    await service.createReservation(newBooking(), USERS.owner);

    expect(steps).toEqual(["commit", "publish reservation.created"]);
  });

  test("publishes nothing when the commit fails", async () => {
    const { service, eventBus } = createReservationsTestContext({
      wrapTransaction: (runInTransaction) => async (work) => {
        await runInTransaction(work);
        throw new Error("commit failed");
      },
    });

    await expect(service.createReservation(newBooking(), USERS.owner)).rejects.toThrow(
      "commit failed",
    );
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});

describe("cancelReservation - events", () => {
  test("publishes reservation.cancelled with the owner and who cancelled it", async () => {
    const { service, eventBus } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    await service.cancelReservation(1, USERS.admin);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.cancelled", {
      reservationId: 1,
      roomId: ROOM.id,
      userId: USERS.owner.id,
      cancelledBy: USERS.admin.id,
    });
  });

  test("an idempotent repeat publishes nothing - one event for two calls", async () => {
    const { service, eventBus } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    await service.cancelReservation(1, USERS.owner);
    await service.cancelReservation(1, USERS.owner);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["RESERVATION_ALREADY_STARTED", existingReservation({ startTime: today("07:00"), endTime: today("09:00") }), USERS.owner],
    ["RESERVATION_NOT_FOUND", existingReservation(), USERS.other],
  ])("publishes nothing when cancelling fails with %s", async (code, reservation, currentUser) => {
    const { service, eventBus } = createReservationsTestContext({ reservations: [reservation] });

    await expect(service.cancelReservation(1, currentUser)).rejects.toMatchObject({ code });
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
