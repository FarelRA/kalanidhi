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
        className="flex items-start gap-2.5 border-t border-indigo-dust/40 pt-3 text-xs leading-relaxed text-indigo-dust"
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
      <input type="hidden" name="interest" value="Kabar jalur & karya baru" />
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
      <div className="flex items-end gap-3 border-b border-paper/25 pb-2 focus-within:border-soga">
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
          className="h-8 rounded-none border-0 bg-transparent px-0 text-[14px] placeholder:text-text-muted focus-visible:ring-0"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="-mb-1 shrink-0 rounded-none border-0 border-b border-soga/60 px-1 text-soga hover:bg-transparent hover:text-paper"
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : null}
          {pending ? "Mengirim" : "Ikuti kabar"}
        </Button>
      </div>
      {state.status === "error" ? (
        <p id="newsletter-error" className="text-[11px] text-destructive" role="alert">
          {state.message} Periksa alamat emailmu.
        </p>
      ) : null}
      <p className="text-[10px] leading-relaxed text-text-muted">
        Kami hanya mengirim kabar jalur dan karya baru. Berhenti kapan saja.
      </p>
    </form>
  )
}
