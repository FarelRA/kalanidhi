"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { ArrowRight, BookOpen, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { interestHref, pathHref, PUBLIC_ROUTES } from "@/lib/content/routes"
import type { PublicLessonSummary } from "@/lib/content/types"

import {
  LessonReaderView,
  lessonAccessLabels,
  lessonKindLabels,
} from "./lesson-reader-view"

/**
 * One curriculum row that opens the lesson reader. The body query is skipped
 * until the dialog opens, so the server-rendered path page stays light.
 */
export function LessonReader({
  pathSlug,
  moduleTitle,
  lesson,
}: {
  pathSlug: string
  moduleTitle: string
  lesson: PublicLessonSummary
}) {
  const [open, setOpen] = React.useState(false)
  const detail = useQuery(
    api.content.getPublicLesson,
    open ? { pathSlug, lessonId: lesson.id } : "skip",
  )
  const viewer = useQuery(api.access.getViewer, open ? {} : "skip")
  const recordProgress = useMutation(api.learning.recordProgress)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState<string | null>(null)
  const signedIn = Boolean(viewer)

  async function markProgress(
    enrollmentId: string,
    lessonId: string,
    state: "in_progress" | "completed",
  ) {
    setSaving(true)
    setSaved(null)
    try {
      await recordProgress({
        enrollmentId: enrollmentId as Id<"enrollments">,
        lessonId: lessonId as Id<"lessons">,
        state,
      })
      setSaved(
        state === "completed"
          ? "Pelajaran ditandai selesai."
          : "Pelajaran ditandai sedang dipelajari.",
      )
    } catch (error) {
      setSaved(error instanceof Error ? error.message : "Progres gagal disimpan.")
    } finally {
      setSaving(false)
    }
  }

  const signInHref = `${PUBLIC_ROUTES.signIn}?next=${encodeURIComponent(
    pathHref(pathSlug),
  )}`
  const interestLink = interestHref({ path: pathSlug, intent: "student" })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 text-left text-[11.5px] transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper-dark"
        >
          <span className="flex items-center gap-2 text-ink/80">
            <BookOpen
              className="size-3.5 shrink-0 text-copper-dark"
              aria-hidden="true"
            />
            {lesson.title}
          </span>
          <span className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-ink-muted">
            {lessonKindLabels[lesson.kind]}
            <span className="inline-flex items-center gap-1">
              <Lock className="size-2.5" aria-hidden="true" />
              {lessonAccessLabels[lesson.accessLevel]}
            </span>
            <ArrowRight
              className="size-3 text-copper-dark"
              aria-hidden="true"
            />
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="sr-only">
          {lesson.title} · {moduleTitle}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Pembaca pelajaran {lesson.title} pada modul {moduleTitle}.
        </DialogDescription>

        {detail === undefined ? (
          <div aria-busy="true" className="py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-copper-dark">
              {moduleTitle}
            </p>
            <p className="mt-2 font-heading text-[1.6rem] leading-tight">
              {lesson.title}
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
              Memuat isi pelajaran…
            </p>
          </div>
        ) : detail === null ? (
          <div className="py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-copper-dark">
              {moduleTitle}
            </p>
            <p className="mt-2 font-heading text-[1.6rem] leading-tight">
              {lesson.title}
            </p>
            <p className="mt-3 border border-ink/20 bg-cream px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
              Pelajaran ini belum tersedia untuk publik. Muat ulang halaman
              atau kembali ke daftar kurikulum.
            </p>
          </div>
        ) : (
          <LessonReaderView
            lesson={detail}
            actions={
              detail.status === "unlocked" && detail.enrollmentId ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-ink/15 pt-3">
                  <p className="text-[10.5px] text-ink-muted">
                    Status{" "}
                    {detail.progressState === "completed"
                      ? "selesai"
                      : detail.progressState === "in_progress"
                        ? "sedang dipelajari"
                        : "belum dimulai"}
                  </p>
                  {detail.progressState !== "completed" ? (
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() =>
                        void markProgress(
                          detail.enrollmentId as string,
                          detail.lessonId,
                          "completed",
                        )
                      }
                    >
                      Tandai selesai
                    </Button>
                  ) : null}
                  {detail.progressState === "not_started" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-ink/35"
                      disabled={saving}
                      onClick={() =>
                        void markProgress(
                          detail.enrollmentId as string,
                          detail.lessonId,
                          "in_progress",
                        )
                      }
                    >
                      Tandai sedang dipelajari
                    </Button>
                  ) : null}
                  {saved ? (
                    <p className="text-[10.5px] text-ink-soft">{saved}</p>
                  ) : null}
                </div>
              ) : detail.status === "locked" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {signedIn ? (
                    <Button asChild size="sm">
                      <Link href={interestLink}>
                        Daftar minat kelas ini
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link href={signInHref}>
                        Masuk untuk membuka
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-ink/35"
                  >
                    <Link
                      href={
                        signedIn ? PUBLIC_ROUTES.learning : interestLink
                      }
                    >
                      {signedIn ? "Buka ruang belajar" : "Daftar minat"}
                    </Link>
                  </Button>
                </div>
              ) : null
            }
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
