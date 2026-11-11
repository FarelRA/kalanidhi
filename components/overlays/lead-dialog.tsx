"use client"

import { BadgeCheck, Send } from "lucide-react"

import { LeadForm } from "@/components/forms/lead-form"
import { useReturnFocus } from "@/components/overlays/use-return-focus"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LeadDialogCopy, LeadRequest } from "@/lib/content/types"



export function LeadDialog({
  request,
  copy,
  onClose,
}: {
  request: LeadRequest
  copy: LeadDialogCopy
  onClose: () => void
}) {
  useReturnFocus()
  const content = copy[request.variant]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="gap-3 pr-8">
          <span className="flex size-10 items-center justify-center rounded-[2px] border border-thread/30 bg-thread/[0.06] text-thread">
            {request.variant === "notify" ? (
              <BadgeCheck className="size-5" aria-hidden="true" />
            ) : (
              <Send className="size-5" aria-hidden="true" />
            )}
          </span>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {content.description}
          </DialogDescription>
        </DialogHeader>
        <LeadForm
          key={`${request.variant}-${request.interest ?? ""}`}
          variant={request.variant}
          interest={request.interest}
          onSuccess={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
