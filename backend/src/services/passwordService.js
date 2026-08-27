const argon2 = require('argon2');

async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19 MB, OWASP recommended minimum
    timeCost: 2,
    parallelism: 1,
  });
}

async function verifyPassword(hash, plainPassword) {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
