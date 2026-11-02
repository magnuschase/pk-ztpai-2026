// Whitelist of public fields - the password hash never reaches a response
function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

module.exports = { toUserResponse };
