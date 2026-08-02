export interface LessonExample {
  command: string;
  explanation: string;
}

export interface Lesson {
  id: string;
  order: number;
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
  checkCount: number;
}

export interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  message: string;
}

export interface VerificationResult {
  passed: boolean;
  results: CheckResult[];
}
