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

// PATCH: name and/or capacity. buildingId cannot change - moving a room (with its
// reservations) to another building is not an edit of the room.
const updateRoomSchema = createRoomSchema
  .omit({ buildingId: true })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "At least one field (name, capacity) is required",
  });

module.exports = { roomIdParamSchema, createRoomSchema, updateRoomSchema };
