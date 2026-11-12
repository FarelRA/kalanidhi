import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, BadgeCheck, MapPin, Route, ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildPageMetadata } from "@/lib/content/metadata"
import {
  interestHref,
  pathHref,
  PUBLIC_ROUTES,
  teacherHref,
  workHref,
} from "@/lib/content/routes"
import { getPublicTeacher, getSiteData } from "@/lib/convex/server"
import { formatIDR } from "@/lib/format"

export const instant = false

type Params = { slug: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const teacher = await getPublicTeacher(slug)
  if (!teacher) {
    return { title: "Pengajar tidak ditemukan", robots: { index: false } }
  }
  return buildPageMetadata(teacherHref(teacher.slug), {
    title: teacher.name,
    description: `${teacher.specialty}, ${teacher.region}. ${teacher.focus}.`,
    alternates: { canonical: teacherHref(teacher.slug) },
    openGraph: {
      title: teacher.name,
      description: `${teacher.specialty}, ${teacher.region}.`,
      ...(teacher.image ? { images: [teacher.image] } : {}),
    },
  })
}

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const [teacher, data] = await Promise.all([
    getPublicTeacher(slug),
    getSiteData(),
  ])
  if (!teacher) notFound()

  const copy = data.sections.teachers

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <nav aria-label="Remah roti" className="text-[10px] text-ink-muted">
          <Link href={PUBLIC_ROUTES.home} className="hover:text-copper-dark">
            Beranda
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href={PUBLIC_ROUTES.teachers} className="hover:text-copper-dark">
            Pengajar
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{teacher.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <figure className="lg:col-span-4">
            <div className="relative aspect-[4/5] overflow-hidden border-[6px] border-paper-2 bg-panel shadow-plate">
              {teacher.image ? (
                <Image
                  src={teacher.image}
                  alt={`Foto ${teacher.name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 400px, 92vw"
                  className="object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center font-heading text-5xl text-ink-muted">
                  {teacher.initials}
                </span>
              )}
            </div>
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {teacher.region}
              </span>
              {teacher.verified ? (
                <span className="inline-flex items-center gap-1 font-semibold text-moss">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  Terverifikasi
                </span>
              ) : null}
            </figcaption>
          </figure>

          <div className="lg:col-span-8">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
              {teacher.specialty}
            </p>
            <h1 className="heading-section mt-3 text-[clamp(2rem,4vw,3rem)]">
              {teacher.name}
            </h1>
            <blockquote className="mt-5 border-l-2 border-copper pl-4 font-heading text-[1.3rem] italic leading-snug text-ink/85">
              &ldquo;{teacher.quote}&rdquo;
            </blockquote>

            <dl className="mt-6 grid gap-3 border-y border-ink/15 py-4 text-[11.5px] sm:grid-cols-2">
              {[
                ["Pengalaman", teacher.experience],
                ["Fokus", teacher.focus],
                ["Komunitas", teacher.community],
                ["Jalur", teacher.path],
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

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link
                  href={interestHref({
                    teacher: teacher.slug,
                    intent: "consultation",
                    interest: `Profil pengajar: ${teacher.name}`,
                  })}
                >
                  {copy.askCta}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-ink/35">
                <Link href={PUBLIC_ROUTES.teachers}>
                  Lihat semua pengajar
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <section aria-labelledby="teacher-paths-title" className="lg:col-span-7">
            <h2
              id="teacher-paths-title"
              className="flex items-center gap-2 font-heading text-[1.45rem]"
            >
              <Route className="size-4 text-copper-dark" aria-hidden="true" />
              Jalur yang diampu
            </h2>
            {teacher.paths.length === 0 ? (
              <p className="mt-3 border border-ink/20 bg-paper-2 px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
                Belum ada jalur terbit yang tertaut ke pengajar ini.
              </p>
            ) : (
              <ul className="mt-3 border-t border-ink/20">
                {teacher.paths.map((path) => (
                  <li key={path.slug} className="border-b border-ink/20 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-heading text-[1.2rem] leading-tight">
                          <Link
                            href={pathHref(path.slug)}
                            className="hover:text-copper-dark"
                          >
                            {path.title}
                          </Link>
                        </p>
                        <p className="mt-1 text-[10.5px] text-ink-muted">
                          {path.code} · {path.level} · {path.region}
                        </p>
                      </div>
                      <p className="text-[12px] font-semibold">
                        {path.price ? formatIDR(path.price) : path.priceLabel}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="teacher-works-title" className="lg:col-span-5">
            <h2
              id="teacher-works-title"
              className="flex items-center gap-2 font-heading text-[1.45rem]"
            >
              <ShoppingBag className="size-4 text-copper-dark" aria-hidden="true" />
              Karya dan jasa
            </h2>
            {teacher.works.length === 0 ? (
              <p className="mt-3 border border-ink/20 bg-paper-2 px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
                Belum ada karya terbit yang tertaut ke pengajar ini.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {teacher.works.map((work) => (
                  <li
                    key={work.slug}
                    className="flex gap-3 border border-ink/20 bg-paper-2 p-3"
                  >
                    <div className="relative size-20 shrink-0 overflow-hidden border border-ink/15 bg-cream">
                      {work.image ? (
                        <Image
                          src={work.image}
                          alt={work.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading text-[1.05rem] leading-tight">
                        <Link
                          href={workHref(work.slug)}
                          className="hover:text-copper-dark"
                        >
                          {work.title}
                        </Link>
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-ink/70">
                        {work.priceLabel ? `${work.priceLabel} ` : ""}
                        {formatIDR(work.price)}
                      </p>
                      <Link
                        href={interestHref({
                          work: work.slug,
                          teacher: teacher.slug,
                          intent: "consultation",
                        })}
                        className="mt-1 inline-flex min-h-9 items-center text-[10px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
                      >
                        Tanya karya ini
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}
