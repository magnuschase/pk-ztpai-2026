const { z } = require("zod");

// bcrypt hashes only the first 72 bytes of the password and silently ignores the rest
const BCRYPT_MAX_BYTES = 72;

// .strict(): any extra field (e.g. "role": "ADMIN") is rejected with 400, not ignored
const registerSchema = z
  .object({
    // Normalized before validation: " Jan.Kowalski@Example.com" -> "jan.kowalski@example.com"
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, "email must be at most 254 characters long")
      .pipe(z.email("email must be a valid email address")),
    // Not trimmed - spaces are a legitimate part of a password
    password: z
      .string()
      .min(10, "password must be at least 10 characters long")
      .max(72, { message: "password must be at most 72 characters long", abort: true })
      // Multi-byte characters (e.g. "ą" = 2 bytes in UTF-8) can push 72 characters past
      // the bcrypt limit - the end of such a password would not be checked at login
      .refine((password) => Buffer.byteLength(password, "utf8") <= BCRYPT_MAX_BYTES, {
        message: `password must be at most ${BCRYPT_MAX_BYTES} bytes long (UTF-8)`,
      }),
  })
  .strict();

module.exports = { registerSchema };
