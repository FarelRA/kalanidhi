import type { LearningPath } from "./types"

/**
 * Catalog fields and learning paths are separate tables. A field filter is a
 * best-effort text match over the path's own copy; when nothing matches the
 * page shows an honest empty state instead of a fabricated path.
 */
export function pathMatchesField(
  path: LearningPath,
  fieldName: string,
): boolean {
  const tokens = fieldName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
  if (tokens.length === 0) return false

  const haystack = [
    path.slug,
    path.title,
    path.subtitle,
    path.outcome,
    path.region,
    ...path.tags,
  ]
    .join(" ")
    .toLowerCase()

  return tokens.some((token) => haystack.includes(token))
}
