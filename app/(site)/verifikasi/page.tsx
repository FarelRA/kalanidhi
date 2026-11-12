import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { VerificationLookupForm } from "@/components/landing/verification-lookup-form"
import { buildPageMetadata } from "@/lib/content/metadata"
import { PUBLIC_ROUTES } from "@/lib/content/routes"
import { getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.verify, {
    title: data.overlays.verify.title,
    description: data.overlays.verify.description,
    alternates: { canonical: PUBLIC_ROUTES.verify },
  })
}

export default async function VerificationIndexPage() {
  const data = await getSiteData()
  const verify = data.overlays.verify

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          eyebrow="Registry kredensial"
          title={verify.title}
          description={verify.description}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div className="border-2 border-ink bg-paper-2 p-5 shadow-[5px_5px_0_var(--teak)] sm:p-7">
              <p className="flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Verifikasi publik
              </p>
              <VerificationLookupForm />
            </div>
          </div>

          <aside className="lg:col-span-5">
            <ul className="space-y-3">
              {(verify.bullets ?? []).map((bullet) => (
                <li
                  key={bullet}
                  className="border-b border-ink/15 pb-3 text-[12px] leading-relaxed text-ink-soft"
                >
                  {bullet}
                </li>
              ))}
            </ul>
            <p className="mt-4 border border-ink/20 bg-paper-2 px-4 py-3 text-[10.5px] leading-relaxed text-ink-muted">
              {verify.footnote}
            </p>
            <p className="mt-4 text-[10.5px] leading-relaxed text-ink-muted">
              Ingin tahu apa yang dicatat pada sertifikat?{" "}
              <Link
                href={PUBLIC_ROUTES.ethics}
                className="font-semibold text-copper-dark underline underline-offset-2"
              >
                Baca etika dan hak budaya
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>
    </div>
  )
}
