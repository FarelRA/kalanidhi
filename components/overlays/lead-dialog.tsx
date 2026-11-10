"use client"

import { BadgeCheck, Send } from "lucide-react"

import { LeadForm } from "@/components/forms/lead-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LeadRequest } from "@/lib/content/overlays"

const copy = {
  student: {
    title: "Daftar minat belajar",
    description:
      "Pilih jalur yang ingin kamu mulai. Tim KalaNidhi akan menghubungimu untuk jadwal dan langkah berikutnya.",
  },
  institution: {
    title: "Minta penawaran institusi",
    description:
      "Ceritakan kebutuhan kelas, tim, atau tamu. Tim institusi akan menyiapkan penawaran dan jadwal sesi.",
  },
  consultation: {
    title: "Tanya sebelum memesan",
    description:
      "Tanyakan ketersediaan, ukuran, jadwal, atau jalur yang paling cocok. Tim KalaNidhi akan menghubungimu.",
  },
  notify: {
    title: "Beri tahu saya",
    description:
      "Tinggalkan email agar kami bisa mengabari saat bagian ini dibuka.",
  },
} as const

export function LeadDialog({
  request,
  onClose,
}: {
  request: LeadRequest
  onClose: () => void
}) {
  const content = copy[request.variant]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="gap-3 pr-8">
          <span className="flex size-10 items-center justify-center rounded-xl border border-soga/30 bg-soga/10 text-soga">
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
