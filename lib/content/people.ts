/**
 * Public visibility helpers for people. A path payload can carry a teacher
 * name even when that teacher's profile is not published yet; the public pages
 * only keep a name that the published teacher list actually contains.
 */

type NamedTeacher = { name: string }

export function publishedTeacherNames(
  teachers: readonly NamedTeacher[],
): string[] {
  return teachers.map((teacher) => teacher.name.trim()).filter(Boolean)
}

export function publishedTeacherName(
  teacher: string | null | undefined,
  publishedNames: Iterable<string>,
): string | null {
  const name = teacher?.trim()
  if (!name) return null
  for (const candidate of publishedNames) {
    if (candidate.trim() === name) return name
  }
  return null
}
