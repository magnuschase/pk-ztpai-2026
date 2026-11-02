const { toUserResponse } = require("../users/users.mapper");

function createAuthController({ authService }) {
  async function register(req, res) {
    const user = await authService.register(req.validated.body);
    res.status(201).json(toUserResponse(user));
  }

  return { register };
}

module.exports = createAuthController;
