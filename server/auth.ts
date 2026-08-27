import type { Request, Response } from "express";

import { findUserBySessionToken, type AuthenticatedUser } from "./database.js";

export const sessionCookieName = "linux_tutor_session";

export function parseCookies(cookieHeader: string | undefined) {
  const cookies = new Map<string, string>();
  for (const part of cookieHeader?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) {
      try {
        cookies.set(key, decodeURIComponent(value));
      } catch {
        // Ignore malformed cookie values instead of failing the entire request.
      }
    }
  }
  return cookies;
}

export async function authenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = parseCookies(request.headers.cookie).get(sessionCookieName);
  return token ? findUserBySessionToken(token) : null;
}

export async function requireUser(request: Request, response: Response) {
  const user = await authenticatedUser(request);
  if (!user) {
    response.status(401).json({ error: "Faça login para continuar." });
    return null;
  }
  if (user.mustChangePassword) {
    response.status(403).json({
      error: "Altere a senha temporária antes de continuar.",
      code: "PASSWORD_CHANGE_REQUIRED"
    });
    return null;
  }
  return user;
}

export function sessionCookie(token: string, request: Request, maxAgeSeconds: number) {
  const secure = process.env.COOKIE_SECURE === "true" || request.headers["x-forwarded-proto"] === "https";
  return [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
    `Max-Age=${maxAgeSeconds}`
  ].filter(Boolean).join("; ");
}

export function expiredSessionCookie(request: Request) {
  return sessionCookie("", request, 0);
}
