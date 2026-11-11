"use client"

import { useActionState } from "react"
import { CircleCheck, LoaderCircle } from "lucide-react"

import { submitLead } from "@/app/actions/lead"
import { initialLeadState, type LeadState } from "@/lib/forms/lead"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState<LeadState, FormData>(
    submitLead,
    initialLeadState,
  )

  if (state.status === "success") {
    return (
      <div
        className="flex items-start gap-2.5 border-t border-thread-light/40 pt-3 text-xs leading-relaxed text-thread-light"
        role="status"
        aria-live="polite"
      >
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {state.message}
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="intent" value="notify" />
      <input type="hidden" name="interest" value="Kabar jalur dan karya baru" />
      <input type="hidden" name="source" value="footer" />
      <input type="hidden" name="consent" value="on" />
      <div aria-hidden="true" className="hidden">
        <label htmlFor="newsletter-website">Jangan diisi</label>
        <input
          id="newsletter-website"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <label htmlFor="newsletter-email" className="sr-only">
        Alamat email untuk kabar jalur baru
      </label>
      <div className="flex items-end gap-3 border-b border-paper/30 pb-1 focus-within:border-thread-light">
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email untuk kabar jalur baru"
          required
          aria-invalid={state.status === "error"}
          aria-describedby={
            state.status === "error" ? "newsletter-error" : undefined
          }
          className="h-9 rounded-none border-0 bg-transparent px-0 text-[14px] text-paper placeholder:text-paper/60 focus-visible:ring-0"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="-mb-0.5 shrink-0 rounded-none border-0 border-b border-thread-light/60 px-1 text-thread-light hover:bg-transparent hover:text-paper"
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : null}
          {pending ? "Mengirim" : "Ikuti kabar"}
        </Button>
      </div>
      {state.status === "error" ? (
        <p id="newsletter-error" className="text-[11px] text-thread-light" role="alert">
          {state.message} Periksa alamat emailmu.
        </p>
      ) : null}
      <p className="text-[10px] leading-relaxed text-paper/60">
        Kami hanya mengirim kabar jalur dan karya baru. Berhenti kapan saja.
      </p>
    </form>
  )
}
