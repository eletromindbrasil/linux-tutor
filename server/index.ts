import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Docker from "dockerode";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";

import { publicLesson, type LessonDefinition } from "../shared/lessons.js";
import { loadLessons } from "./lessonRepository.js";

const port = Number(process.env.PORT ?? 4173);
const socketPath = process.env.DOCKER_SOCKET ?? "/var/run/docker.sock";
const sessionImage = process.env.SESSION_IMAGE ?? "linux-tutor-sandbox:local";
const docker = new Docker({ socketPath });
const app = express();
const server = createServer(app);
const webSocketServer = new WebSocketServer({ noServer: true });
const currentFile = fileURLToPath(import.meta.url);
const publicDirectory = path.resolve(path.dirname(currentFile), "../../dist");

interface LearningSession {
  id: string;
  lesson: LessonDefinition;
  container: Docker.Container;
  createdAt: number;
  lastActivityAt: number;
}

const sessions = new Map<string, LearningSession>();

app.use(express.json({ limit: "16kb" }));

app.use((request, response, next) => {
  const origin = request.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):4173$/.test(origin)) {
    response.status(403).json({ error: "Origem não permitida." });
    return;
  }
  next();
});

app.get("/api/health", async (_request, response) => {
  try {
    await docker.ping();
    response.json({ ok: true, docker: "ready" });
  } catch {
    response.status(503).json({ ok: false, docker: "unavailable" });
  }
});

app.get("/api/lessons", async (_request, response) => {
  try {
    const lessons = await loadLessons();
    response.json({ lessons: lessons.map(publicLesson) });
  } catch (error) {
    console.error("Failed to load lessons", error);
    response.status(500).json({ error: "O catálogo de lições é inválido." });
  }
});

app.post("/api/sessions", async (request, response) => {
  const lessons = await loadLessons();
  const lesson = lessons.find((candidate) => candidate.id === request.body?.lessonId);
  if (!lesson) {
    response.status(404).json({ error: "Lição não encontrada." });
    return;
  }

  try {
    const learningSession = await createLearningSession(lesson);
    response.status(201).json({
      sessionId: learningSession.id,
      lessonId: lesson.id,
      status: "ready"
    });
  } catch (error) {
    console.error("Failed to create learning session", error);
    response.status(500).json({ error: "Não foi possível preparar o ambiente Linux." });
  }
});

app.post("/api/sessions/:sessionId/verify", async (request, response) => {
  const learningSession = sessions.get(request.params.sessionId);
  if (!learningSession) {
    response.status(404).json({ error: "Esta sessão não está mais disponível." });
    return;
  }

  learningSession.lastActivityAt = Date.now();
  const results = [];

  for (const check of learningSession.lesson.checks) {
    const execution = await executeInContainer(learningSession.container, check.command);
    results.push({
      id: check.id,
      label: check.label,
      passed: execution.exitCode === 0,
      message: execution.exitCode === 0 ? "Concluído" : check.failureMessage
    });
  }

  response.json({
    passed: results.every((result) => result.passed),
    results
  });
});

app.delete("/api/sessions/:sessionId", async (request, response) => {
  await destroySession(request.params.sessionId);
  response.status(204).end();
});

app.use(express.static(publicDirectory));
app.get("/{*path}", (_request, response) => {
  response.sendFile(path.join(publicDirectory, "index.html"));
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const sessionId = url.searchParams.get("sessionId");

  if (url.pathname !== "/api/terminal" || !sessionId || !sessions.has(sessionId)) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
    webSocketServer.emit("connection", webSocket, request, sessionId);
  });
});

webSocketServer.on(
  "connection",
  async (webSocket: WebSocket, _request: IncomingMessage, sessionId: string) => {
  const learningSession = sessions.get(sessionId);
  if (!learningSession) {
    webSocket.close(1008, "Sessão inválida");
    return;
  }

  learningSession.lastActivityAt = Date.now();

  try {
    const terminalExec = await learningSession.container.exec({
      Cmd: ["bash", "--noprofile", "--norc", "-i"],
      User: "aluno",
      WorkingDir: learningSession.lesson.startingDirectory,
      Env: [
        "TERM=xterm-256color",
        "HISTFILE=/home/aluno/.lesson_history",
        "HISTCONTROL=",
        "HISTSIZE=1000",
        "PROMPT_COMMAND=history -a",
        "PAGER=cat",
        "MANPAGER=cat",
        "PS1=\\[\\e[38;5;114m\\]aluno@linuxlab\\[\\e[0m\\]:\\[\\e[38;5;153m\\]\\w\\[\\e[0m\\]$ "
      ],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });

    const stream = await terminalExec.start({ hijack: true, stdin: true });

    stream.on("data", (chunk: Buffer) => {
      if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(chunk);
      }
    });

    stream.on("end", () => {
      if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.close(1000, "Terminal encerrado");
      }
    });

    webSocket.on("message", (payload) => {
      learningSession.lastActivityAt = Date.now();
      const data = payload.toString();

      if (data.startsWith("\u0000resize:")) {
        const [columns, rows] = data.slice(8).split("x").map(Number);
        if (Number.isFinite(columns) && Number.isFinite(rows)) {
          void terminalExec.resize({ w: columns, h: rows }).catch(() => {
            // A resize can arrive while the previous lesson container is being removed.
          });
        }
        return;
      }

      stream.write(payload);
    });

    stream.on("error", () => {
      if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.close(1000, "Terminal encerrado");
      }
    });

    webSocket.on("close", () => {
      if (!stream.destroyed) stream.end();
    });
  } catch (error) {
    console.error("Terminal connection failed", error);
    webSocket.close(1011, "Falha ao abrir o terminal");
  }
  }
);

async function createLearningSession(lesson: LessonDefinition): Promise<LearningSession> {
  await docker.getImage(sessionImage).inspect();

  const id = randomUUID();
  const container = await docker.createContainer({
    Image: sessionImage,
    name: `linux-tutor-${id}`,
    User: "aluno",
    WorkingDir: "/home/aluno",
    Cmd: ["sleep", "infinity"],
    Labels: {
      "linux-tutor.session": "true",
      "linux-tutor.lesson": lesson.id
    },
    HostConfig: {
      AutoRemove: false,
      NetworkMode: "none",
      Memory: 128 * 1024 * 1024,
      MemorySwap: 128 * 1024 * 1024,
      NanoCpus: 500_000_000,
      PidsLimit: 64,
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges:true"],
      Tmpfs: {
        "/tmp": "rw,noexec,nosuid,size=16m,uid=1000,gid=1000"
      }
    }
  });

  try {
    await container.start();
    const setup = await executeInContainer(container, lesson.setupCommand);
    if (setup.exitCode !== 0) {
      throw new Error(`Lesson setup failed: ${setup.output}`);
    }
  } catch (error) {
    await container.remove({ force: true }).catch(() => undefined);
    throw error;
  }

  const learningSession: LearningSession = {
    id,
    lesson,
    container,
    createdAt: Date.now(),
    lastActivityAt: Date.now()
  };

  sessions.set(id, learningSession);
  return learningSession;
}

async function executeInContainer(container: Docker.Container, command: string) {
  const execution = await container.exec({
    Cmd: ["bash", "-lc", command],
    User: "aluno",
    WorkingDir: "/home/aluno",
    AttachStdout: true,
    AttachStderr: true,
    Tty: true
  });
  const stream = await execution.start({ hijack: true, stdin: false });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const inspection = await execution.inspect();
  return {
    exitCode: inspection.ExitCode ?? 1,
    output: Buffer.concat(chunks).toString("utf8")
  };
}

async function destroySession(sessionId: string) {
  const learningSession = sessions.get(sessionId);
  sessions.delete(sessionId);
  if (!learningSession) return;

  await learningSession.container.remove({ force: true }).catch((error) => {
    console.error(`Failed to remove session ${sessionId}`, error);
  });
}

async function removeOrphanContainers() {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: ["linux-tutor.session=true"] }
  });

  await Promise.all(
    containers.map((containerInfo) =>
      docker.getContainer(containerInfo.Id).remove({ force: true }).catch(() => undefined)
    )
  );
}

const cleanupTimer = setInterval(() => {
  const expiry = Date.now() - 45 * 60 * 1000;
  for (const learningSession of sessions.values()) {
    if (learningSession.lastActivityAt < expiry) {
      void destroySession(learningSession.id);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();

async function shutdown() {
  clearInterval(cleanupTimer);
  await Promise.all([...sessions.keys()].map(destroySession));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

try {
  await docker.ping();
  const availableLessons = await loadLessons();
  await removeOrphanContainers();
  server.listen(port, "0.0.0.0", () => {
    console.log(
      `Linux Tutor ready at http://127.0.0.1:${port} with ${availableLessons.length} lessons`
    );
  });
} catch (error) {
  console.error("Docker Engine is required to start Linux Tutor", error);
  process.exit(1);
}
