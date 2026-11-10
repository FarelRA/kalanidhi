import { BrandLockup } from "@/components/brand/brand-mark"
import { NewsletterForm } from "@/components/forms/newsletter-form"
import { FooterPreferences } from "@/components/layout/footer-preferences"
import { InfoLink } from "@/components/overlays/overlay-buttons"
import { attribution, footer } from "@/lib/content/landing"

export function SiteFooter() {
  return (
    <footer className="border-t border-paper/12 bg-ink pb-28 md:pb-0">
      <div className="section-shell py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <BrandLockup markSize={44} />
            <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-paper-dim">
              {footer.description}
            </p>
            <div className="mt-8 max-w-sm">
              <p className="mb-3 font-heading text-[1.35rem] text-paper">
                Kabar jalur & karya baru
              </p>
              <NewsletterForm />
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 xl:grid-cols-3 lg:col-span-6">
            {footer.columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="mb-4 text-[12px] text-soga">{column.title}</p>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.label === "Tentang KalaNidhi" ? (
                        <InfoLink
                          infoKey="about"
                          className="text-[13px] text-paper-dim transition-colors hover:text-paper"
                        >
                          {link.label}
                        </InfoLink>
                      ) : (
                        <a
                          href={link.href}
                          className="text-[13px] text-paper-dim transition-colors hover:text-paper"
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
              <p className="mb-4 text-[12px] text-soga">Preferensi</p>
              <FooterPreferences />
              <div className="mt-6">
                <p className="text-[11px] text-text-muted">
                  {footer.secretariat.label}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-paper-dim">
                  {footer.secretariat.value}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-8 border-t border-paper/12 pt-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="text-[11px] text-soga">Catatan</p>
            <p className="mt-2 max-w-md text-[12px] leading-relaxed text-paper-dim">
              Pengetahuan pada halaman ini ditampilkan dengan sumber komunitas.
              Setiap karya mencantumkan pembuat, pengajar pendamping, dan sumber
              pengetahuan.
            </p>
          </div>
          <div className="lg:col-span-3">
            <p className="text-[11px] text-soga">Sumber</p>
            <p className="mt-2 text-[12px] text-paper">{attribution.community}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              {attribution.permission}
            </p>
            <p className="mt-1 text-[10px] text-soga/80">
              {attribution.reference}
            </p>
          </div>
          <div className="lg:col-span-3">
            <p className="text-[11px] text-soga">Hak budaya</p>
            <InfoLink
              infoKey="policy"
              className="mt-2 inline-flex border-b border-soga/50 pb-0.5 text-[12px] text-paper hover:text-soga"
            >
              Baca prinsip etika
            </InfoLink>
            <p className="mt-4 text-[10px] leading-relaxed text-text-muted">
              Sertifikat menandai kompetensi di platform KalaNidhi. Sertifikasi
              pemerintah dan BNSP memiliki jalur terpisah.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-paper/12 pt-6 text-[11px] text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl leading-relaxed">{footer.copyright}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <InfoLink infoKey="privacy" className="text-[11px]">
              Kebijakan privasi
            </InfoLink>
            <InfoLink infoKey="terms" className="text-[11px]">
              Ketentuan layanan
            </InfoLink>
            <a
              href="#top"
              className="text-[11px] text-paper-dim transition-colors hover:text-soga"
            >
              Kembali ke atas
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
