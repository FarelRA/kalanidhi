import { BrandMark } from "@/components/brand/brand-mark"
import { LeadButton } from "@/components/overlays/overlay-buttons"
import { Button } from "@/components/ui/button"
import { pilot } from "@/lib/content/landing"

export function ClosingBench() {
  return (
    <section
      aria-labelledby="closing-title"
      className="wood-deep relative overflow-hidden pb-24 pt-20 text-paper sm:pt-24"
    >
      <div className="shell relative z-10 grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <span className="stamp border-paper/35 text-paper">Mulai dari sini</span>
          <h2 id="closing-title" className="heading-hero mt-6 max-w-[15ch] text-paper">
            Bangku berikutnya kosong.
          </h2>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-paper/75">
            Pilih jalur, kerjakan tugas pertama, dan kirim untuk dikoreksi.
            Kalau sudah siap, kamu bisa kembali mengajar dan membuka jalur untuk
            orang berikutnya.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <LeadButton
              request={{ variant: "student" }}
              size="lg"
              className="border-2 border-copper-dark bg-copper-dark text-cream-2 hover:border-copper hover:bg-copper"
            >
              Daftar minat
            </LeadButton>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-paper/35 text-paper hover:border-brass hover:bg-paper/5 hover:text-brass"
            >
              <a href="#jalur">Lihat jalur</a>
            </Button>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 border-t border-paper/20 pt-5 sm:grid-cols-5">
            {pilot.figures.map((figure) => (
              <div key={figure.label}>
                <dt className="font-heading text-[1.55rem] leading-none text-brass">
                  {figure.value}
                </dt>
                <dd className="mt-1.5 text-[9px] font-bold uppercase leading-tight tracking-[0.07em] text-paper/65">
                  {figure.label}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-paper/20 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-paper/65">
              {pilot.label}
            </p>
            <p className="text-[10.5px] leading-relaxed text-paper/65">
              {pilot.note} Terbuka untuk praktisi dari daerah lain secara
              bertahap.
            </p>
          </div>
        </div>

        <div className="hidden justify-center lg:col-span-5 lg:flex">
          <div className="relative size-[300px]">
            <BrandMark size={300} className="text-paper/25" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-[176px] rounded-full border border-paper/20 bg-deep/40 p-5 text-center backdrop-blur-[1px]">
                <p className="font-heading text-[1.7rem] leading-none text-paper">
                  satu
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-brass">
                  bangku
                </p>
                <p className="mt-3 font-heading text-[1.7rem] leading-none text-paper">
                  lima
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-brass">
                  langkah
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bench-plank absolute inset-x-0 bottom-0 h-4" aria-hidden="true" />
    </section>
  )
}
