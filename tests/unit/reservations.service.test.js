const {
  NOW,
  USERS,
  ROOM,
  OTHER_ROOM,
  today,
  tomorrow,
  createReservationsTestContext,
} = require("./helpers/reservationsTestContext");

const HOUR_MS = 60 * 60 * 1000;

// Already stored: CONFIRMED, ROOM, tomorrow 10:00-12:00, owned by USERS.owner (id 1)
const existingReservation = (overrides = {}) => ({
  roomId: ROOM.id,
  userId: USERS.owner.id,
  startTime: tomorrow("10:00"),
  endTime: tomorrow("12:00"),
  ...overrides,
});

// Body of a new booking (already validated by the schema)
const newBooking = (overrides = {}) => ({
  roomId: ROOM.id,
  participants: 2,
  startTime: tomorrow("10:00"),
  endTime: tomorrow("12:00"),
  ...overrides,
});

describe("createReservation - overlap", () => {
  test.each([
    ["a partial overlap at the start", "09:00", "11:00"],
    ["a partial overlap at the end", "11:00", "13:00"],
    ["a range inside the existing one", "10:30", "11:30"],
    ["a range containing the existing one", "09:00", "13:00"],
    ["the same range", "10:00", "12:00"],
  ])("rejects %s (%s-%s) with ROOM_ALREADY_BOOKED", async (_case, start, end) => {
    const { service, reservationsRepository } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    await expect(
      service.createReservation(
        newBooking({ startTime: tomorrow(start), endTime: tomorrow(end) }),
        USERS.other,
      ),
    ).rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });
    expect(await reservationsRepository.findAllByRoomId(ROOM.id)).toHaveLength(1);
  });

  test.each([
    ["ending exactly when the existing one starts", ROOM.id, "08:00", "10:00"],
    ["starting exactly when the existing one ends", ROOM.id, "12:00", "14:00"],
    ["for the same range in another room", OTHER_ROOM.id, "10:00", "12:00"],
  ])("allows a reservation %s", async (_case, roomId, start, end) => {
    const { service } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    const created = await service.createReservation(
      newBooking({ roomId, startTime: tomorrow(start), endTime: tomorrow(end) }),
      USERS.other,
    );

    expect(created).toMatchObject({
      roomId,
      userId: USERS.other.id,
      status: "CONFIRMED",
      startTime: tomorrow(start),
      endTime: tomorrow(end),
    });
  });
});

describe("createReservation - cancelled reservations", () => {
  test("a CANCELLED reservation does not block its time range", async () => {
    const { service } = createReservationsTestContext({
      reservations: [existingReservation({ status: "CANCELLED", cancelledAt: today("07:00") })],
    });

    const created = await service.createReservation(newBooking(), USERS.other);

    expect(created).toMatchObject({
      roomId: ROOM.id,
      status: "CONFIRMED",
      startTime: tomorrow("10:00"),
      endTime: tomorrow("12:00"),
    });
  });
});

describe("createReservation - room capacity", () => {
  test("allows participants equal to the room capacity", async () => {
    const { service } = createReservationsTestContext();

    const created = await service.createReservation(
      newBooking({ participants: ROOM.capacity }),
      USERS.owner,
    );

    expect(created).toMatchObject({ participants: ROOM.capacity, status: "CONFIRMED" });
  });

  test("rejects capacity + 1 participants with ROOM_CAPACITY_EXCEEDED", async () => {
    const { service, reservationsRepository } = createReservationsTestContext();

    await expect(
      service.createReservation(newBooking({ participants: ROOM.capacity + 1 }), USERS.owner),
    ).rejects.toMatchObject({ code: "ROOM_CAPACITY_EXCEEDED" });
    expect(await reservationsRepository.findAllByRoomId(ROOM.id)).toHaveLength(0);
  });
});

describe("createReservation - duration", () => {
  test.each([
    ["exactly 15 min", "10:00", "10:15"],
    ["exactly 8 h", "10:00", "18:00"],
  ])("allows %s (%s-%s)", async (_case, start, end) => {
    const { service } = createReservationsTestContext();

    const created = await service.createReservation(
      newBooking({ startTime: tomorrow(start), endTime: tomorrow(end) }),
      USERS.owner,
    );

    expect(created).toMatchObject({
      status: "CONFIRMED",
      startTime: tomorrow(start),
      endTime: tomorrow(end),
    });
  });

  // The allowed cases above differ only in endTime, so these fail on the duration rule
  test.each([
    ["14 min", "10:00", "10:14"],
    ["8 h 1 min", "10:00", "18:01"],
  ])("rejects %s (%s-%s) with VALIDATION_ERROR on endTime", async (_case, start, end) => {
    const { service, reservationsRepository } = createReservationsTestContext();

    await expect(
      service.createReservation(
        newBooking({ startTime: tomorrow(start), endTime: tomorrow(end) }),
        USERS.owner,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", details: [{ field: "endTime" }] });
    expect(await reservationsRepository.findAllByRoomId(ROOM.id)).toHaveLength(0);
  });
});

describe("cancelReservation - time rules", () => {
  test.each([
    ["that started an hour ago", "07:00", "09:00"],
    ["that starts exactly now", "08:00", "09:00"],
  ])("rejects a reservation %s with RESERVATION_ALREADY_STARTED", async (_case, start, end) => {
    const { service, reservationsRepository } = createReservationsTestContext({
      reservations: [existingReservation({ startTime: today(start), endTime: today(end) })],
    });

    await expect(service.cancelReservation(1, USERS.owner)).rejects.toMatchObject({
      code: "RESERVATION_ALREADY_STARTED",
    });
    expect(await reservationsRepository.findById(1)).toMatchObject({
      status: "CONFIRMED",
      cancelledAt: null,
    });
  });

  test("cancelling twice is idempotent - cancelledAt keeps the first value", async () => {
    const { service, clock } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    const first = await service.cancelReservation(1, USERS.owner);
    clock.advance(HOUR_MS);
    const second = await service.cancelReservation(1, USERS.owner);

    expect(first).toMatchObject({ status: "CANCELLED", cancelledAt: NOW.toISOString() });
    expect(second).toMatchObject({ status: "CANCELLED", cancelledAt: first.cancelledAt });
  });
});

describe("cancelReservation - ownership", () => {
  test("rejects another USER with RESERVATION_NOT_FOUND and leaves the reservation", async () => {
    const { service, reservationsRepository } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    await expect(service.cancelReservation(1, USERS.other)).rejects.toMatchObject({
      code: "RESERVATION_NOT_FOUND",
    });
    expect(await reservationsRepository.findById(1)).toMatchObject({
      status: "CONFIRMED",
      cancelledAt: null,
    });
  });

  test.each([
    ["the owner", USERS.owner],
    ["an ADMIN", USERS.admin],
  ])("allows %s to cancel", async (_who, currentUser) => {
    const { service } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    const cancelled = await service.cancelReservation(1, currentUser);

    expect(cancelled).toMatchObject({
      userId: USERS.owner.id,
      status: "CANCELLED",
      cancelledAt: NOW.toISOString(),
    });
  });
});

describe("getReservationById - ownership", () => {
  test("hides another USER's reservation behind RESERVATION_NOT_FOUND", async () => {
    const { service } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    await expect(service.getReservationById(1, USERS.other)).rejects.toMatchObject({
      code: "RESERVATION_NOT_FOUND",
    });
  });

  test("lets an ADMIN read any reservation", async () => {
    const { service } = createReservationsTestContext({
      reservations: [existingReservation()],
    });

    expect(await service.getReservationById(1, USERS.admin)).toMatchObject({
      id: 1,
      userId: USERS.owner.id,
    });
  });
});
