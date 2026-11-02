const { z } = require("zod");

// bcrypt hashes only the first 72 bytes of the password and silently ignores the rest
const BCRYPT_MAX_BYTES = 72;

// Normalized before validation: " Jan.Kowalski@Example.com" -> "jan.kowalski@example.com"
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "email must be at most 254 characters long")
  .pipe(z.email("email must be a valid email address"));

// .strict(): any extra field (e.g. "role": "ADMIN") is rejected with 400, not ignored
const registerSchema = z
  .object({
    email: emailSchema,
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

// No password length rules here - a password that breaks them was never registered,
// so the answer is the same 401 as for any other wrong password
const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "password is required"),
  })
  .strict();

module.exports = { registerSchema, loginSchema };
