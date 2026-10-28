const { z } = require("zod");

const roomIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive("id must be a positive integer"),
  })
  .strict();

module.exports = { roomIdParamSchema };
