"use client"

import Image from "next/image"
import { ArrowUpRight, Check } from "lucide-react"
import { useState } from "react"

import { LeadButton } from "@/components/overlays/overlay-buttons"
import { Button } from "@/components/ui/button"
import type { LearningPath } from "@/lib/content/landing"
import { paths } from "@/lib/content/landing"
import { formatIDR } from "@/lib/format"
import { cn } from "cn"

import { PathDialog } from "./path-dialog"

export function OpenPaths() {
  const [selected, setSelected] = useState<LearningPath | null>(null)

  return (
    <section
      id="jalur"
      aria-labelledby="paths-title"
      className="border-b border-ink/15 bg-cream py-16 sm:py-20 lg:py-24"
    >
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="stamp border-ink/35 text-ink">Jalur belajar</span>
            <h2 id="paths-title" className="heading-section mt-5 max-w-[18ch]">
              Dua jalur sudah terbuka. Satu masih disusun.
            </h2>
          </div>
          <p className="body-copy max-w-[34rem] lg:col-span-5">
            Setiap jalur punya pengajar, modul, dan tugas praktik yang dinilai
            manusia. Pilih yang paling dekat dengan tanganmu sekarang.
          </p>
        </div>

        <div className="mt-12 space-y-5 lg:mt-16">
          {paths.map((path) => (
            <article
              key={path.slug}
              className={cn(
                "relative border-2 bg-paper-2",
                path.comingSoon
                  ? "border-dashed border-ink/35 bg-panel/45"
                  : "border-ink shadow-[5px_5px_0_var(--teak)]",
              )}
            >
              <div className="grid gap-0 lg:grid-cols-12">
                <div className="relative min-h-[220px] overflow-hidden border-b border-ink/15 lg:col-span-4 lg:min-h-[300px] lg:border-b-0 lg:border-r">
                  <Image
                    src={path.image}
                    alt={`Jalur ${path.title}`}
                    fill
                    sizes="(min-width: 1024px) 400px, 92vw"
                    className={cn(
                      "object-cover",
                      path.comingSoon && "saturate-[0.55]",
                    )}
                  />
                  <span className="stamp absolute left-3 top-3 bg-paper-2 text-ink">
                    {path.code}
                  </span>
                  {path.comingSoon ? (
                    <span className="stamp absolute bottom-3 left-3 bg-ink text-paper">
                      {path.priceLabel}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col p-5 sm:p-6 lg:col-span-8 lg:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-[30rem]">
                      <h3 className="font-heading text-[clamp(1.6rem,3vw,2.2rem)] leading-[1.05]">
                        {path.title}
                      </h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                        {path.subtitle}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                        {path.comingSoon ? "Status" : "Biaya jalur"}
                      </p>
                      <p className="mt-1 font-heading text-[1.55rem] leading-none text-ink">
                        {path.price ? formatIDR(path.price) : path.priceLabel}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-ink/15 py-3 text-[11.5px] sm:grid-cols-4">
                    <div>
                      <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                        Pengajar
                      </dt>
                      <dd className="mt-1 font-semibold leading-snug">
                        {path.teacher}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                        Daerah
                      </dt>
                      <dd className="mt-1 font-semibold leading-snug">
                        {path.region}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                        Level
                      </dt>
                      <dd className="mt-1 font-semibold leading-snug">
                        {path.level}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                        Isi
                      </dt>
                      <dd className="mt-1 font-semibold leading-snug">
                        {path.comingSoon
                          ? "Kurikulum disusun"
                          : `${path.modules} modul / ${path.weeks} pekan`}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex flex-1 flex-col justify-end gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {path.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex min-h-7 items-center gap-1.5 border border-ink/25 bg-cream px-2.5 text-[10px] font-semibold text-ink/70"
                        >
                          <Check
                            className="size-3 text-copper-dark"
                            aria-hidden="true"
                          />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelected(path)}
                        className="border-ink/35"
                      >
                        Buka rincian
                        <ArrowUpRight aria-hidden="true" />
                      </Button>
                      <LeadButton
                        request={
                          path.comingSoon
                            ? { variant: "notify", interest: path.title }
                            : { variant: "student", interest: path.title }
                        }
                      >
                        {path.comingSoon ? "Catat minat" : "Daftar minat"}
                      </LeadButton>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selected ? (
        <PathDialog path={selected} onClose={() => setSelected(null)} />
      ) : null}
    </section>
  )
}
