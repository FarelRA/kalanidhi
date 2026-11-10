import { SectionHeading } from "@/components/shared/section-heading"
import { steps } from "@/lib/content/landing"

const ordinals = ["i", "ii", "iii", "iv"]

export function HowItWorks() {
  return (
    <section
      id="cara-kerja"
      aria-labelledby="cara-kerja-title"
      className="border-b border-paper/10 py-16 sm:py-20 lg:py-24"
    >
      <div className="section-shell grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              eyebrow="Cara kerja"
              title="Dari modul pertama sampai karya yang dijual."
              description="Belajar, dinilai pengajar, mendapat sertifikat platform, lalu bertemu pasar. Semuanya satu alur."
              titleId="cara-kerja-title"
            />
            <div className="mt-8 flex items-center gap-3 border-t border-paper/12 pt-4 text-[11px] text-text-muted">
              <span className="size-1.5 rounded-full bg-indigo-dust" />
              Umpan balik pengajar di setiap tahap
            </div>
            <p className="mt-4 max-w-sm text-[11px] leading-relaxed text-text-muted">
              Sertifikat KalaNidhi adalah sertifikat platform dengan kode
              verifikasi publik, bukan sertifikasi pemerintah atau BNSP.
            </p>
          </div>
        </div>

        <ol className="lg:col-span-7">
          {steps.map((step, index) => (
            <li
              key={step.number}
              className="grid grid-cols-[2.5rem_1fr] gap-5 border-t border-paper/12 py-7 first:border-t-0 first:pt-0 sm:grid-cols-[4rem_1fr] sm:gap-7"
            >
              <span
                aria-hidden="true"
                className="font-heading text-[2rem] italic leading-none text-soga sm:text-[2.6rem]"
              >
                {ordinals[index]}
              </span>
              <div>
                <h3 className="text-[16px] font-semibold text-paper sm:text-[18px]">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xl text-[14px] leading-[1.7] text-paper-dim">
                  {step.description}
                </p>
                <p className="mt-4 text-[11px] text-indigo-dust">
                  {step.footer}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
