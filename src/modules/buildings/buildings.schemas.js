const { z } = require("zod");

const createBuildingSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "name is required")
      .max(100, "name must be at most 100 characters long"),
    address: z
      .string()
      .trim()
      .min(5, "address must be at least 5 characters long")
      .max(255, "address must be at most 255 characters long"),
  })
  .strict();

const buildingIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive("id must be a positive integer"),
  })
  .strict();

module.exports = { createBuildingSchema, buildingIdParamSchema };
