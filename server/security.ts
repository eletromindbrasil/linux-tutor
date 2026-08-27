import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const passwordKeyLength = 64;

export const minimumPasswordLength = 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, passwordKeyLength)) as Buffer;
  return `scrypt:${salt.toString("base64")}:${derivedKey.toString("base64")}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, saltValue, expectedValue] = encodedHash.split(":");
  if (algorithm !== "scrypt" || !saltValue || !expectedValue) return false;

  try {
    const salt = Buffer.from(saltValue, "base64");
    const expected = Buffer.from(expectedValue, "base64");
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < minimumPasswordLength) {
    return `A nova senha deve ter pelo menos ${minimumPasswordLength} caracteres.`;
  }
  if (password.length > 256) return "A senha informada é muito longa.";
  return null;
}
