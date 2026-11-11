"use client"

import type * as React from "react"
import {
  Building2,
  CalendarDays,
  Check,
  FileText,
  Info,
  Lock,
  LogIn,
  QrCode,
  ShieldCheck,
} from "lucide-react"

import { useReturnFocus } from "@/components/overlays/use-return-focus"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  infoContent,
  type InfoContent,
  type InfoKey,
  type LeadRequest,
} from "@/lib/content/overlays"

const icons: Record<
  InfoContent["icon"],
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  policy: ShieldCheck,
  login: LogIn,
  calendar: CalendarDays,
  verify: QrCode,
  about: Building2,
  privacy: Lock,
  terms: FileText,
}

export function InfoDialog({
  infoKey,
  onClose,
  onLeadAction,
}: {
  infoKey: InfoKey
  onClose: () => void
  onLeadAction: (request: LeadRequest) => void
}) {
  useReturnFocus()
  const content = infoContent[infoKey]
  const Icon = icons[content.icon] ?? Info

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="gap-3 pr-8">
          <span className="flex size-10 items-center justify-center rounded-[2px] border border-thread/30 bg-thread/[0.06] text-thread">
            <Icon className="size-5" aria-hidden />
          </span>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {content.bullets?.length ? (
          <ul className="space-y-2.5">
            {content.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-thread/10 text-thread">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}

        {content.footnote ? (
          <p className="rounded-[4px] border border-ink/20 px-3.5 py-3 text-[11px] leading-relaxed text-ink-muted">
            {content.footnote}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {content.action ? (
            <Button onClick={() => onLeadAction(content.action!.lead)}>
              {content.action.label}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
