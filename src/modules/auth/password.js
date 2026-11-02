const bcrypt = require("bcryptjs");

// bcrypt cost factor: 2^12 rounds (~250 ms per hash). The minimum is 10 - every +1
// doubles the work an attacker needs to brute force a leaked hash.
const BCRYPT_COST = 12;

// bcrypt generates a random salt and stores it inside the hash, so equal passwords
// give different hashes
function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

module.exports = { hashPassword };
