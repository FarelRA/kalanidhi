import type { PublicLessonAccessLevel } from "./types"

/**
 * What the viewer has for one path. Kept as plain booleans so the same rule
 * runs in Convex, in the UI, and in tests without touching Convex documents.
 */
export type LessonAccessFacts = {
  signedIn: boolean
  /** An active or completed enrollment in this path, in any cohort. */
  enrolled: boolean
  /** An issued certificate for this path. */
  certified: boolean
}

export type LessonAccessDecision =
  | { unlocked: true; reason: null }
  | {
      unlocked: false
      reason: Exclude<PublicLessonAccessLevel, "public">
    }

/**
 * Access rules for a public lesson reader:
 * - `public` is open to everyone.
 * - `enrolled` needs a signed-in viewer with an enrollment in the path.
 * - `certified` needs a signed-in viewer with an issued certificate.
 *
 * Anonymous viewers are locked out of every non-public level.
 */
export function resolveLessonAccess(
  accessLevel: PublicLessonAccessLevel,
  facts: LessonAccessFacts,
): LessonAccessDecision {
  if (accessLevel === "public") {
    return { unlocked: true, reason: null }
  }

  if (!facts.signedIn) {
    return { unlocked: false, reason: accessLevel }
  }

  if (accessLevel === "enrolled") {
    return facts.enrolled
      ? { unlocked: true, reason: null }
      : { unlocked: false, reason: "enrolled" }
  }

  return facts.certified
    ? { unlocked: true, reason: null }
    : { unlocked: false, reason: "certified" }
}

/** First readable excerpt of a locked lesson, never the full body. */
export function lessonTeaser(body: string, limit = 180): string {
  const flattened = body.replace(/\s+/g, " ").trim()
  if (!flattened) return ""
  if (flattened.length <= limit) return flattened

  const cut = flattened.slice(0, limit)
  const lastSpace = cut.lastIndexOf(" ")
  const trimmed = (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trim()
  return `${trimmed}…`
}
