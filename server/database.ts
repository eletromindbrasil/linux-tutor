import { randomUUID } from "node:crypto";

import pg from "pg";

import { hashPassword, hashSessionToken, normalizeEmail } from "./security.js";

const { Pool } = pg;

export const database = new Pool({
  host: process.env.DB_HOST ?? "database",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "linux_tutor",
  user: process.env.DB_USER ?? "linux_tutor",
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export interface AuthenticatedUser {
  id: string;
  email: string;
  mustChangePassword: boolean;
}

export async function migrateDatabase() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      must_change_password boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_login_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS login_sessions (
      token_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );

    CREATE INDEX IF NOT EXISTS login_sessions_user_id_idx ON login_sessions(user_id);
    CREATE INDEX IF NOT EXISTS login_sessions_expires_at_idx ON login_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS lesson_progress (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id text NOT NULL,
      completed_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, lesson_id)
    );
  `);
}

export async function bootstrapInitialUser() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD são obrigatórios.");
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await database.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
  if (existing.rowCount) return;

  const passwordHash = await hashPassword(password);
  await database.query(
    `INSERT INTO users (id, email, password_hash, must_change_password)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (email) DO NOTHING`,
    [randomUUID(), normalizedEmail, passwordHash]
  );
  console.log(`Initial user created: ${normalizedEmail}`);
}

export async function findUserWithPassword(email: string) {
  const result = await database.query<{
    id: string;
    email: string;
    password_hash: string;
    must_change_password: boolean;
  }>(
    `SELECT id, email, password_hash, must_change_password
     FROM users WHERE email = $1`,
    [normalizeEmail(email)]
  );
  return result.rows[0] ?? null;
}

export async function createLoginSession(userId: string, token: string, expiresAt: Date) {
  await database.query(
    `INSERT INTO login_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [hashSessionToken(token), userId, expiresAt]
  );
  await database.query("UPDATE users SET last_login_at = now() WHERE id = $1", [userId]);
}

export async function findUserBySessionToken(token: string): Promise<AuthenticatedUser | null> {
  const result = await database.query<{
    id: string;
    email: string;
    must_change_password: boolean;
  }>(
    `SELECT users.id, users.email, users.must_change_password
     FROM login_sessions
     JOIN users ON users.id = login_sessions.user_id
     WHERE login_sessions.token_hash = $1 AND login_sessions.expires_at > now()`,
    [hashSessionToken(token)]
  );
  const user = result.rows[0];
  return user
    ? { id: user.id, email: user.email, mustChangePassword: user.must_change_password }
    : null;
}

export async function deleteLoginSession(token: string) {
  await database.query("DELETE FROM login_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
}

export async function updatePassword(userId: string, passwordHash: string) {
  await database.query(
    `UPDATE users
     SET password_hash = $1, must_change_password = false, updated_at = now()
     WHERE id = $2`,
    [passwordHash, userId]
  );
  await database.query("DELETE FROM login_sessions WHERE user_id = $1", [userId]);
}

export async function completedLessons(userId: string) {
  const result = await database.query<{ lesson_id: string }>(
    "SELECT lesson_id FROM lesson_progress WHERE user_id = $1 ORDER BY completed_at",
    [userId]
  );
  return result.rows.map((row) => row.lesson_id);
}

export async function completeLesson(userId: string, lessonId: string) {
  await database.query(
    `INSERT INTO lesson_progress (user_id, lesson_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, lesson_id) DO NOTHING`,
    [userId, lessonId]
  );
}

export async function databaseIsReady() {
  await database.query("SELECT 1");
}

export async function cleanExpiredLoginSessions() {
  await database.query("DELETE FROM login_sessions WHERE expires_at <= now()");
}
