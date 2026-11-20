const createEventBus = require("../../src/events/eventBus");
const registerAuditLogListener = require("../../src/modules/auditLog/auditLog.listener");
const registerNotificationListener = require("../../src/modules/notifications/notifications.listener");
const {
  USERS,
  ROOM,
  tomorrow,
  createReservationsTestContext,
} = require("./helpers/reservationsTestContext");

// The real bus and listeners on the in-memory repositories
function createListenersContext() {
  const logger = { log: jest.fn(), error: jest.fn() };
  const eventBus = createEventBus({ logger });
  const context = createReservationsTestContext({
    reservations: [
      { roomId: ROOM.id, userId: USERS.owner.id, startTime: tomorrow("10:00"), endTime: tomorrow("12:00") },
    ],
    eventBus,
  });
  registerAuditLogListener({ eventBus, auditLogRepository: context.auditLogRepository });
  registerNotificationListener({ eventBus, usersRepository: context.usersRepository, logger });
  return { ...context, logger };
}

const notifications = (logger) =>
  logger.log.mock.calls.map(([line]) => line).filter((line) => line.startsWith("[notification]"));

describe("audit log listener", () => {
  test("writes every published event, a repeated cancel adds nothing", async () => {
    const { service, eventBus, auditLogRepository } = createListenersContext();

    const created = await service.createReservation(
      { roomId: ROOM.id, participants: 2, startTime: tomorrow("14:00"), endTime: tomorrow("15:00") },
      USERS.owner,
    );
    await service.cancelReservation(created.id, USERS.admin);
    await service.cancelReservation(created.id, USERS.admin);
    await eventBus.drain();

    const { items, total } = await auditLogRepository.findPage({ filters: {}, limit: 10, offset: 0 });
    expect(total).toBe(2);
    // Newest first
    expect(items.map((entry) => entry.eventType)).toEqual(["reservation.cancelled", "reservation.created"]);
    expect(items[0].payload).toEqual({
      reservationId: created.id,
      roomId: ROOM.id,
      userId: USERS.owner.id,
      cancelledBy: USERS.admin.id,
    });
  });
});

describe("notification listener", () => {
  test("an ADMIN cancelling someone else's reservation notifies the owner", async () => {
    const { service, eventBus, logger } = createListenersContext();

    await service.cancelReservation(1, USERS.admin);
    await eventBus.drain();

    expect(notifications(logger)).toEqual([
      expect.stringMatching(/^\[notification\] to: owner@example\.com - your reservation #1 /),
    ]);
  });

  test("the owner cancelling their own reservation sends nothing", async () => {
    const { service, eventBus, logger } = createListenersContext();

    await service.cancelReservation(1, USERS.owner);
    await eventBus.drain();

    expect(notifications(logger)).toEqual([]);
  });
});
