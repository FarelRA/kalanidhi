import { BrandLockup } from "@/components/brand/brand-mark"
import { NewsletterForm } from "@/components/forms/newsletter-form"
import { FooterPreferences } from "@/components/layout/footer-preferences"
import { InfoLink } from "@/components/overlays/overlay-buttons"
import { ethics, footer } from "@/lib/content/landing"

export function SiteFooter() {
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
                Kabar jalur dan karya baru
              </p>
              <div className="mt-3">
                <NewsletterForm />
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
                      {link.label === "Tentang KalaNidhi Digital" ? (
                        <InfoLink
                          infoKey="about"
                          className="flex min-h-11 items-center py-2 text-[12.5px] text-paper/70 transition-colors hover:text-paper"
                        >
                          {link.label}
                        </InfoLink>
                      ) : (
                        <a
                          href={link.href}
                          className="flex min-h-11 items-center py-2 text-[12.5px] text-paper/70 transition-colors hover:text-paper"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brass">
                Preferensi
              </p>
              <div className="mt-4">
                <FooterPreferences />
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
              Catatan sumber
            </p>
            <p className="mt-2 max-w-md text-[11.5px] leading-relaxed text-paper/60">
              Pengetahuan pada halaman ini ditampilkan dengan sumber komunitas.
              Setiap karya mencantumkan pembuat, pengajar pendamping, dan sumber
              pengetahuan.
            </p>
          </div>
          <div className="lg:col-span-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-brass">
              Sumber
            </p>
            <p className="mt-2 text-[12px] text-paper">
              {ethics.attribution.sources.map((source) => source.name).join(" · ")}
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-paper/65">
              {ethics.attribution.permission}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-paper/65">
              {ethics.attribution.reference}
            </p>
          </div>
          <div className="lg:col-span-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-brass">
              Hak budaya
            </p>
            <InfoLink
              infoKey="policy"
              className="mt-2 inline-flex min-h-11 items-center border-b border-copper-light/50 pb-0.5 text-[11.5px] text-paper hover:text-copper-light"
            >
              Baca prinsip etika
            </InfoLink>
            <p className="mt-4 text-[9.5px] leading-relaxed text-paper/65">
              Sertifikat menandai kompetensi di platform KalaNidhi Digital. Sertifikasi
              pemerintah dan BNSP memiliki jalur terpisah.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-paper/20 pt-5 text-[10.5px] text-paper/65 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl font-semibold uppercase leading-relaxed tracking-[0.06em]">
            {footer.edition} / {footer.copyright}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <InfoLink infoKey="privacy" className="inline-flex min-h-11 items-center text-[10.5px] text-paper/65 hover:text-paper">
              Kebijakan privasi
            </InfoLink>
            <InfoLink infoKey="terms" className="inline-flex min-h-11 items-center text-[10.5px] text-paper/65 hover:text-paper">
              Ketentuan layanan
            </InfoLink>
            <a
              href="#top"
              className="flex min-h-11 items-center text-paper/70 transition-colors hover:text-paper"
            >
              Kembali ke atas
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
