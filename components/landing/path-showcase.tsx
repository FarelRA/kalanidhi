"use client"

import Image from "next/image"
import { useState } from "react"

import { useOverlay } from "@/components/overlays/overlay-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LearningPath } from "@/lib/content/landing"
import { formatIDR } from "@/lib/format"

function MetaLine({ path }: { path: LearningPath }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
      <span>{path.level}</span>
      <span aria-hidden="true" className="h-3 w-px bg-paper/15" />
      <span>
        {path.modules > 0 ? `${path.modules} modul` : "Kurikulum menyusul"}
      </span>
      <span aria-hidden="true" className="h-3 w-px bg-paper/15" />
      <span>{path.weeks > 0 ? `${path.weeks} pekan` : "Jadwal menyusul"}</span>
    </div>
  )
}

export function PathShowcase({ paths }: { paths: LearningPath[] }) {
  const [selected, setSelected] = useState<LearningPath | null>(null)
  const { openLead } = useOverlay()

  const featured = paths[0]
  const rest = paths.slice(1)

  function openLeadAfterClose(request: Parameters<typeof openLead>[0]) {
    setSelected(null)
    window.setTimeout(() => openLead(request), 220)
  }

  return (
    <>
      <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <article className="lg:col-span-7">
          <div className="group relative overflow-hidden border border-paper/15 bg-ink-2">
            <div className="relative aspect-[16/10]">
              <Image
                src={featured.image}
                alt={`Jalur ${featured.title}`}
                fill
                placeholder="blur"
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                {featured.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-paper/25 bg-ink/60 text-paper backdrop-blur-sm"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <MetaLine path={featured} />
              <h3 className="mt-3 font-heading text-[2rem] leading-[1.05] tracking-[-0.01em] text-paper sm:text-[2.4rem]">
                {featured.title}
              </h3>
              <p className="mt-2 text-[14px] text-paper-dim">
                {featured.subtitle}
              </p>
              <p className="mt-2 text-[12px] text-text-muted">
                Bersama {featured.teacher}, {featured.region}
              </p>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-[10px] text-text-muted">Biaya pelatihan</p>
              <p className="font-heading text-[1.65rem] text-paper">
                {featured.price ? formatIDR(featured.price) : featured.priceLabel}
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                onClick={() => setSelected(featured)}
              >
                Lihat jalur
              </Button>
            </div>
          </div>
        </article>

        <div className="lg:col-span-5">
          <div className="border-t border-paper/15">
            {rest.map((path) => (
              <article
                key={path.slug}
                className="group grid grid-cols-[6rem_1fr] gap-4 border-b border-paper/15 py-5 sm:grid-cols-[7.5rem_1fr] sm:gap-5"
              >
                <button
                  type="button"
                  onClick={() => setSelected(path)}
                  className="relative aspect-[4/5] overflow-hidden border border-paper/15 bg-ink-2"
                  aria-label={`Lihat ${path.title}`}
                >
                  <Image
                    src={path.image}
                    alt=""
                    fill
                    placeholder="blur"
                    sizes="120px"
                    className={
                      path.comingSoon
                        ? "object-cover grayscale"
                        : "object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    }
                  />
                </button>

                <div className="flex min-w-0 flex-col justify-between py-0.5">
                  <div>
                    <MetaLine path={path} />
                    <h3 className="mt-2 font-heading text-[1.35rem] leading-[1.08] text-paper">
                      {path.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-text-muted">
                      {path.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[9px] text-text-muted">
                        {path.comingSoon ? "Status" : "Biaya"}
                      </p>
                      <p className="text-[13px] font-medium text-paper">
                        {path.price ? formatIDR(path.price) : path.priceLabel}
                      </p>
                    </div>
                    {path.comingSoon ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          openLead({ variant: "notify", interest: path.title })
                        }
                      >
                        Daftar tunggu
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelected(path)}
                        className="border-b border-soga/60 pb-0.5 text-[11px] text-soga transition-colors hover:border-paper hover:text-paper"
                      >
                        Lihat jalur
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {selected ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        >
          <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
            <div className="relative aspect-[16/7] bg-ink-2">
              <Image
                src={selected.image}
                alt={`Jalur ${selected.title}`}
                fill
                placeholder="blur"
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-ink/20 to-transparent" />
            </div>

            <div className="space-y-5 p-5 pt-3 sm:p-7 sm:pt-4">
              <DialogHeader className="gap-2">
                <p className="section-label">
                  {selected.level}, {selected.region}
                </p>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription className="text-paper-dim">
                  {selected.subtitle}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Pengajar", selected.teacher],
                  [
                    "Durasi",
                    selected.modules > 0
                      ? `${selected.modules} modul, ${selected.weeks} pekan`
                      : "Jadwal menyusul",
                  ],
                  [
                    "Biaya",
                    selected.price
                      ? formatIDR(selected.price)
                      : "Segera hadir",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border border-paper/15 p-3"
                  >
                    <p className="text-[9px] text-text-muted">{label}</p>
                    <p className="mt-1 text-[12px] font-medium text-paper">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-heading text-[1.1rem] text-paper">
                  Yang akan kamu capai
                </h3>
                <p className="mt-2 text-[13px] leading-[1.7] text-paper-dim">
                  {selected.outcome}
                </p>
              </div>

              <ul className="space-y-2.5">
                {selected.includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[13px] leading-relaxed text-paper-dim"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-dust" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-[11px] leading-relaxed text-text-muted">
                Sertifikat adalah sertifikat platform dengan kode verifikasi
                publik. Detail kurikulum dan jadwal dikonfirmasi sebelum
                pendaftaran.
              </p>

              <div className="flex flex-col-reverse gap-2 border-t border-paper/12 pt-4 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Tutup
                </Button>
                <Button
                  onClick={() =>
                    openLeadAfterClose(
                      selected.comingSoon
                        ? { variant: "notify", interest: selected.title }
                        : { variant: "student", interest: selected.title },
                    )
                  }
                >
                  {selected.comingSoon ? "Beri tahu saya" : "Daftar minat"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
