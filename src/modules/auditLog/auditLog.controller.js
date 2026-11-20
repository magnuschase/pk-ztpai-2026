function toAuditLogEntryResponse(entry) {
  return {
    id: entry.id,
    eventType: entry.eventType,
    payload: entry.payload,
    occurredAt: new Date(entry.occurredAt).toISOString(),
  };
}

function createAuditLogController({ auditLogService }) {
  async function listAuditLog(req, res) {
    const result = await auditLogService.listAuditLog(req.validated.query);
    res.json({
      data: result.items.map(toAuditLogEntryResponse),
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  }

  return { listAuditLog };
}

module.exports = createAuditLogController;
