import assert from "node:assert/strict";
import test from "node:test";

import {
  hashPassword,
  hashSessionToken,
  minimumPasswordLength,
  newSessionToken,
  normalizeEmail,
  validatePassword,
  verifyPassword
} from "./security.js";

test("password hashes are salted and verifiable", async () => {
  const first = await hashPassword("senha-oficial");
  const second = await hashPassword("senha-oficial");

  assert.notEqual(first, second);
  assert.equal(await verifyPassword("senha-oficial", first), true);
  assert.equal(await verifyPassword("senha-incorreta", first), false);
  assert.equal(await verifyPassword("senha-oficial", "invalid"), false);
});

test("official passwords require exactly the configured minimum", () => {
  assert.equal(minimumPasswordLength, 10);
  assert.match(validatePassword("123456789") ?? "", /10 caracteres/);
  assert.equal(validatePassword("1234567890"), null);
});

test("session tokens are random and stored through one-way hashes", () => {
  const first = newSessionToken();
  const second = newSessionToken();

  assert.notEqual(first, second);
  assert.notEqual(hashSessionToken(first), first);
  assert.equal(hashSessionToken(first), hashSessionToken(first));
});

test("emails are normalized before lookup", () => {
  assert.equal(normalizeEmail("  EletroMind.Brasil@GMAIL.com "), "eletromind.brasil@gmail.com");
});
