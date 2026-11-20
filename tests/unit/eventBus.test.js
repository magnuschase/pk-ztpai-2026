const createEventBus = require("../../src/events/eventBus");

const NOW = new Date("2026-12-07T08:00:00.000Z");
const createTestBus = () => {
  const logger = { error: jest.fn() };
  return { bus: createEventBus({ now: () => NOW, logger }), logger };
};

describe("event bus", () => {
  test("delivers { type, payload, occurredAt } to every listener of the type", async () => {
    const { bus } = createTestBus();
    const first = jest.fn();
    const second = jest.fn();
    const otherType = jest.fn();
    bus.subscribe("reservation.created", first);
    bus.subscribe("reservation.created", second);
    bus.subscribe("reservation.cancelled", otherType);

    bus.publish("reservation.created", { reservationId: 1 });
    await bus.drain();

    const event = {
      type: "reservation.created",
      payload: { reservationId: 1 },
      occurredAt: NOW.toISOString(),
    };
    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);
    expect(otherType).not.toHaveBeenCalled();
  });

  test.each([
    [
      "throws",
      () => {
        throw new Error("listener failed");
      },
    ],
    ["rejects", async () => Promise.reject(new Error("listener failed"))],
  ])("a listener that %s does not reach the publisher or the other listeners", async (_how, failing) => {
    const { bus, logger } = createTestBus();
    const healthy = jest.fn();
    bus.subscribe("reservation.created", failing);
    bus.subscribe("reservation.created", healthy);

    expect(() => bus.publish("reservation.created", { reservationId: 1 })).not.toThrow();
    await bus.drain();

    expect(healthy).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("failed for reservation.created"),
      expect.objectContaining({ message: "listener failed" }),
    );
  });

  test("publish() does not wait for listeners", async () => {
    const { bus } = createTestBus();
    let finished = false;
    bus.subscribe("reservation.created", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      finished = true;
    });

    bus.publish("reservation.created", {});
    expect(finished).toBe(false);

    await bus.drain();
    expect(finished).toBe(true);
  });
});
