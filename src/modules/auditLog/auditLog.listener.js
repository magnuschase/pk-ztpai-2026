const { EVENT_TYPES } = require("../../events/eventTypes");

// Writes every event the application publishes to audit_log.
// A failure here is logged by the event bus - it never changes the API response.
function registerAuditLogListener({ eventBus, auditLogRepository }) {
  async function writeAuditLog(event) {
    await auditLogRepository.create({
      eventType: event.type,
      payload: event.payload,
      occurredAt: event.occurredAt,
    });
  }

  for (const type of Object.values(EVENT_TYPES)) {
    eventBus.subscribe(type, writeAuditLog);
  }
}

module.exports = registerAuditLogListener;
