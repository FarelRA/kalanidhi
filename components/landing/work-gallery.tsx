"use client"

import Image from "next/image"
import { Heart, QrCode } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { useOverlay } from "@/components/overlays/overlay-provider"
import { Button } from "@/components/ui/button"
import type { Work } from "@/lib/content/landing"
import { formatIDR } from "@/lib/format"
import { cn } from "cn"

type Filter = "semua" | "batik" | "layanan"

const filters: { value: Filter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "batik", label: "Kain & batik" },
  { value: "layanan", label: "Layanan acara" },
]

const spans = [
  "sm:col-span-1 lg:col-span-7",
  "sm:col-span-1 lg:col-span-5",
  "sm:col-span-1 lg:col-span-5",
  "sm:col-span-1 lg:col-span-7",
]

const ratios = ["aspect-[16/10]", "aspect-[4/5]", "aspect-[4/5]", "aspect-[16/10]"]

export function WorkGallery({ works }: { works: Work[] }) {
  const [filter, setFilter] = useState<Filter>("semua")
  const [saved, setSaved] = useState<string[]>([])
  const { openLead, openInfo } = useOverlay()

  const visible = useMemo(
    () =>
      filter === "semua"
        ? works
        : works.filter((work) => work.category === filter),
    [filter, works],
  )

  function toggleSaved(work: Work) {
    const isSaved = saved.includes(work.slug)
    setSaved(
      isSaved
        ? saved.filter((slug) => slug !== work.slug)
        : [...saved, work.slug],
    )
    toast(isSaved ? "Dihapus dari simpanan" : "Disimpan untuk nanti", {
      description: work.title,
    })
  }

  function handleBuy(work: Work) {
    openLead({ variant: "consultation", interest: work.title })
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Filter karya"
        className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-paper/12 pb-3"
      >
        {filters.map((option) => {
          const count =
            option.value === "semua"
              ? works.length
              : works.filter((work) => work.category === option.value).length
          const active = filter === option.value

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              className={cn(
                "border-b pb-0.5 text-[12px] transition-colors",
                active
                  ? "border-soga text-paper"
                  : "border-transparent text-paper-dim hover:border-paper/30 hover:text-paper",
              )}
            >
              {option.label} <span className="text-text-muted">({count})</span>
            </button>
          )
        })}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-12">
        {visible.map((work, index) => {
          const isSaved = saved.includes(work.slug)

          return (
            <article key={work.slug} className={spans[index % spans.length]}>
              <div className="group relative">
                <div
                  className={cn(
                    "relative overflow-hidden border border-paper/15 bg-ink-2",
                    ratios[index % ratios.length],
                  )}
                >
                  <Image
                    src={work.image}
                    alt={`${work.title}, karya ${work.maker}`}
                    fill
                    placeholder="blur"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 55vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toggleSaved(work)}
                  aria-pressed={isSaved}
                  aria-label={
                    isSaved
                      ? `Hapus ${work.title} dari simpanan`
                      : `Simpan ${work.title} untuk nanti`
                  }
                  className={cn(
                    "absolute right-3 top-3 flex size-8 items-center justify-center border bg-ink/65 backdrop-blur-sm transition-colors",
                    isSaved
                      ? "border-soga text-soga"
                      : "border-paper/25 text-paper hover:border-soga hover:text-soga",
                  )}
                >
                  <Heart
                    className={cn("size-3.5", isSaved && "fill-current")}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="mt-4 border-t border-paper/15 pt-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-muted">
                  <span className="text-soga">{work.technique}</span>
                  <span className="h-3 w-px bg-paper/15" aria-hidden="true" />
                  <span>{work.region}</span>
                </div>

                <h3 className="mt-2 font-heading text-[1.4rem] leading-[1.1] text-paper">
                  {work.title}
                </h3>
                <p className="mt-1 text-[11px] text-paper-dim">
                  {work.maker}, {work.makerRole}
                </p>

                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-text-muted">
                      {work.priceLabel ?? "Harga"}
                    </p>
                    <p className="font-heading text-[1.2rem] text-paper">
                      {formatIDR(work.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openInfo("verify")}
                      className="inline-flex items-center gap-1.5 border-b border-paper/25 pb-0.5 text-[10px] text-indigo-dust transition-colors hover:border-soga hover:text-soga"
                    >
                      <QrCode className="size-3" aria-hidden="true" />
                      {work.workCard}
                    </button>
                    <Button
                      type="button"
                      variant={work.kind === "service" ? "default" : "outline"}
                      size="xs"
                      onClick={() => handleBuy(work)}
                    >
                      {work.kind === "service" ? "Ajukan booking" : "Ajukan pesanan"}
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="mt-8 border border-paper/15 p-8 text-center">
          <p className="font-heading text-[1.4rem] text-paper">
            Belum ada karya pada pilihan ini.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-paper-dim">
            Tampilkan semua karya, atau tinggalkan email agar kami kabari saat
            karya baru terbit.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() =>
              openLead({ variant: "notify", interest: "Karya baru" })
            }
          >
            Beri tahu saya
          </Button>
        </div>
      ) : null}
    </div>
  )
}
