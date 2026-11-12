import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Lock,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getAuthServer, isAuthConfigured } from "@/lib/auth-server"
import { buildPageMetadata } from "@/lib/content/metadata"
import {
  interestHref,
  pathHref,
  PUBLIC_ROUTES,
} from "@/lib/content/routes"
import type {
  PublicCohortSummary,
  PublicLessonSummary,
} from "@/lib/content/types"
import { getPublicPath, getSiteData } from "@/lib/convex/server"
import { formatIDR } from "@/lib/format"

export const instant = false

type Params = { slug: string }

const cohortLabels: Record<PublicCohortSummary["status"], string> = {
  draft: "Draf",
  enrolling: "Pendaftaran dibuka",
  active: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
}

const lessonKindLabels: Record<PublicLessonSummary["kind"], string> = {
  text: "Bacaan",
  video: "Video",
  audio: "Audio",
  file: "Berkas",
  practice: "Praktik",
}

const accessLabels: Record<PublicLessonSummary["accessLevel"], string> = {
  public: "Publik",
  enrolled: "Peserta",
  certified: "Tersertifikasi",
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

async function isSignedIn(): Promise<boolean> {
  if (!isAuthConfigured()) return false
  try {
    return await getAuthServer().isAuthenticated()
  } catch (error) {
    console.error("[jalur] Could not resolve auth session.", error)
    return false
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const path = await getPublicPath(slug)
  if (!path) {
    return { title: "Jalur tidak ditemukan", robots: { index: false } }
  }
  return buildPageMetadata(pathHref(path.slug), {
    title: path.title,
    description: path.subtitle,
    alternates: { canonical: pathHref(path.slug) },
    openGraph: {
      title: path.title,
      description: path.subtitle,
      ...(path.image ? { images: [path.image] } : {}),
    },
  })
}

export default async function PathDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const [path, data, signedIn] = await Promise.all([
    getPublicPath(slug),
    getSiteData(),
    isSignedIn(),
  ])
  if (!path) notFound()

  const copy = data.sections.paths
  const primaryHref = path.comingSoon
    ? interestHref({ path: path.slug, intent: "notify" })
    : signedIn
      ? PUBLIC_ROUTES.learning
      : `${PUBLIC_ROUTES.signIn}?next=${encodeURIComponent(PUBLIC_ROUTES.learning)}`
  const primaryLabel = path.comingSoon
    ? copy.plannedCta
    : signedIn
      ? "Mulai belajar"
      : "Masuk untuk mendaftar"

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <nav aria-label="Remah roti" className="text-[10px] text-ink-muted">
          <Link href={PUBLIC_ROUTES.home} className="hover:text-copper-dark">
            Beranda
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href={PUBLIC_ROUTES.paths} className="hover:text-copper-dark">
            Jalur
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{path.title}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <figure className="lg:col-span-7">
            <div className="relative aspect-[4/3] overflow-hidden border-2 border-ink bg-panel shadow-[5px_5px_0_var(--teak)]">
              <Image
                src={path.image}
                alt={`Jalur ${path.title}`}
                fill
                priority
                sizes="(min-width: 1024px) 640px, 92vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-muted">
              <span>{path.region}</span>
              <span className="stamp stamp-soft border-ink/35 text-ink-soft">
                {path.code}
              </span>
            </figcaption>
          </figure>

          <div className="lg:col-span-5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
              {path.teacherRole} · {path.level}
            </p>
            <h1 className="heading-section mt-3 text-[clamp(2rem,4vw,3rem)]">
              {path.title}
            </h1>
            <p className="body-copy mt-4">{path.subtitle}</p>

            <dl className="mt-6 grid grid-cols-2 gap-3 border-y border-ink/15 py-4 text-[11.5px]">
              {[
                ["Pengajar", path.teacher],
                ["Daerah", path.region],
                ["Level", path.level],
                [
                  "Isi",
                  path.comingSoon
                    ? copy.curriculumPending
                    : `${path.modules} modul · ${path.lessons} pelajaran · ${path.weeks} pekan`,
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    {label}
                  </dt>
                  <dd className="mt-1 font-semibold leading-snug text-ink/85">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                {path.comingSoon ? copy.statusLabel : copy.priceLabel}
              </p>
              <p className="mt-1 font-heading text-[2rem] leading-none">
                {path.price ? formatIDR(path.price) : path.priceLabel}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-ink/35">
                <Link
                  href={interestHref({
                    path: path.slug,
                    intent: path.comingSoon ? "notify" : "student",
                  })}
                >
                  {copy.openCta}
                </Link>
              </Button>
            </div>
            {!signedIn && !path.comingSoon ? (
              <p className="mt-2 text-[10.5px] leading-relaxed text-ink-muted">
                Masuk dengan akun peserta untuk memulai jalur ini. Belum punya
                akun?{" "}
                <Link
                  href={`${PUBLIC_ROUTES.signUp}?next=${encodeURIComponent(PUBLIC_ROUTES.learning)}`}
                  className="font-semibold text-copper-dark underline underline-offset-2"
                >
                  Daftar peserta
                </Link>
                .
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-8 lg:col-span-7">
            <section aria-labelledby="outcome-title">
              <h2 id="outcome-title" className="font-heading text-[1.45rem]">
                Hasil akhir
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                {path.outcome}
              </p>
            </section>

            <section aria-labelledby="includes-title">
              <h2 id="includes-title" className="font-heading text-[1.45rem]">
                {copy.includesLabel}
              </h2>
              <ul className="mt-3 space-y-2">
                {path.includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-soft"
                  >
                    <Check
                      className="mt-0.5 size-3.5 shrink-0 text-copper-dark"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="curriculum-title">
              <h2 id="curriculum-title" className="font-heading text-[1.45rem]">
                Kurikulum
              </h2>
              {path.curriculum.length === 0 ? (
                <p className="mt-2 border border-ink/20 bg-paper-2 px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
                  Kurikulum belum terbit. Modul dan pelajaran akan tampil di
                  sini setelah diterbitkan oleh pengajar.
                </p>
              ) : (
                <ol className="mt-3 space-y-4">
                  {path.curriculum.map((module) => (
                    <li
                      key={module.title}
                      className="border border-ink/20 bg-paper-2 p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-heading text-[1.2rem] leading-snug">
                          {module.title}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                          <Clock className="size-3" aria-hidden="true" />
                          {module.estimatedMinutes} menit
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
                        {module.summary}
                      </p>
                      {module.lessons.length > 0 ? (
                        <ul className="mt-3 space-y-2 border-t border-ink/15 pt-3">
                          {module.lessons.map((lesson) => (
                            <li
                              key={`${module.title}-${lesson.title}`}
                              className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]"
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
                                  {accessLabels[lesson.accessLevel]}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <aside className="lg:col-span-5">
            <section
              aria-labelledby="cohorts-title"
              className="border-2 border-ink bg-paper-2 p-5 shadow-[5px_5px_0_var(--teak)] sm:p-6"
            >
              <h2
                id="cohorts-title"
                className="flex items-center gap-2 font-heading text-[1.45rem]"
              >
                <Users className="size-4 text-copper-dark" aria-hidden="true" />
                Angkatan
              </h2>
              {path.cohorts.length === 0 ? (
                <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
                  Belum ada angkatan terbuka untuk jalur ini.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {path.cohorts.map((cohort) => (
                    <li
                      key={cohort.code}
                      className="border-b border-ink/15 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-heading text-[1.1rem] leading-tight">
                            {cohort.title}
                          </p>
                          <p className="mt-1 text-[10.5px] text-ink-muted">
                            {cohort.code} · {formatDate(cohort.startDate)} –{" "}
                            {formatDate(cohort.endDate)}
                          </p>
                        </div>
                        <span className="stamp stamp-soft border-ink/30 text-ink-soft">
                          {cohortLabels[cohort.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-ink-muted">
                        {cohort.capacity} kursi · {cohort.timezone}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 border-t border-ink/15 pt-4">
                <p className="text-[10.5px] leading-relaxed text-ink-muted">
                  Sudah punya akun peserta?{" "}
                  <Link
                    href={PUBLIC_ROUTES.learning}
                    className="font-semibold text-copper-dark underline underline-offset-2"
                  >
                    Buka ruang belajar
                  </Link>
                  .
                </p>
              </div>
            </section>

            <section className="mt-6 border border-ink/20 bg-cream-2 p-5">
              <h2 className="font-heading text-[1.2rem]">Ingin bertanya dulu?</h2>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
                Kirim pertanyaan lewat formulir. Tim KalaNidhi akan menjawab
                tanpa membuka jendela dialog.
              </p>
              <Link
                href={interestHref({
                  path: path.slug,
                  intent: "consultation",
                })}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
              >
                Tanya lewat formulir
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}
