const { EVENT_TYPES } = require("../../events/eventTypes");
const { ROLES } = require("../users/users.roles");

// Simulated notification (a log line instead of an e-mail): when an ADMIN cancels
// someone else's reservation, its owner is told. Owners cancelling their own get nothing.
function registerNotificationListener({ eventBus, usersRepository, logger = console }) {
  eventBus.subscribe(
    EVENT_TYPES.RESERVATION_CANCELLED,
    async function notifyOwnerOfAdminCancellation({ payload }) {
      const { reservationId, roomId, userId, cancelledBy } = payload;
      if (cancelledBy === userId) return;

      const [owner, canceller] = await Promise.all([
        usersRepository.findById(userId),
        usersRepository.findById(cancelledBy),
      ]);
      if (!owner || canceller?.role !== ROLES.ADMIN) return;

      logger.log(
        `[notification] to: ${owner.email} - your reservation #${reservationId} ` +
          `(room ${roomId}) was cancelled by an administrator (${canceller.email})`,
      );
    },
  );
}

module.exports = registerNotificationListener;
