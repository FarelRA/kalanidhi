import { AttributionCard } from "@/components/landing/attribution-card"
import { ShareBreakdown } from "@/components/landing/share-breakdown"
import { InfoButton, LeadButton } from "@/components/overlays/overlay-buttons"
import { SectionHeading } from "@/components/shared/section-heading"

const principles = [
  {
    title: "Sumber yang jelas",
    description:
      "Komunitas, pengajar, dan sumber pengetahuan tampil langsung di jalur, karya, dan pustaka.",
  },
  {
    title: "Izin dan tingkat akses",
    description:
      "Setiap pengetahuan punya status izin, tanggal persetujuan, dan tingkat akses: publik, berbayar, atau terbatas komunitas.",
  },
  {
    title: "Bagi hasil transparan",
    description:
      "Rincian pembagian pendapatan ditampilkan sebelum transaksi, dengan penjelasan fungsi setiap pos alokasi.",
  },
]

export function EthicsSection() {
  return (
    <section
      id="etika"
      aria-labelledby="etika-title"
      className="border-b border-paper/10 py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell">
        <SectionHeading
          eyebrow="Etika & hak budaya"
          title="Budaya dibagikan dengan izin."
          description="Kami menampilkan siapa yang berhak, siapa yang memberi izin, dan ke mana nilai ekonomi mengalir."
          titleId="etika-title"
        />

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="border-t border-paper/12">
              {principles.map((principle) => (
                <div
                  key={principle.title}
                  className="grid grid-cols-[0.75rem_1fr] gap-4 border-b border-paper/12 py-5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 bg-soga"
                  />
                  <div>
                    <h3 className="text-[15px] font-semibold text-paper">
                      {principle.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-[1.65] text-paper-dim">
                      {principle.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <InfoButton infoKey="policy" size="sm">
                Baca prinsip lengkap
              </InfoButton>
              <LeadButton
                request={{
                  variant: "consultation",
                  interest: "Etika & hak budaya",
                }}
                variant="ghost"
                size="sm"
                className="border-0 border-b border-paper/25 px-0 text-paper-dim hover:bg-transparent hover:text-paper"
              >
                Tanya kebijakan
              </LeadButton>
            </div>
          </div>

          <div className="lg:col-span-7 lg:pl-10">
            <div className="flex items-baseline justify-between gap-4 border-b border-soga/40 pb-4">
              <div>
                <p className="text-[11px] text-soga">Pembagian pendapatan</p>
                <h3 className="mt-1 font-heading text-[1.6rem] text-paper">
                  Ke mana uangmu pergi
                </h3>
              </div>
              <span className="text-[10px] text-indigo-dust">Transparan</span>
            </div>

            <div className="mt-6">
              <ShareBreakdown />
            </div>

            <div className="mt-10">
              <AttributionCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
