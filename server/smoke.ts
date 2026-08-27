import { randomUUID } from "node:crypto";

import { WebSocket } from "ws";

import { database } from "./database.js";
import { loadLessons } from "./lessonRepository.js";
import { hashPassword } from "./security.js";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4173";
const socketUrl = baseUrl.replace(/^http/, "ws");
const smokeUserId = randomUUID();
const smokeEmail = `smoke-${smokeUserId}@linux-tutor.invalid`;
const smokePassword = "smoke-password-2026";

await database.query(
  `INSERT INTO users (id, email, password_hash, must_change_password)
   VALUES ($1, $2, $3, true)`,
  [smokeUserId, smokeEmail, await hashPassword(smokePassword)]
);

const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: smokeEmail, password: smokePassword })
});
if (!loginResponse.ok) throw new Error(`Smoke login failed: ${await loginResponse.text()}`);
const loginPayload = await loginResponse.json() as { user: { mustChangePassword: boolean } };
if (!loginPayload.user.mustChangePassword) throw new Error("Smoke user did not require a password change");
const temporaryCookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0];
if (!temporaryCookie) throw new Error("Smoke login did not return a session cookie");

const blockedLessons = await fetch(`${baseUrl}/api/lessons`, { headers: { Cookie: temporaryCookie } });
if (blockedLessons.status !== 403) throw new Error("Temporary password did not block protected APIs");

const officialPassword = "official-password-2026";
const passwordResponse = await fetch(`${baseUrl}/api/auth/change-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: temporaryCookie },
  body: JSON.stringify({ currentPassword: smokePassword, newPassword: officialPassword })
});
if (!passwordResponse.ok) throw new Error(`Password change failed: ${await passwordResponse.text()}`);
const officialCookie = passwordResponse.headers.get("set-cookie")?.split(";", 1)[0];
if (!officialCookie) throw new Error("Password change did not renew the session cookie");
const cookie: string = officialCookie;
console.log("PASS first-login-password-change: protected APIs remain blocked until the change");

interface VerificationResponse {
  passed: boolean;
  results: Array<{ label: string; passed: boolean; message: string }>;
}

const cases = await loadLessons();

try {
  for (const testCase of cases) {
    const createResponse = await fetch(`${baseUrl}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ lessonId: testCase.id })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create ${testCase.id}: ${await createResponse.text()}`);
    }

    const { sessionId } = (await createResponse.json()) as { sessionId: string };
    const terminalOutput = await runCommands(sessionId, testCase.smokeCommands);
    const verifyResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/verify`, {
      method: "POST",
      headers: { Cookie: cookie }
    });
    const verification = (await verifyResponse.json()) as VerificationResponse;

    await fetch(`${baseUrl}/api/sessions/${sessionId}`, { method: "DELETE", headers: { Cookie: cookie } });

    if (!verifyResponse.ok || !verification.passed) {
      console.error(terminalOutput);
      console.error(verification.results);
      throw new Error(`Lesson smoke failed: ${testCase.id}`);
    }

    console.log(`PASS ${testCase.curriculumId} ${testCase.id}: ${verification.results.length} checks`);
  }

  await verifyLessonTransition();
} finally {
  await database.query("DELETE FROM users WHERE id = $1", [smokeUserId]);
  await database.end();
}

async function runCommands(sessionId: string, commands: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${socketUrl}/api/terminal?sessionId=${sessionId}`, {
      headers: { Cookie: cookie }
    });
    let output = "";
    let sent = false;
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Terminal smoke timed out"));
    }, 20_000);

    socket.on("message", (chunk) => {
      output += chunk.toString();
      if (!sent && output.includes("$ ")) {
        sent = true;
        socket.send(
          `${commands.join("\r")}\rprintf '__LINUX''_TUTOR_SMOKE_DONE__\\n'\r`
        );
        return;
      }

      if (sent && output.includes("__LINUX_TUTOR_SMOKE_DONE__")) {
        clearTimeout(timeout);
        socket.close();
        resolve(output);
      }
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function verifyLessonTransition() {
  const createResponse = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ lessonId: "primeiros-passos" })
  });
  const { sessionId } = (await createResponse.json()) as { sessionId: string };
  const socket = new WebSocket(`${socketUrl}/api/terminal?sessionId=${sessionId}`, {
    headers: { Cookie: cookie }
  });
  let transitionStarted = false;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Transition smoke timed out")), 8_000);

    socket.on("message", async (chunk) => {
      if (transitionStarted || !chunk.toString().includes("$ ")) return;
      transitionStarted = true;

      await fetch(`${baseUrl}/api/sessions/${sessionId}`, { method: "DELETE", headers: { Cookie: cookie } });
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("\u0000resize:120x36");
      }
      socket.close();
      clearTimeout(timeout);
      resolve();
    });

    socket.on("error", reject);
  });

  await new Promise((resolve) => setTimeout(resolve, 300));
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  if (!healthResponse.ok) throw new Error("Server stopped during lesson transition");

  console.log("PASS lesson-transition: server remains healthy");
}
