import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type {
  LessonCheck,
  LessonDefinition,
  LessonExample
} from "../shared/lessons.js";

const defaultLessonsDirectory = path.resolve(process.cwd(), "content/lessons");

export async function loadLessons(): Promise<LessonDefinition[]> {
  const lessonsDirectory = process.env.LESSONS_PATH ?? defaultLessonsDirectory;
  const entries = await readdir(lessonsDirectory, { withFileTypes: true });
  const lessonDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (lessonDirectories.length === 0) {
    throw new Error(`Nenhuma lição encontrada em ${lessonsDirectory}`);
  }

  const lessons = await Promise.all(
    lessonDirectories.map(async (directoryName) => {
      const lessonFile = path.join(lessonsDirectory, directoryName, "lesson.json");
      let parsed: unknown;

      try {
        parsed = JSON.parse(await readFile(lessonFile, "utf8"));
      } catch (error) {
        throw new Error(`Não foi possível ler ${lessonFile}: ${errorMessage(error)}`);
      }

      const lesson = validateLesson(parsed, lessonFile);
      if (lesson.id !== directoryName) {
        throw new Error(
          `${lessonFile}: o id "${lesson.id}" deve ser igual ao diretório "${directoryName}"`
        );
      }
      return lesson;
    })
  );

  assertUnique(lessons, "id", (lesson) => lesson.id);
  assertUnique(lessons, "curriculumId", (lesson) => lesson.curriculumId);
  assertUnique(lessons, "order", (lesson) => String(lesson.order));

  const knownIds = new Set(lessons.map((lesson) => lesson.id));
  for (const lesson of lessons) {
    for (const prerequisite of lesson.prerequisites) {
      if (!knownIds.has(prerequisite)) {
        throw new Error(
          `${lesson.id}: pré-requisito inexistente "${prerequisite}"`
        );
      }
    }
  }

  return lessons.sort((left, right) => left.order - right.order);
}

function validateLesson(value: unknown, source: string): LessonDefinition {
  const lesson = asRecord(value, source);
  const schemaVersion = requiredNumber(lesson, "schemaVersion", source);
  if (schemaVersion !== 1) {
    throw new Error(`${source}: schemaVersion deve ser 1`);
  }

  const order = requiredNumber(lesson, "order", source);
  if (!Number.isInteger(order) || order < 1) {
    throw new Error(`${source}: order deve ser um inteiro positivo`);
  }

  const level = requiredString(lesson, "level", source);
  if (!new Set(["iniciante", "intermediario", "avancado"]).has(level)) {
    throw new Error(`${source}: level inválido "${level}"`);
  }

  const examples = requiredRecordArray(lesson, "examples", source).map(
    (example, index): LessonExample => ({
      command: requiredString(example, "command", `${source}.examples[${index}]`),
      explanation: requiredString(example, "explanation", `${source}.examples[${index}]`)
    })
  );

  const checks = requiredRecordArray(lesson, "checks", source).map(
    (check, index): LessonCheck => ({
      id: requiredString(check, "id", `${source}.checks[${index}]`),
      label: requiredString(check, "label", `${source}.checks[${index}]`),
      command: requiredString(check, "command", `${source}.checks[${index}]`),
      failureMessage: requiredString(
        check,
        "failureMessage",
        `${source}.checks[${index}]`
      )
    })
  );

  if (examples.length === 0 || checks.length === 0) {
    throw new Error(`${source}: examples e checks não podem estar vazios`);
  }

  const smokeCommands = requiredStringArray(lesson, "smokeCommands", source);
  if (smokeCommands.length === 0) {
    throw new Error(`${source}: smokeCommands não pode estar vazio`);
  }

  return {
    schemaVersion: 1,
    id: requiredString(lesson, "id", source),
    curriculumId: requiredString(lesson, "curriculumId", source),
    moduleId: requiredString(lesson, "moduleId", source),
    level: level as LessonDefinition["level"],
    order,
    prerequisites: requiredStringArray(lesson, "prerequisites", source),
    eyebrow: requiredString(lesson, "eyebrow", source),
    title: requiredString(lesson, "title", source),
    summary: requiredString(lesson, "summary", source),
    duration: requiredString(lesson, "duration", source),
    objective: requiredString(lesson, "objective", source),
    concepts: requiredStringArray(lesson, "concepts", source),
    examples,
    taskIntro: requiredString(lesson, "taskIntro", source),
    steps: requiredStringArray(lesson, "steps", source),
    hints: requiredStringArray(lesson, "hints", source),
    startingDirectory: requiredAbsolutePath(lesson, "startingDirectory", source),
    setupCommand: requiredString(lesson, "setupCommand", source),
    checks,
    smokeCommands
  };
}

function asRecord(value: unknown, source: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${source}: o documento deve ser um objeto JSON`);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string, source: string) {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${source}: ${key} deve ser uma string não vazia`);
  }
  return value;
}

function requiredAbsolutePath(
  record: Record<string, unknown>,
  key: string,
  source: string
) {
  const value = requiredString(record, key, source);
  if (!value.startsWith("/home/aluno")) {
    throw new Error(`${source}: ${key} deve estar dentro de /home/aluno`);
  }
  return value;
}

function requiredNumber(record: Record<string, unknown>, key: string, source: string) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${source}: ${key} deve ser um número`);
  }
  return value;
}

function requiredStringArray(
  record: Record<string, unknown>,
  key: string,
  source: string
) {
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`${source}: ${key} deve ser uma lista de strings não vazias`);
  }
  return value as string[];
}

function requiredRecordArray(
  record: Record<string, unknown>,
  key: string,
  source: string
) {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`${source}: ${key} deve ser uma lista`);
  }
  return value.map((item, index) => asRecord(item, `${source}.${key}[${index}]`));
}

function assertUnique(
  lessons: LessonDefinition[],
  field: string,
  selector: (lesson: LessonDefinition) => string
) {
  const values = new Set<string>();
  for (const lesson of lessons) {
    const value = selector(lesson);
    if (values.has(value)) {
      throw new Error(`Valor duplicado em ${field}: ${value}`);
    }
    values.add(value);
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
