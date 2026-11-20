const { Router } = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { ROLES } = require("../users/users.roles");
const createAuditLogService = require("./auditLog.service");
const createAuditLogController = require("./auditLog.controller");
const { listAuditLogQuerySchema } = require("./auditLog.schemas");

function createAuditLogRouter({ auditLogRepository }) {
  const router = Router();
  const auditLogService = createAuditLogService({ auditLogRepository });
  const auditLogController = createAuditLogController({ auditLogService });

  // The whole router is ADMIN only - checked before validation, like the rooms routes
  router.use(authorize(ROLES.ADMIN));

  router.get("/", validate({ query: listAuditLogQuerySchema }), auditLogController.listAuditLog);

  return router;
}

module.exports = createAuditLogRouter;
