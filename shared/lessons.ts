export interface LessonExample {
  command: string;
  explanation: string;
}

export interface LessonCheck {
  id: string;
  label: string;
  command: string;
  failureMessage: string;
}

export interface LessonDefinition {
  schemaVersion: 1;
  id: string;
  curriculumId: string;
  moduleId: string;
  level: "iniciante" | "intermediario" | "avancado";
  order: number;
  prerequisites: string[];
  eyebrow: string;
  title: string;
  summary: string;
  duration: string;
  objective: string;
  concepts: string[];
  examples: LessonExample[];
  taskIntro: string;
  steps: string[];
  hints: string[];
  startingDirectory: string;
  setupCommand: string;
  checks: LessonCheck[];
  smokeCommands: string[];
}

export function publicLesson(lesson: LessonDefinition) {
  const {
    setupCommand: _setupCommand,
    checks,
    smokeCommands: _smokeCommands,
    schemaVersion: _schemaVersion,
    ...content
  } = lesson;

  return {
    ...content,
    checkCount: checks.length
  };
}
