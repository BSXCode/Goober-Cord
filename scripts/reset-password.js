/**
 * One-time script to set a new password for a user (e.g. if you're locked out).
 * Run from project root: node scripts/reset-password.js <username> <new-password>
 * If your DB is encrypted, set ENCRYPTION_KEY in .env first.
 */
require("dotenv").config();
const path = require("path");

// Load db from project root
const db = require(path.join(__dirname, "..", "server", "db"));
const crypto = require("crypto");

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(SALT_LEN);
  else if (typeof salt === "string") salt = Buffer.from(salt, "hex");
  const hash = crypto.scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return { hash: hash.toString("hex"), salt: salt.toString("hex") };
}

const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
  console.error("Usage: node scripts/reset-password.js <username> <new-password>");
  process.exit(1);
}

const user = db.getUserByUsername(username.trim());
if (!user) {
  console.error("User not found with username:", username);
  process.exit(1);
}

const { hash, salt } = hashPassword(newPassword.trim());
db.updateUser(user.id, { passwordHash: hash, passwordSalt: salt });
console.log("Password updated for", user.username + "#" + user.discriminator);
console.log("You can now log in with the new password.");
