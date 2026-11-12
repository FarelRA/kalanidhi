import type { PublicWorkView } from "@/lib/commerce/types"
import type { LearningPath, PublicTeacherDetail } from "@/lib/content/types"
import { consultHref, enrollHref, buyHref } from "@/lib/content/routes"

export type MinatParams = {
  path?: string
  work?: string
  teacher?: string
  intent?: string
  interest?: string
}

export type MinatResolution =
  | { kind: "redirect"; href: string }
  | { kind: "notFound" }
  | { kind: "chooser"; teacher: PublicTeacherDetail }
  | { kind: "catalog" }

const CONSULT_INTENTS = new Set(["consultation", "notify", "institution"])

/**
 * Pure routing decision for `/minat`. The page supplies Convex data so this
 * stays testable without rendering a server component.
 */
export function resolveMinat(input: {
  params: MinatParams
  paths: LearningPath[]
  works: PublicWorkView[]
  teacher: PublicTeacherDetail | null
}): MinatResolution {
  const { params, paths, works, teacher } = input
  const pathSlug = params.path
  const workSlug = params.work
  const teacherSlug = params.teacher

  const path = pathSlug
    ? paths.find((item) => item.slug === pathSlug)
    : undefined
  const work = workSlug
    ? works.find((item) => item.slug === workSlug)
    : undefined

  if (pathSlug && !path) return { kind: "notFound" }
  if (workSlug && !work) return { kind: "notFound" }
  if (teacherSlug && !teacher) return { kind: "notFound" }

  if (params.intent && CONSULT_INTENTS.has(params.intent)) {
    return {
      kind: "redirect",
      href: consultHref({
        path: pathSlug,
        work: workSlug,
        teacher: teacherSlug,
        intent: params.intent as "consultation" | "notify" | "institution",
        interest: params.interest,
      }),
    }
  }

  if (pathSlug) {
    return { kind: "redirect", href: enrollHref(pathSlug) }
  }

  if (workSlug) {
    return { kind: "redirect", href: buyHref(workSlug) }
  }

  if (teacherSlug && teacher) {
    if (teacher.paths.length === 1) {
      return {
        kind: "redirect",
        href: enrollHref(teacher.paths[0]!.slug),
      }
    }
    if (teacher.paths.length > 1) {
      return { kind: "chooser", teacher }
    }
    return {
      kind: "redirect",
      href: consultHref({ teacher: teacherSlug }),
    }
  }

  return { kind: "catalog" }
}
