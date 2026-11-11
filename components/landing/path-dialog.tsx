"use client"

import Image from "next/image"
import { ArrowRight, Check } from "lucide-react"

import { useOverlay } from "@/components/overlays/overlay-provider"
import { useReturnFocus } from "@/components/overlays/use-return-focus"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LearningPath, SectionCopy } from "@/lib/content/types"
import { formatIDR } from "@/lib/format"

export function PathDialog({
  path,
  copy,
  onClose,
}: {
  path: LearningPath
  copy: SectionCopy["paths"]
  onClose: () => void
}) {
  const { openLead } = useOverlay()
  useReturnFocus()

  function handleLead() {
    onClose()
    window.setTimeout(
      () =>
        openLead(
          path.comingSoon
            ? { variant: "notify", interest: path.title }
            : { variant: "student", interest: path.title },
        ),
      220,
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[min(90svh,780px)] gap-5 border-2 border-ink bg-paper-2 sm:max-w-2xl">
        <DialogHeader className="gap-2 pr-8">
          <span className="stamp stamp-soft w-fit border-copper-dark/50 text-copper-dark">
            {path.code}
          </span>
          <DialogTitle className="text-[1.9rem] leading-[1.02]">
            {path.title}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {path.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[16/9] overflow-hidden border border-ink/20 bg-panel">
          <Image
            src={path.image}
            alt={`Suasana jalur ${path.title}`}
            fill
            sizes="(min-width: 640px) 640px, 92vw"
            className="object-cover"
          />
          {path.comingSoon ? (
            <span className="stamp absolute left-3 top-3 bg-paper-2 text-ink">
              {path.priceLabel}
            </span>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="font-heading text-[1.15rem]">Hasil akhir</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink/70">
              {path.outcome}
            </p>
          </div>
          <div>
            <h3 className="font-heading text-[1.15rem]">Yang kamu dapat</h3>
            <ul className="mt-2 space-y-1.5">
              {path.includes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-[12px] leading-relaxed text-ink/70"
                >
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-copper-dark"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-y border-ink/15 py-3 text-[11.5px] sm:grid-cols-4">
          {[
            ["Pengajar", path.teacher],
            ["Daerah", path.region],
            ["Level", path.level],
            [
              "Isi",
              path.comingSoon
                ? copy.curriculumPending
                : `${path.modules} modul, ${path.weeks} pekan`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                {label}
              </dt>
              <dd className="mt-1 font-semibold leading-snug">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3 border-t border-ink/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {path.comingSoon ? copy.statusLabel : copy.priceLabel}
            </p>
            <p className="mt-1 font-heading text-[1.55rem] leading-none">
              {path.price ? formatIDR(path.price) : path.priceLabel}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
            <Button onClick={handleLead}>
              {path.comingSoon ? copy.plannedCta : copy.openCta}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
