"use client"

import Image from "next/image"
import { ArrowRight } from "lucide-react"

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
import type { SectionCopy, Teacher } from "@/lib/content/types"

export function TeacherDialog({
  teacher,
  copy,
  onClose,
}: {
  teacher: Teacher
  copy: SectionCopy["teachers"]
  onClose: () => void
}) {
  const { openLead } = useOverlay()
  useReturnFocus()

  function handleLead() {
    onClose()
    window.setTimeout(
      () =>
        openLead({
          variant: "consultation",
          interest: `Profil pengajar: ${teacher.name}`,
        }),
      220,
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[min(90svh,760px)] gap-5 border-2 border-ink bg-paper-2 sm:max-w-xl">
        <DialogHeader className="gap-2 pr-8">
          <span className="stamp stamp-soft w-fit border-copper-dark/50 text-copper-dark">
            {copy.dialogLabel}
          </span>
          <DialogTitle className="text-[1.9rem] leading-[1.02]">
            {teacher.name}
          </DialogTitle>
          <DialogDescription>
            {teacher.specialty}, {teacher.region}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[170px_1fr]">
          <div className="relative aspect-[4/5] overflow-hidden border-2 border-ink bg-panel">
            <Image
              src={teacher.image}
              alt={`Foto ${teacher.name}`}
              fill
              sizes="(min-width: 640px) 170px, 92vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-4">
            <blockquote className="border-l-2 border-copper pl-4 font-heading text-[1.25rem] italic leading-snug text-ink">
              &ldquo;{teacher.quote}&rdquo;
            </blockquote>
            <dl className="space-y-2.5 text-[12px]">
              {[
                ["Pengalaman", teacher.experience],
                ["Fokus", teacher.focus],
                ["Komunitas", teacher.community],
                ["Jalur", teacher.path],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[86px_1fr] gap-3">
                  <dt className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    {label}
                  </dt>
                  <dd className="font-semibold leading-snug text-ink/85">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ink/15 pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={handleLead}>
            {copy.askCta}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
