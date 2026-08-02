import { loadLessons } from "./lessonRepository.js";

try {
  const lessons = await loadLessons();
  for (const lesson of lessons) {
    console.log(`OK ${lesson.curriculumId} ${lesson.id} (${lesson.checks.length} checks)`);
  }
  console.log(`Catálogo válido: ${lessons.length} lições`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
