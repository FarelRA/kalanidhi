"use client"

import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import {
  enrollHref,
  interestHref,
  PUBLIC_ROUTES,
} from "@/lib/content/routes"
import type { PublicPathDetail, SiteData } from "@/lib/content/types"
import { formatIDR } from "@/lib/format"

/**
 * Viewer-dependent purchase state. It reads the session in the browser so the
 * class page can stay fully static and an unknown slug can return a real 404.
 */
export function PathEnrollment({
  path,
  copy,
}: {
  path: PublicPathDetail
  copy: SiteData["sections"]["paths"]
}) {
  const viewer = useQuery(api.access.getViewer) ?? null
  const signedIn = Boolean(viewer)
  const enrolled = Boolean(
    viewer?.enrollments.some(
      (enrollment) =>
        enrollment.pathId === path.slug &&
        (enrollment.status === "active" || enrollment.status === "completed"),
    ),
  )
  const purchasable = !path.comingSoon && path.price !== null && path.price > 0
  const checkoutHref = enrollHref(path.slug)
  const primaryHref = path.comingSoon
    ? interestHref({ path: path.slug, intent: "notify" })
    : enrolled
      ? PUBLIC_ROUTES.learning
      : purchasable
        ? signedIn
          ? checkoutHref
          : `${PUBLIC_ROUTES.signIn}?next=${encodeURIComponent(checkoutHref)}`
        : signedIn
          ? PUBLIC_ROUTES.learning
          : `${PUBLIC_ROUTES.signIn}?next=${encodeURIComponent(PUBLIC_ROUTES.learning)}`
  const primaryLabel = path.comingSoon
    ? copy.plannedCta
    : enrolled
      ? "Buka ruang belajar"
      : purchasable
        ? signedIn
          ? "Beli kelas ini"
          : "Masuk untuk membeli"
        : signedIn
          ? "Mulai belajar"
          : "Masuk untuk mendaftar"

  return (
    <>
      <div className="mt-6">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          {path.comingSoon ? copy.statusLabel : copy.priceLabel}
        </p>
        <p className="mt-1 font-heading text-[2rem] leading-none">
          {path.comingSoon
            ? (path.priceLabel ?? copy.curriculumPending)
            : path.price
              ? formatIDR(path.price)
              : path.priceLabel}
        </p>
        {enrolled ? (
          <p className="mt-2 inline-flex items-center gap-1.5 border border-moss/40 bg-moss/10 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            <Check className="size-3 text-moss" aria-hidden="true" />
            Sudah terdaftar
          </p>
        ) : null}
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
          Masuk dengan akun peserta untuk{" "}
          {purchasable ? "membeli" : "memulai"} kelas ini. Belum punya akun?{" "}
          <Link
            href={`${PUBLIC_ROUTES.signUp}?next=${encodeURIComponent(
              purchasable ? checkoutHref : PUBLIC_ROUTES.learning,
            )}`}
            className="font-semibold text-copper-dark underline underline-offset-2"
          >
            Daftar peserta
          </Link>
          .
        </p>
      ) : null}
      {enrolled ? (
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink-muted">
          Kamu sudah terdaftar di kelas ini. Lanjutkan pelajaran dari ruang
          belajar.
        </p>
      ) : null}
    </>
  )
}
