const {
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} = require("../../errors");
const { ROLES } = require("../users/users.roles");
const { EVENT_TYPES } = require("../../events/eventTypes");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const CANCEL_TRANSITIONS = {
  CONFIRMED: "CANCELLED",
};

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Ownership: ADMIN reaches every reservation, a USER only their own.
// currentUser = req.user from the token ({ id, role }).
function canAccess(reservation, currentUser) {
  return (
    currentUser.role === ROLES.ADMIN || reservation.userId === currentUser.id
  );
}

// Someone else's reservation gives a USER the same 404 as one that does not exist.
// Reservations are private - a 403 would confirm that a reservation with this ID exists.
function ensureAccessible(reservation, currentUser) {
  if (!reservation || !canAccess(reservation, currentUser)) {
    throw new NotFoundError("Reservation not found", "RESERVATION_NOT_FOUND");
  }
  return reservation;
}

// The owner filter is added after validation, so no query parameter can widen it.
// ?userId= is an ADMIN tool - for a USER it is 403, not silently ignored: an ignored
// filter returns data that does not match the request (the client asks for user 3's
// reservations and gets its own, with nothing saying so). The 403 reveals nothing -
// it is the same for every userId, existing or not.
function scopeFiltersToUser(filters, currentUser) {
  if (currentUser.role === ROLES.ADMIN) return filters;
  if (filters.userId !== undefined) {
    throw new ForbiddenError("Only an ADMIN can filter reservations by userId");
  }
  return { ...filters, userId: currentUser.id };
}

function createReservationsService({
  reservationsRepository,
  roomsRepository,
  runInTransaction,
  now,
  eventBus,
}) {
  // sort comes validated from the whitelist, e.g. "startTime" or "-createdAt"
  async function listReservations({ filters, sort, page, limit }, currentUser) {
    const { items, total } = await reservationsRepository.findPage({
      filters: scopeFiltersToUser(filters, currentUser),
      sort: {
        field: sort.replace(/^-/, ""),
        direction: sort.startsWith("-") ? "desc" : "asc",
      },
      limit,
      offset: (page - 1) * limit,
    });

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async function getReservationById(id, currentUser) {
    return ensureAccessible(
      await reservationsRepository.findById(id),
      currentUser,
    );
  }

  // Overlap check and insert run in one transaction, after locking the room row
  // (SELECT ... FOR UPDATE). Concurrent bookings of the same room wait for the lock,
  // and once they get it, their overlap check sees the reservation committed before.
  // The conflicting reservation does not exist yet, so there is no reservation row
  // to lock - the room row is what every booking of this room has in common.
  // currentUser = req.user from the token - the only source of the owner
  async function createReservation(input, currentUser) {
    const reservation = await runInTransaction((repositories) =>
      createReservationInTransaction(repositories, input, currentUser),
    );
    // After the commit: a booking that failed (e.g. 409) or was rolled back publishes nothing
    eventBus.publish(EVENT_TYPES.RESERVATION_CREATED, {
      reservationId: reservation.id,
      roomId: reservation.roomId,
      userId: reservation.userId,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    });
    return reservation;
  }

  // Gets repositories bound to the transaction (they shadow the outer ones on purpose)
  async function createReservationInTransaction(
    { roomsRepository, reservationsRepository },
    input,
    currentUser,
  ) {
    const room = await roomsRepository.findByIdForUpdate(input.roomId);
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
      userId: currentUser.id,
      participants: input.participants,
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      status: "CONFIRMED",
      createdAt: now().toISOString(),
      cancelledAt: null,
      internalNote: "created via API v2",
    });
  }

  // The reservation row is locked (SELECT ... FOR UPDATE) for the whole transaction:
  // concurrent cancellations of one reservation run one after another and the later ones
  // see CANCELLED, so exactly one call changes the row and publishes the event.
  async function cancelReservation(id, currentUser) {
    const { reservation, changed } = await runInTransaction((repositories) =>
      cancelReservationInTransaction(repositories, id, currentUser),
    );
    // After the commit, and only for the call that cancelled it - not for an idempotent repeat
    if (changed) {
      eventBus.publish(EVENT_TYPES.RESERVATION_CANCELLED, {
        reservationId: reservation.id,
        roomId: reservation.roomId,
        userId: reservation.userId,
        cancelledBy: currentUser.id,
      });
    }
    return reservation;
  }

  // The role decides only WHICH reservations can be cancelled (ownership check).
  // The rules below apply to ADMIN as well - there is no bypass.
  async function cancelReservationInTransaction(
    { reservationsRepository },
    id,
    currentUser,
  ) {
    const reservation = ensureAccessible(
      await reservationsRepository.findByIdForUpdate(id),
      currentUser,
    );

    if (reservation.status === "CANCELLED") {
      return { reservation, changed: false };
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

    const cancelled = await reservationsRepository.update(id, {
      status: nextStatus,
      cancelledAt: now().toISOString(),
    });
    return { reservation: cancelled, changed: true };
  }

  return {
    listReservations,
    getReservationById,
    createReservation,
    cancelReservation,
  };
}

module.exports = createReservationsService;
