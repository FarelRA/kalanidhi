import { LeadButton } from "@/components/overlays/overlay-buttons"

export function FinalCta() {
  return (
    <section
      aria-labelledby="cta-title"
      className="relative overflow-hidden border-b border-paper/10 py-16 sm:py-20 lg:py-24"
    >
      <div
        aria-hidden="true"
        className="texture-crackle pointer-events-none absolute inset-0 opacity-[0.04]"
      />

      <div className="section-shell relative grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="section-label">Mulai dari sini</p>
          <h2 id="cta-title" className="heading-display mt-5">
            Mulai dari satu jalur.
            <br />
            Kembali sebagai pengajar.
          </h2>
          <p className="body-copy mt-5 max-w-[48ch]">
            Pilih jalur, ikuti prosesnya, dan biarkan pengajar menunjukkan bagian
            yang perlu diperbaiki. Setelah lulus, kamu bisa berkarya, berjualan,
            atau kembali mengajar dan menilai untuk pelajar berikutnya.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <LeadButton request={{ variant: "student" }} size="lg">
              Daftar sebagai pelajar
            </LeadButton>
            <LeadButton
              request={{
                variant: "consultation",
                interest: "Konsultasi program pelatihan",
              }}
              variant="link"
              size="sm"
              className="h-auto px-0 text-soga"
            >
              Konsultasi program
            </LeadButton>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-text-muted">
              Uji coba terbatas 2026. Pendaftaran jalur dibuka bertahap.
            </span>
          </div>
        </div>

        <div className="flex justify-start lg:col-span-4 lg:justify-end">
          <WaxSeal />
        </div>
      </div>
    </section>
  )
}

function WaxSeal() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 180 180"
      className="size-40 text-soga sm:size-48"
      fill="none"
    >
      <circle cx="90" cy="90" r="86" stroke="currentColor" strokeOpacity="0.35" />
      <circle cx="90" cy="90" r="72" stroke="currentColor" strokeOpacity="0.6" />
      <circle
        cx="90"
        cy="90"
        r="60"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeDasharray="2 5"
      />
      <path
        d="M90 44c13 17 22 28 22 40a22 22 0 0 1-44 0c0-12 9-23 22-40Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
      />
      <circle cx="90" cy="84" r="5" fill="currentColor" />
      <text
        x="90"
        y="132"
        textAnchor="middle"
        fill="currentColor"
        fontSize="9"
        letterSpacing="2.8"
      >
        KALANIDHI
      </text>
      <text
        x="90"
        y="145"
        textAnchor="middle"
        fill="currentColor"
        fontSize="7"
        letterSpacing="1.7"
        opacity="0.7"
      >
        RILIS BERTAHAP
      </text>
    </svg>
  )
}
