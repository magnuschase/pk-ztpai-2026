const { z } = require("zod");

const roomIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive("id must be a positive integer"),
  })
  .strict();

const createRoomSchema = z
  .object({
    buildingId: z.number().int().positive("buildingId must be a positive integer"),
    name: z
      .string()
      .trim()
      .min(1, "name is required")
      .max(50, "name must be at most 50 characters long"),
    capacity: z.number().int().positive("capacity must be a positive integer"),
  })
  .strict();

module.exports = { roomIdParamSchema, createRoomSchema };
