import Link from "next/link"

import { BrandLockup } from "@/components/brand/brand-mark"
import { NewsletterForm } from "@/components/forms/newsletter-form"
import { FooterPreferences } from "@/components/layout/footer-preferences"
import type {
  FooterContent,
  PublicCulturalSource,
} from "@/lib/content/types"
import { PUBLIC_ROUTES, publicHref } from "@/lib/content/routes"
import { formatDate } from "@/lib/format"

export function SiteFooter({
  footer,
  sources,
}: {
  footer: FooterContent
  sources: PublicCulturalSource[]
}) {
  const latest = sources.at(-1)
  return (
    <footer className="wood-deep border-t-2 border-copper-dark pb-28 text-paper md:pb-0">
      <div className="shell py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <BrandLockup markSize={42} tone="paper" />
            <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-paper/70">
              {footer.description}
            </p>
            <div className="mt-8 max-w-sm">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brass">
                {footer.newsletter.label}
              </p>
              <div className="mt-3">
                <NewsletterForm copy={footer.newsletter} />
              </div>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-7 xl:grid-cols-3">
            {footer.columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brass">
                  {column.title}
                </p>
                <ul className="mt-4 border-t border-paper/20">
                  {column.links.map((link) => (
                    <li key={link.label} className="border-b border-paper/10">
                      <Link
                        href={publicHref(link.href)}
                        className="flex min-h-11 items-center py-2 text-[12.5px] text-paper/70 transition-colors hover:text-paper"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brass">
                {footer.preferencesLabel}
              </p>
              <div className="mt-4">
                <FooterPreferences copy={footer} />
              </div>
              <div className="mt-6 border-t border-paper/20 pt-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-paper/65">
                  {footer.secretariat.label}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-paper/70">
                  {footer.secretariat.value}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-8 border-t border-paper/20 pt-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-brass">
              {footer.sourceLabel}
            </p>
            <p className="mt-2 max-w-md text-[11.5px] leading-relaxed text-paper/60">
              {footer.sourceDescription}
            </p>
          </div>
          <div className="lg:col-span-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-brass">
              {footer.sourcesLabel}
            </p>
            <p className="mt-2 text-[12px] text-paper">
              {sources.length > 0
                ? sources.map((source) => source.community).join(" · ")
                : "Belum ada catatan sumber yang terbit."}
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-paper/65">
              {latest
                ? `Izin tercatat ${formatDate(latest.permissionDate)}`
                : "Izin dan atribusi menyusul setelah dicatat di Convex."}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-paper/65">
              {latest ? latest.attribution : "—"}
            </p>
          </div>
          <div className="lg:col-span-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-brass">
              {footer.cultureLabel}
            </p>
            <Link
              href={PUBLIC_ROUTES.ethics}
              className="mt-2 inline-flex min-h-11 items-center border-b border-copper-light/50 pb-0.5 text-[11.5px] text-paper hover:text-copper-light"
            >
              {footer.culturePolicyCta}
            </Link>
            <p className="mt-4 text-[9.5px] leading-relaxed text-paper/65">
              {footer.certificateNote}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-paper/20 pt-5 text-[10.5px] text-paper/65 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl font-semibold uppercase leading-relaxed tracking-[0.06em]">
            {footer.edition} / {footer.copyright}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href={PUBLIC_ROUTES.privacy}
              className="inline-flex min-h-11 items-center text-[10.5px] text-paper/65 hover:text-paper"
            >
              {footer.privacyLabel}
            </Link>
            <Link
              href={PUBLIC_ROUTES.terms}
              className="inline-flex min-h-11 items-center text-[10.5px] text-paper/65 hover:text-paper"
            >
              {footer.termsLabel}
            </Link>
            <Link
              href={`${PUBLIC_ROUTES.home}#top`}
              className="flex min-h-11 items-center text-paper/70 transition-colors hover:text-paper"
            >
              {footer.backToTopLabel}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
