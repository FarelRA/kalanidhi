import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { LessonReaderView } from "@/components/landing/lesson-reader-view"
import {
  lessonTeaser,
  resolveLessonAccess,
} from "@/lib/content/lesson-access"
import type { PublicLessonDetail } from "@/lib/content/types"

const anonymous = { signedIn: false, enrolled: false, certified: false }
const member = { signedIn: true, enrolled: false, certified: false }
const enrolledViewer = { signedIn: true, enrolled: true, certified: false }
const certifiedViewer = { signedIn: true, enrolled: false, certified: true }

describe("public lesson access rules", () => {
  it("opens public lessons to anonymous viewers", () => {
    expect(resolveLessonAccess("public", anonymous)).toEqual({
      unlocked: true,
      reason: null,
    })
  })

  it("locks enrolled and certified lessons for anonymous viewers", () => {
    expect(resolveLessonAccess("enrolled", anonymous)).toEqual({
      unlocked: false,
      reason: "enrolled",
    })
    expect(resolveLessonAccess("certified", anonymous)).toEqual({
      unlocked: false,
      reason: "certified",
    })
  })

  it("opens enrolled lessons only with an enrollment in that path", () => {
    expect(resolveLessonAccess("enrolled", member)).toEqual({
      unlocked: false,
      reason: "enrolled",
    })
    expect(resolveLessonAccess("enrolled", enrolledViewer)).toEqual({
      unlocked: true,
      reason: null,
    })
  })

  it("opens certified lessons only with an issued certificate", () => {
    expect(resolveLessonAccess("certified", member)).toEqual({
      unlocked: false,
      reason: "certified",
    })
    // An enrollment alone does not satisfy a certified lesson.
    expect(resolveLessonAccess("certified", enrolledViewer)).toEqual({
      unlocked: false,
      reason: "certified",
    })
    expect(resolveLessonAccess("certified", certifiedViewer)).toEqual({
      unlocked: true,
      reason: null,
    })
  })

  it("keeps the teaser short and never returns an empty tail", () => {
    const body = "Kata ".repeat(120).trim()
    const teaser = lessonTeaser(body, 80)
    expect(teaser.endsWith("…")).toBe(true)
    expect(teaser.length).toBeLessThanOrEqual(81)
    expect(lessonTeaser("   \n\n  ")).toBe("")
  })
})

const unlockedLesson: PublicLessonDetail = {
  status: "unlocked",
  lessonId: "lesson-1",
  title: "Mola: desain dengan pensil",
  kind: "text",
  estimatedMinutes: 20,
  accessLevel: "public",
  moduleTitle: "Desain dan motif",
  media: [
    {
      url: "https://example.test/mola.jpg",
      alt: "Kain mola bergaris pensil tipis",
      caption: "Contoh mola dari Giriloyo",
      kind: "image",
    },
  ],
  body: "Paragraf pertama menjelaskan garis pensil.\n\nParagraf kedua menjelaskan lilin panas.",
}

describe("lesson reader rendering", () => {
  it("renders the body and media, not only the lesson title", () => {
    const html = renderToStaticMarkup(
      createElement(LessonReaderView, { lesson: unlockedLesson }),
    )

    expect(html).toContain("Mola: desain dengan pensil")
    expect(html).toContain("Paragraf pertama menjelaskan garis pensil.")
    expect(html).toContain("Paragraf kedua menjelaskan lilin panas.")
    expect(html).toContain("<img")
    expect(html).toContain('alt="Kain mola bergaris pensil tipis"')
    expect(html).toContain("Contoh mola dari Giriloyo")
    expect(html).toContain("20 menit")
  })

  it("renders a locked explanation and teaser without the full body", () => {
    const locked: PublicLessonDetail = {
      ...unlockedLesson,
      status: "locked",
      reason: "enrolled",
      teaser: "Paragraf pertama menjelaskan garis pensil.",
      accessLevel: "enrolled",
    }
    const html = renderToStaticMarkup(
      createElement(LessonReaderView, { lesson: locked }),
    )

    expect(html).toContain("Pelajaran belum terbuka")
    expect(html).toContain("terdaftar pada kelas ini")
    expect(html).toContain("Paragraf pertama menjelaskan garis pensil.")
    expect(html).not.toContain("Paragraf kedua menjelaskan lilin panas.")
  })

  it("falls back gracefully when an unlocked body is empty", () => {
    const empty: PublicLessonDetail = { ...unlockedLesson, body: "   " }
    const html = renderToStaticMarkup(
      createElement(LessonReaderView, { lesson: empty }),
    )

    expect(html).toContain("Isi pelajaran ini belum ditulis")
    expect(html).not.toContain("Paragraf pertama")
  })
})
