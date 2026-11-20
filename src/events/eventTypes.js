// Every event the application publishes. Payloads:
//   reservation.created   - { reservationId, roomId, userId, startTime, endTime }
//   reservation.cancelled - { reservationId, roomId, userId, cancelledBy }
//     userId = owner of the reservation, cancelledBy = the user who cancelled it
const EVENT_TYPES = Object.freeze({
  RESERVATION_CREATED: "reservation.created",
  RESERVATION_CANCELLED: "reservation.cancelled",
});

module.exports = { EVENT_TYPES };
