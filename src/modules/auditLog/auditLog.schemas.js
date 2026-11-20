const { z } = require("zod");
const { EVENT_TYPES } = require("../../events/eventTypes");

const EVENT_TYPE_VALUES = Object.values(EVENT_TYPES);

const listAuditLogQuerySchema = z
  .object({
    eventType: z
      .enum(EVENT_TYPE_VALUES, { error: `eventType must be one of: ${EVENT_TYPE_VALUES.join(", ")}` })
      .optional(),
    page: z.coerce.number().int().min(1, "page must be an integer >= 1").default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, "limit must be between 1 and 100")
      .max(100, "limit must be between 1 and 100")
      .default(20),
  })
  .strict();

module.exports = { listAuditLogQuerySchema };
