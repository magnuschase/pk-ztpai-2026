const { toUserResponse } = require("../users/users.mapper");

function createAuthController({ authService }) {
  async function register(req, res) {
    const user = await authService.register(req.validated.body);
    res.status(201).json(toUserResponse(user));
  }

  async function login(req, res) {
    const token = await authService.login(req.validated.body);
    // Tokens must not end up in browser or proxy caches (RFC 6749, 5.1)
    res.set("Cache-Control", "no-store").json(token);
  }

  async function me(req, res) {
    const user = await authService.getCurrentUser(req.user);
    res.json(toUserResponse(user));
  }

  return { register, login, me };
}

module.exports = createAuthController;
