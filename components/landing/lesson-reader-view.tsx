import type { ReactNode } from "react"
import { Clock, Lock, BookOpen } from "lucide-react"

import type {
  PublicLessonAccessLevel,
  PublicLessonDetail,
  PublicLessonKind,
  PublicLessonMedia,
} from "@/lib/content/types"

export const lessonKindLabels: Record<PublicLessonKind, string> = {
  text: "Bacaan",
  video: "Video",
  audio: "Audio",
  file: "Berkas",
  practice: "Praktik",
}

export const lessonAccessLabels: Record<PublicLessonAccessLevel, string> = {
  public: "Publik",
  enrolled: "Peserta",
  certified: "Tersertifikasi",
}

/** Paragraphs keep the author's blank-line breaks; single breaks survive too. */
export function lessonParagraphs(body: string): string[] {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export function LessonBody({ body }: { body: string }) {
  const paragraphs = lessonParagraphs(body)
  if (paragraphs.length === 0) {
    return (
      <p className="mt-4 border border-ink/20 bg-cream px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
        Isi pelajaran ini belum ditulis. Pengajar akan melengkapinya sebelum
        kelas dimulai.
      </p>
    )
  }

  return (
    <div className="body-copy mt-4 space-y-3 font-sans">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  )
}

export function LessonMediaList({ media }: { media: PublicLessonMedia[] }) {
  const images = media.filter((item) => item.kind === "image")
  if (images.length === 0) return null

  return (
    <div className="mt-5 space-y-4">
      {images.map((image) => (
        <figure key={image.url}>
          {/* Convex storage serves the optimised file; the global Next config
              bypasses the image optimiser for the same reason. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            className="h-auto w-full border border-ink/25 bg-cream object-cover"
          />
          {image.caption ? (
            <figcaption className="mt-1.5 text-[10.5px] leading-relaxed text-ink-muted">
              {image.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  )
}

/**
 * Presentational reader. The client wrapper owns the dialog and the query so
 * this can be rendered (and tested) without hooks or a Convex client.
 */
export function LessonReaderView({
  lesson,
  actions,
}: {
  lesson: PublicLessonDetail
  actions?: ReactNode
}) {
  return (
    <div className="font-sans">
      <p className="pr-8 text-[9px] font-bold uppercase tracking-[0.12em] text-copper-dark">
        {lesson.moduleTitle}
      </p>
      <h2 className="mt-2 font-heading text-[1.6rem] leading-[1.08] tracking-[-0.01em] text-ink sm:text-[1.9rem]">
        {lesson.title}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-ink/15 py-2 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3" aria-hidden="true" />
          {lesson.estimatedMinutes} menit
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="size-3 text-copper-dark" aria-hidden="true" />
          {lessonKindLabels[lesson.kind]}
        </span>
        <span className="stamp stamp-soft border-ink/35 text-ink-soft">
          <Lock className="size-2.5" aria-hidden="true" />
          {lessonAccessLabels[lesson.accessLevel]}
        </span>
      </div>

      {lesson.status === "unlocked" ? (
        <>
          <LessonBody body={lesson.body} />
          <LessonMediaList media={lesson.media} />
        </>
      ) : (
        <div className="mt-4">
          {lesson.teaser ? (
            <p className="border-l-2 border-copper/60 pl-3 text-[13px] leading-relaxed text-ink-soft">
              {lesson.teaser}
            </p>
          ) : null}
          <div className="mt-4 border border-ink/20 bg-cream p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-copper-dark">
              Pelajaran belum terbuka
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
              {lesson.reason === "certified"
                ? "Pelajaran ini terbuka untuk peserta yang sudah memiliki sertifikat platform pada kelas ini."
                : "Pelajaran ini terbuka untuk peserta yang terdaftar pada kelas ini."}
            </p>
            {actions ? <div className="mt-3">{actions}</div> : null}
          </div>
        </div>
      )}
    </div>
  )
}
