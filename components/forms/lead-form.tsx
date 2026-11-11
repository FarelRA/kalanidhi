"use client"

import { useActionState } from "react"
import {
  CircleCheck,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react"

import { submitLead } from "@/app/actions/lead"
import { initialLeadState, type LeadState } from "@/lib/forms/lead"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { LeadVariant } from "@/lib/content/types"
import { cn } from "cn"

type LeadFormProps = {
  variant: LeadVariant
  interest?: string
  source?: string
  onSuccess: () => void
}

const institutionTypes = [
  "Sekolah",
  "EO & wedding organizer",
  "Desa wisata & hotel",
  "Korporat",
  "Lainnya",
]

const interestOptions = [
  "Batik Tulis Soga",
  "Seni Pembawa Acara Tradisi Jawa",
  "Kriya Ukir Kayu Jepara",
  "Etika & hak budaya",
  "Untuk institusi",
  "Belum tahu, minta rekomendasi",
  "Pustaka & kalender mangsa",
  "Verifikasi sertifikat",
]

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p id={id} className="text-xs text-destructive" role="alert">
      {message}
    </p>
  )
}

const selectClassName =
  "h-11 w-full appearance-none rounded-[2px] border border-input bg-transparent px-3.5 pr-10 text-sm text-ink outline-none transition-colors focus-visible:border-thread focus-visible:ring-2 focus-visible:ring-thread/20 aria-invalid:border-destructive"

export function LeadForm({
  variant,
  interest,
  source = "landing",
  onSuccess,
}: LeadFormProps) {
  const [state, formAction, pending] = useActionState<LeadState, FormData>(
    submitLead,
    initialLeadState,
  )

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full border border-thread/30 bg-thread/[0.06] text-thread">
          <CircleCheck className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h3 className="font-heading text-[1.7rem] font-normal text-ink">Tercatat.</h3>
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-soft">
            {state.message}
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-muted">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Kami akan menghubungimu lewat email atau WhatsApp.
        </p>
        <Button type="button" onClick={onSuccess} className="mt-1" size="lg">
          Selesai
        </Button>
      </div>
    )
  }

  const errors = state.fieldErrors ?? {}
  const isInstitution = variant === "institution"
  const needsName = variant !== "notify"
  const selectableInterests =
    interest && !interestOptions.includes(interest)
      ? [interest, ...interestOptions]
      : interestOptions

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="intent" value={variant} />
      <input type="hidden" name="source" value={source} />

      <div
        aria-hidden="true"
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
      >
        <label htmlFor="lead-company-website">Jangan diisi</label>
        <input
          id="lead-company-website"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-[4px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      ) : null}

      <div className={cn("grid gap-4", isInstitution && "sm:grid-cols-2")}>
        {isInstitution ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="lead-institution">Nama institusi</Label>
            <Input
              id="lead-institution"
              name="institution"
              placeholder="Nama sekolah atau organisasi"
              autoComplete="organization"
              required
              aria-invalid={Boolean(errors.institution)}
              aria-describedby={
                errors.institution ? "lead-institution-error" : undefined
              }
            />
            <FieldError
              id="lead-institution-error"
              message={errors.institution}
            />
          </div>
        ) : null}

        <div className={cn("space-y-2", isInstitution && "sm:col-span-1")}>
          <Label htmlFor="lead-name">
            Nama{needsName ? "" : " (opsional)"}
          </Label>
          <Input
            id="lead-name"
            name="name"
            placeholder="Nama kamu"
            autoComplete="name"
            required={needsName}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "lead-name-error" : undefined}
          />
          <FieldError id="lead-name-error" message={errors.name} />
        </div>

        <div className={cn("space-y-2", isInstitution && "sm:col-span-1")}>
          <Label htmlFor="lead-email">Email</Label>
          <Input
            id="lead-email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="nama@email.com"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "lead-email-error" : undefined}
          />
          <FieldError id="lead-email-error" message={errors.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead-whatsapp">
            WhatsApp <span className="text-text-muted">(opsional)</span>
          </Label>
          <Input
            id="lead-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            placeholder="08xx xxxx xxxx"
            autoComplete="tel"
          />
        </div>

        {isInstitution ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="lead-institution-type">Jenis institusi</Label>
              <div className="relative">
                <select
                  id="lead-institution-type"
                  name="institutionType"
                  className={selectClassName}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Pilih jenis
                  </option>
                  {institutionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                  ▾
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-participants">Jumlah peserta</Label>
              <Input
                id="lead-participants"
                name="participants"
                type="number"
                min={1}
                max={10000}
                inputMode="numeric"
                placeholder="24"
                aria-invalid={Boolean(errors.participants)}
                aria-describedby={
                  errors.participants ? "lead-participants-error" : undefined
                }
              />
              <FieldError
                id="lead-participants-error"
                message={errors.participants}
              />
            </div>
          </>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lead-interest">
            {variant === "notify" ? "Yang ingin dipantau" : "Minat utama"}
          </Label>
          <div className="relative">
            <select
              id="lead-interest"
              name="interest"
              className={selectClassName}
              defaultValue={interest ?? ""}
            >
              <option value="">Pilih salah satu</option>
              {selectableInterests.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted">
              ▾
            </span>
          </div>
        </div>

        {variant === "consultation" || isInstitution ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="lead-message">
              {isInstitution ? "Kebutuhan program" : "Pertanyaanmu"}
              <span className="text-text-muted"> (opsional)</span>
            </Label>
            <Textarea
              id="lead-message"
              name="message"
              placeholder={
                isInstitution
                  ? "Jumlah sesi, tanggal, atau konteks budaya yang ingin dibahas."
                  : "Tulis singkat apa yang ingin kamu tanyakan."
              }
              maxLength={2000}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3 text-[11.5px] leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-border bg-transparent accent-thread"
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "lead-consent-error" : undefined}
          />
          <span>
            Saya setuju dihubungi lewat email atau WhatsApp untuk menindaklanjuti
            pendaftaran ini.
          </span>
        </label>
        <FieldError id="lead-consent-error" message={errors.consent} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" aria-hidden="true" />
            Mengirim…
          </>
        ) : (
          <>
            <Send aria-hidden="true" />
            {variant === "institution"
              ? "Minta penawaran"
              : variant === "notify"
                ? "Simpan pengingat"
                : variant === "consultation"
                  ? "Kirim pertanyaan"
                  : "Kirim pendaftaran"}
          </>
        )}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-text-muted">
        Data yang kamu kirim hanya dipakai untuk menindaklanjuti pendaftaran.
      </p>
    </form>
  )
}
