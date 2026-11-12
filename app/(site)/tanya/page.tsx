import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowUpRight, Route, ShoppingBag, UserRound } from "lucide-react"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { LeadForm } from "@/components/forms/lead-form"
import { getPublicWorks } from "@/lib/commerce/server"
import { buildPageMetadata } from "@/lib/content/metadata"
import {
  pathHref,
  PUBLIC_ROUTES,
  teacherHref,
  workHref,
} from "@/lib/content/routes"
import type { LeadVariant } from "@/lib/content/types"
import {
  getPublicPaths,
  getPublicTeachers,
  getSiteData,
} from "@/lib/convex/server"

export const instant = false

type SearchParams = Record<string, string | string[] | undefined>

const intents: LeadVariant[] = [
  "student",
  "institution",
  "consultation",
  "notify",
]

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function resolveIntent(
  value: string | undefined,
  context: { path?: string; teacher?: string; work?: string },
): LeadVariant {
  if (value && (intents as string[]).includes(value)) {
    return value as LeadVariant
  }
  if (context.path) return "student"
  if (context.teacher || context.work) return "consultation"
  return "consultation"
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  const data = await getSiteData()
  const intent = resolveIntent(one(params.intent), {
    path: one(params.path),
    teacher: one(params.teacher),
    work: one(params.work),
  })
  const copy = data.leadDialogs[intent]
  return buildPageMetadata(PUBLIC_ROUTES.consult, {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: PUBLIC_ROUTES.consult },
  })
}

export default async function ConsultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const pathSlug = one(params.path)
  const teacherSlug = one(params.teacher)
  const workSlug = one(params.work)
  const interestParam = one(params.interest)

  const [data, paths, teachers, works] = await Promise.all([
    getSiteData(),
    getPublicPaths(),
    getPublicTeachers(),
    getPublicWorks(),
  ])

  const path = pathSlug
    ? paths.find((item) => item.slug === pathSlug)
    : undefined
  const teacher = teacherSlug
    ? teachers.find((item) => item.slug === teacherSlug)
    : undefined
  const work = workSlug
    ? works.find((item) => item.slug === workSlug)
    : undefined

  if (pathSlug && !path) notFound()
  if (teacherSlug && !teacher) notFound()
  if (workSlug && !work) notFound()

  const intent = resolveIntent(one(params.intent), {
    path: pathSlug,
    teacher: teacherSlug,
    work: workSlug,
  })
  const copy = data.leadDialogs[intent]

  const derivedInterest = (
    interestParam ??
    path?.title ??
    (teacher ? `Profil pengajar: ${teacher.name}` : undefined) ??
    work?.title
  )?.slice(0, 120)

  const interestOptions = Array.from(
    new Set([
      ...paths.map((item) => item.title),
      ...teachers.map((item) => `Profil pengajar: ${item.name}`),
      ...works.map((item) => item.title),
      "Belum tahu, minta rekomendasi",
    ]),
  )

  const contextParts: string[] = []
  if (path) contextParts.push(`path=${path.slug}`)
  if (teacher) contextParts.push(`teacher=${teacher.slug}`)
  if (work) contextParts.push(`work=${work.slug}`)
  const source = ["tanya", ...contextParts].join(":").slice(0, 80)

  const returnHref = path
    ? pathHref(path.slug)
    : teacher
      ? teacherHref(teacher.slug)
      : work
        ? workHref(work.slug)
        : PUBLIC_ROUTES.home
  const returnLabel = path
    ? "Kembali ke jalur"
    : teacher
      ? "Kembali ke profil pengajar"
      : work
        ? "Kembali ke karya"
        : "Kembali ke beranda"

  const hasContext = Boolean(path || teacher || work)

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          homeLabel={data.header.homeLabel}
          eyebrow="Tanya dulu"
          title={copy.title}
          description={copy.description}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            {hasContext ? (
              <div className="border border-ink/20 bg-paper-2 p-5">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                  Konteks formulir
                </p>
                <ul className="mt-3 space-y-3">
                  {path ? (
                    <li className="flex items-start gap-3">
                      <Route
                        className="mt-0.5 size-4 shrink-0 text-copper-dark"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                          Jalur
                        </p>
                        <Link
                          href={pathHref(path.slug)}
                          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink hover:text-copper-dark"
                        >
                          {path.title}
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  ) : null}
                  {teacher ? (
                    <li className="flex items-start gap-3">
                      <UserRound
                        className="mt-0.5 size-4 shrink-0 text-copper-dark"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                          Pengajar
                        </p>
                        <Link
                          href={teacherHref(teacher.slug)}
                          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink hover:text-copper-dark"
                        >
                          {teacher.name}
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  ) : null}
                  {work ? (
                    <li className="flex items-start gap-3">
                      <ShoppingBag
                        className="mt-0.5 size-4 shrink-0 text-copper-dark"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                          Karya
                        </p>
                        <Link
                          href={workHref(work.slug)}
                          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink hover:text-copper-dark"
                        >
                          {work.title}
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                        </Link>
                      </div>
                    </li>
                  ) : null}
                </ul>
                <p className="mt-4 border-t border-ink/15 pt-3 text-[10.5px] leading-relaxed text-ink-muted">
                  Konteks ini ikut tercatat di formulir yang kamu kirim.
                </p>
              </div>
            ) : (
              <div className="border border-ink/20 bg-paper-2 p-5">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                  Sebelum mengirim
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                  Pilih minat utama atau ceritakan kebutuhanmu. Tim KalaNidhi
                  Digital akan menghubungi lewat WhatsApp. Email opsional bila
                  kamu ingin salinan tertulis.
                </p>
              </div>
            )}

            <div className="mt-6 border-t border-ink/15 pt-4 text-[10.5px] leading-relaxed text-ink-muted">
              <p>
                Ingin langsung mendaftar?{" "}
                <Link
                  href={PUBLIC_ROUTES.interest}
                  className="font-semibold text-copper-dark underline underline-offset-2"
                >
                  Lihat daftar jalur dan karya
                </Link>
                .
              </p>
              <p className="mt-2">
                Ingin membaca aturan lebih dulu?{" "}
                <Link
                  href={PUBLIC_ROUTES.ethics}
                  className="font-semibold text-copper-dark underline underline-offset-2"
                >
                  Etika dan hak budaya
                </Link>
                .
              </p>
              <p className="mt-2">
                Untuk kebutuhan institusi,{" "}
                <Link
                  href={PUBLIC_ROUTES.institution}
                  className="font-semibold text-copper-dark underline underline-offset-2"
                >
                  lihat halaman institusi
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="border-2 border-ink bg-paper-2 p-5 shadow-[5px_5px_0_var(--teak)] sm:p-7">
              <LeadForm
                variant={intent}
                interestOptions={interestOptions}
                interest={derivedInterest}
                source={source}
                successHref={returnHref}
                successLabel={returnLabel}
                showMessage
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
