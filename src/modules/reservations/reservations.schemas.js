const { z } = require("zod");

// ISO 8601 date-time that carries an explicit timezone (Z or +hh:mm / -hh:mm).
const isoDateTimeWithOffset = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid ISO 8601 date-time",
  })
  .refine((value) => /(Z|[+-]\d{2}:\d{2})$/.test(value), {
    message: "Must include a timezone offset (e.g. Z or +01:00)",
  });

const createReservationSchema = z
  .object({
    roomId: z.number().int().positive("roomId must be a positive integer"),
    reservedBy: z
      .string()
      .trim()
      .min(3, "reservedBy must be at least 3 characters long")
      .max(100, "reservedBy must be at most 100 characters long"),
    participants: z.number().int().positive("participants must be a positive integer"),
    startTime: isoDateTimeWithOffset,
    endTime: isoDateTimeWithOffset,
  })
  .strict();

const reservationIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive("id must be a positive integer"),
  })
  .strict();

const SORT_VALUES = [
  "startTime",
  "-startTime",
  "createdAt",
  "-createdAt",
  "participants",
  "-participants",
];

const listReservationsQuerySchema = z
  .object({
    roomId: z.coerce.number().int().positive("roomId must be a positive integer").optional(),
    buildingId: z.coerce.number().int().positive("buildingId must be a positive integer").optional(),
    status: z
      .enum(["CONFIRMED", "CANCELLED"], { error: "status must be CONFIRMED or CANCELLED" })
      .optional(),
    from: isoDateTimeWithOffset.optional(),
    to: isoDateTimeWithOffset.optional(),
    page: z.coerce.number().int().min(1, "page must be an integer >= 1").default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, "limit must be between 1 and 100")
      .max(100, "limit must be between 1 and 100")
      .default(20),
    sort: z
      .enum(SORT_VALUES, { error: `sort must be one of: ${SORT_VALUES.join(", ")}` })
      .default("startTime"),
  })
  .strict()
  .refine(
    (query) =>
      query.from === undefined ||
      query.to === undefined ||
      Date.parse(query.from) < Date.parse(query.to),
    { message: "from must be earlier than to", path: ["from"] },
  );

module.exports = {
  createReservationSchema,
  reservationIdParamSchema,
  listReservationsQuerySchema,
};
