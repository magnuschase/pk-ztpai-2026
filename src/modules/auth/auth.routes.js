const { Router } = require("express");
const validate = require("../../middleware/validate");
const createAuthService = require("./auth.service");
const createAuthController = require("./auth.controller");
const { registerSchema, loginSchema } = require("./auth.schemas");

function createAuthRouter({ usersRepository, tokenService, authenticate }) {
  const router = Router();
  const authService = createAuthService({ usersRepository, tokenService });
  const authController = createAuthController({ authService });

  router.post("/register", validate({ body: registerSchema }), authController.register);
  router.post("/login", validate({ body: loginSchema }), authController.login);
  router.get("/me", authenticate, authController.me);

  return router;
}

module.exports = createAuthRouter;
