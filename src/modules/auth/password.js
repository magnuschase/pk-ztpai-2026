const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// bcrypt cost factor: 2^12 rounds (~250 ms per hash). The minimum is 10 - every +1
// doubles the work an attacker needs to brute force a leaked hash.
const BCRYPT_COST = 12;

// Hash of a random password with the same cost. Login checks it when the email does not
// exist, so an unknown email takes as long to reject as a wrong password - the response
// time does not reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomUUID(), BCRYPT_COST);

// bcrypt generates a random salt and stores it inside the hash, so equal passwords
// give different hashes
function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

// passwordHash is null when there is no such user - the result is then always false
async function verifyPassword(password, passwordHash) {
  if (!passwordHash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}

module.exports = { hashPassword, verifyPassword };
