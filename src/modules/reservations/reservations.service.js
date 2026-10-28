const {
  NotFoundError,
  ConflictError,
  ValidationError,
} = require("../../errors");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const CANCEL_TRANSITIONS = {
  CONFIRMED: "CANCELLED",
};

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function createReservationsService({
  reservationsRepository,
  roomsRepository,
  now,
}) {
  async function listReservations(roomId) {
    if (roomId !== undefined) {
      return reservationsRepository.findAllByRoomId(roomId);
    }
    return reservationsRepository.findAll();
  }

  async function getReservationById(id) {
    const reservation = await reservationsRepository.findById(id);
    if (!reservation) {
      throw new NotFoundError("Reservation not found", "RESERVATION_NOT_FOUND");
    }
    return reservation;
  }

  async function createReservation(input) {
    const room = await roomsRepository.findById(input.roomId);
    if (!room) {
      throw new NotFoundError("Room not found", "ROOM_NOT_FOUND");
    }

    const startMs = new Date(input.startTime).getTime();
    const endMs = new Date(input.endTime).getTime();
    const nowMs = now().getTime();

    if (endMs <= startMs) {
      throw new ValidationError([
        {
          location: "body",
          field: "endTime",
          message: "endTime must be later than startTime",
        },
      ]);
    }

    const durationMs = endMs - startMs;
    if (durationMs < MIN_DURATION_MS) {
      throw new ValidationError([
        {
          location: "body",
          field: "endTime",
          message: "Reservation must last at least 15 minutes",
        },
      ]);
    }
    if (durationMs > MAX_DURATION_MS) {
      throw new ValidationError([
        {
          location: "body",
          field: "endTime",
          message: "Reservation must last at most 8 hours",
        },
      ]);
    }

    if (startMs < nowMs) {
      throw new ValidationError([
        {
          location: "body",
          field: "startTime",
          message: "startTime cannot be in the past",
        },
      ]);
    }

    if (input.participants > room.capacity) {
      throw new ConflictError(
        "Room capacity exceeded",
        "ROOM_CAPACITY_EXCEEDED",
      );
    }

    const roomReservations = await reservationsRepository.findAllByRoomId(
      input.roomId,
    );
    const hasOverlap = roomReservations.some((reservation) => {
      if (reservation.status !== "CONFIRMED") return false;
      const existingStart = new Date(reservation.startTime).getTime();
      const existingEnd = new Date(reservation.endTime).getTime();
      return rangesOverlap(startMs, endMs, existingStart, existingEnd);
    });

    if (hasOverlap) {
      throw new ConflictError(
        "Room is already booked for the requested time range",
        "ROOM_ALREADY_BOOKED",
      );
    }

    return reservationsRepository.create({
      roomId: input.roomId,
      reservedBy: input.reservedBy,
      participants: input.participants,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      status: "CONFIRMED",
      createdAt: now().toISOString(),
      cancelledAt: null,
      internalNote: "created via API v2",
    });
  }

  async function cancelReservation(id) {
    const reservation = await getReservationById(id);

    if (reservation.status === "CANCELLED") {
      return reservation;
    }

    const nextStatus = CANCEL_TRANSITIONS[reservation.status];
    if (!nextStatus) {
      throw new ConflictError(
        `Cannot cancel a reservation in status ${reservation.status}`,
        "INVALID_STATUS_TRANSITION",
      );
    }

    const startMs = new Date(reservation.startTime).getTime();
    if (startMs <= now().getTime()) {
      throw new ConflictError(
        "Reservation has already started and cannot be cancelled",
        "RESERVATION_ALREADY_STARTED",
      );
    }

    return reservationsRepository.update(id, {
      status: nextStatus,
      cancelledAt: now().toISOString(),
    });
  }

  return {
    listReservations,
    getReservationById,
    createReservation,
    cancelReservation,
  };
}

module.exports = createReservationsService;
