import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowUpRight, MessageCircle, Route, ShoppingBag } from "lucide-react"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { getPublicWorks } from "@/lib/commerce/server"
import { buildPageMetadata } from "@/lib/content/metadata"
import {
  buyHref,
  consultHref,
  enrollHref,
  pathHref,
  PUBLIC_ROUTES,
  workHref,
} from "@/lib/content/routes"
import type { LeadVariant, PublicTeacherDetail } from "@/lib/content/types"
import {
  getPublicPaths,
  getPublicTeacher,
  getSiteData,
} from "@/lib/convex/server"
import { formatIDR } from "@/lib/format"

import { resolveMinat, type MinatParams } from "./resolve"

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
  const requested = one(params.intent)
  const hasContext = Boolean(
    one(params.path) || one(params.teacher) || one(params.work),
  )
  const intent =
    requested && (intents as string[]).includes(requested)
      ? (requested as LeadVariant)
      : hasContext
        ? resolveIntent(undefined, {
            path: one(params.path),
            teacher: one(params.teacher),
            work: one(params.work),
          })
        : "student"
  const copy = data.leadDialogs[intent]
  return buildPageMetadata(PUBLIC_ROUTES.interest, {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: PUBLIC_ROUTES.interest },
  })
}

export default async function InterestPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const normalized: MinatParams = {
    path: one(params.path),
    work: one(params.work),
    teacher: one(params.teacher),
    intent: one(params.intent),
    interest: one(params.interest),
  }

  const [paths, works] = await Promise.all([
    getPublicPaths(),
    getPublicWorks(),
  ])
  const teacher = normalized.teacher
    ? await getPublicTeacher(normalized.teacher)
    : null

  const resolution = resolveMinat({
    params: normalized,
    paths,
    works,
    teacher,
  })

  if (resolution.kind === "notFound") notFound()
  if (resolution.kind === "redirect") redirect(resolution.href)
  if (resolution.kind === "chooser") {
    return <TeacherChooser teacher={resolution.teacher} />
  }

  return <InterestCatalog paths={paths} works={works} />
}

function InterestCatalog({
  paths,
  works,
}: {
  paths: Awaited<ReturnType<typeof getPublicPaths>>
  works: Awaited<ReturnType<typeof getPublicWorks>>
}) {
  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          eyebrow="Daftar minat"
          title="Pilih jalur atau karya."
          description="Daftar minat langsung membuka halaman checkout. WhatsApp adalah identitas utama; email opsional untuk salinan."
        />

        <div className="mt-8 flex flex-wrap items-center gap-3 border border-ink/20 bg-paper-2 p-4">
          <MessageCircle
            className="size-4 shrink-0 text-copper-dark"
            aria-hidden="true"
          />
          <p className="text-[11.5px] leading-relaxed text-ink-soft">
            Kami menghubungi lewat WhatsApp. Email hanya dipakai bila kamu ingin
            salinan tertulis.
          </p>
          <Link
            href={consultHref({ intent: "consultation" })}
            className="ml-auto inline-flex min-h-9 items-center text-[10px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
          >
            Tanya dulu
            <ArrowUpRight className="ml-1 size-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-12">
          <div className="flex items-end justify-between gap-4 border-b border-ink/20 pb-3">
            <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] leading-none">
              Jalur belajar
            </h2>
            <Link
              href={PUBLIC_ROUTES.paths}
              className="text-[10px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
            >
              Semua jalur
            </Link>
          </div>

          {paths.length === 0 ? (
            <p className="mt-6 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
              Belum ada jalur yang terbit di Convex. Jalur akan muncul di sini
              setelah kurikulum dan pengajarnya tersedia.
            </p>
          ) : (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paths.map((path) => (
                <li
                  key={path.slug}
                  className="flex flex-col border-2 border-ink bg-paper-2 shadow-[5px_5px_0_var(--teak)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden border-b border-ink/15 bg-panel">
                    {path.image ? (
                      <Image
                        src={path.image}
                        alt={path.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, 92vw"
                        className="object-cover"
                      />
                    ) : null}
                    <span className="stamp absolute left-3 top-3 bg-paper-2 text-ink">
                      {path.code}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-copper-dark">
                      Jalur belajar · {path.region}
                    </p>
                    <h3 className="mt-1.5 font-heading text-[1.35rem] leading-tight">
                      <Link
                        href={pathHref(path.slug)}
                        className="hover:text-copper-dark"
                      >
                        {path.title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">
                      {path.teacher} · {path.level}
                    </p>
                    <p className="mt-2 line-clamp-3 text-[11.5px] leading-relaxed text-ink-soft">
                      {path.subtitle}
                    </p>

                    <div className="mt-3 border-t border-ink/15 pt-3">
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                        Biaya jalur
                      </p>
                      <p className="mt-1 font-heading text-[1.5rem] leading-none">
                        {path.price ? formatIDR(path.price) : path.priceLabel}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                      <Link
                        href={pathHref(path.slug)}
                        className="inline-flex min-h-11 items-center border border-ink/35 px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
                      >
                        Lihat jalur
                      </Link>
                      {path.comingSoon ? (
                        <Link
                          href={consultHref({
                            path: path.slug,
                            intent: "notify",
                          })}
                          className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
                        >
                          Catat minat
                        </Link>
                      ) : (
                        <Link
                          href={enrollHref(path.slug)}
                          className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
                        >
                          Daftar jalur
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-14">
          <div className="flex items-end justify-between gap-4 border-b border-ink/20 pb-3">
            <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] leading-none">
              Karya
            </h2>
            <Link
              href={PUBLIC_ROUTES.works}
              className="text-[10px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
            >
              Semua karya
            </Link>
          </div>

          {works.length === 0 ? (
            <p className="mt-6 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
              Belum ada karya terbit di Convex. Karya akan muncul di sini setelah
              Kartu Karya dan sertifikatnya terbit.
            </p>
          ) : (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {works.map((work) => (
                <li
                  key={work.slug}
                  className="flex flex-col border-2 border-ink bg-paper-2 shadow-[5px_5px_0_var(--teak)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden border-b border-ink/15 bg-panel">
                    {work.image ? (
                      <Image
                        src={work.image}
                        alt={work.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, 92vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-copper-dark">
                      {work.kind === "service" ? "Jasa" : "Karya"} ·{" "}
                      {work.region}
                    </p>
                    <h3 className="mt-1.5 font-heading text-[1.35rem] leading-tight">
                      <Link
                        href={workHref(work.slug)}
                        className="hover:text-copper-dark"
                      >
                        {work.title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">
                      {work.maker}
                    </p>
                    <p className="mt-2 line-clamp-3 text-[11.5px] leading-relaxed text-ink-soft">
                      {work.description}
                    </p>

                    <div className="mt-3 border-t border-ink/15 pt-3">
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                        Harga karya
                      </p>
                      <p className="mt-1 font-heading text-[1.5rem] leading-none">
                        {formatIDR(work.price)}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                      <Link
                        href={workHref(work.slug)}
                        className="inline-flex min-h-11 items-center border border-ink/35 px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
                      >
                        Lihat karya
                      </Link>
                      {work.purchasable ? (
                        <Link
                          href={buyHref(work.slug)}
                          className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
                        >
                          Beli karya
                        </Link>
                      ) : (
                        <Link
                          href={consultHref({
                            work: work.slug,
                            intent: "consultation",
                          })}
                          className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
                        >
                          Tanya karya
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function TeacherChooser({ teacher }: { teacher: PublicTeacherDetail }) {
  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          eyebrow="Daftar minat"
          title={`Jalur ${teacher.name}.`}
          description="Pilih jalur yang ingin kamu daftar. Setiap pilihan langsung membuka checkout."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {teacher.paths.map((path) => (
            <article
              key={path.slug}
              className="flex flex-col border-2 border-ink bg-paper-2 p-5 shadow-[5px_5px_0_var(--teak)]"
            >
              <div className="flex items-start gap-3">
                <Route
                  className="mt-0.5 size-4 shrink-0 text-copper-dark"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    {path.code} · {path.level}
                  </p>
                  <h2 className="mt-1 font-heading text-[1.35rem] leading-tight">
                    {path.title}
                  </h2>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {path.region}
                  </p>
                </div>
              </div>

              <p className="mt-3 border-t border-ink/15 pt-3 font-heading text-[1.35rem] leading-none">
                {path.price ? formatIDR(path.price) : path.priceLabel}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <Link
                  href={pathHref(path.slug)}
                  className="inline-flex min-h-11 items-center border border-ink/35 px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:border-copper-dark hover:text-copper-dark"
                >
                  Lihat jalur
                </Link>
                {path.comingSoon ? (
                  <Link
                    href={consultHref({ path: path.slug, intent: "notify" })}
                    className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
                  >
                    Catat minat
                  </Link>
                ) : (
                  <Link
                    href={enrollHref(path.slug)}
                    className="inline-flex min-h-11 items-center border border-ink bg-ink px-4 text-[10.5px] font-bold uppercase tracking-[0.06em] text-paper transition-colors hover:bg-ink-2"
                  >
                    Daftar jalur
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border border-ink/20 bg-paper-2 p-4">
          <ShoppingBag
            className="size-4 shrink-0 text-copper-dark"
            aria-hidden="true"
          />
          <p className="text-[11.5px] leading-relaxed text-ink-soft">
            Belum yakin jalur mana? Tanya dulu lewat WhatsApp.
          </p>
          <Link
            href={consultHref({
              teacher: teacher.slug,
              intent: "consultation",
            })}
            className="ml-auto inline-flex min-h-9 items-center text-[10px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
          >
            Tanya dulu
            <ArrowUpRight className="ml-1 size-3" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  )
}
