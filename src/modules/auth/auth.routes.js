const { Router } = require("express");
const validate = require("../../middleware/validate");
const createAuthService = require("./auth.service");
const createAuthController = require("./auth.controller");
const { registerSchema } = require("./auth.schemas");

function createAuthRouter({ usersRepository }) {
  const router = Router();
  const authService = createAuthService({ usersRepository });
  const authController = createAuthController({ authService });

  router.post("/register", validate({ body: registerSchema }), authController.register);

  return router;
}

module.exports = createAuthRouter;
