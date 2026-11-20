function createAuditLogService({ auditLogRepository }) {
  // Newest first (the repository orders by occurredAt, id - descending)
  async function listAuditLog({ eventType, page, limit }) {
    const { items, total } = await auditLogRepository.findPage({
      filters: { eventType },
      limit,
      offset: (page - 1) * limit,
    });
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  return { listAuditLog };
}

module.exports = createAuditLogService;
