import { WebSocket } from "ws";

import { loadLessons } from "./lessonRepository.js";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4173";
const socketUrl = baseUrl.replace(/^http/, "ws");

interface VerificationResponse {
  passed: boolean;
  results: Array<{ label: string; passed: boolean; message: string }>;
}

const cases = await loadLessons();

for (const testCase of cases) {
  const createResponse = await fetch(`${baseUrl}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId: testCase.id })
  });

  if (!createResponse.ok) {
    throw new Error(`Failed to create ${testCase.id}: ${await createResponse.text()}`);
  }

  const { sessionId } = (await createResponse.json()) as { sessionId: string };
  const terminalOutput = await runCommands(sessionId, testCase.smokeCommands);
  const verifyResponse = await fetch(`${baseUrl}/api/sessions/${sessionId}/verify`, {
    method: "POST"
  });
  const verification = (await verifyResponse.json()) as VerificationResponse;

  await fetch(`${baseUrl}/api/sessions/${sessionId}`, { method: "DELETE" });

  if (!verifyResponse.ok || !verification.passed) {
    console.error(terminalOutput);
    console.error(verification.results);
    throw new Error(`Lesson smoke failed: ${testCase.id}`);
  }

  console.log(`PASS ${testCase.curriculumId} ${testCase.id}: ${verification.results.length} checks`);
}

await verifyLessonTransition();

async function runCommands(sessionId: string, commands: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${socketUrl}/api/terminal?sessionId=${sessionId}`);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId: "primeiros-passos" })
  });
  const { sessionId } = (await createResponse.json()) as { sessionId: string };
  const socket = new WebSocket(`${socketUrl}/api/terminal?sessionId=${sessionId}`);
  let transitionStarted = false;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Transition smoke timed out")), 8_000);

    socket.on("message", async (chunk) => {
      if (transitionStarted || !chunk.toString().includes("$ ")) return;
      transitionStarted = true;

      await fetch(`${baseUrl}/api/sessions/${sessionId}`, { method: "DELETE" });
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
