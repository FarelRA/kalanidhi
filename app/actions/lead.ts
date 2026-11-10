"use server"

import { z } from "zod"

import type { LeadState } from "@/lib/forms/lead"

const leadSchema = z
  .object({
    intent: z.enum(["student", "institution", "consultation", "notify"]),
    name: z.string().trim().max(120).optional(),
    email: z.email("Masukkan alamat email yang valid.").max(200),
    whatsapp: z.string().trim().max(30).optional(),
    institution: z.string().trim().max(160).optional(),
    institutionType: z.string().trim().max(80).optional(),
    participants: z.preprocess(
      (value) => (value === "" || value == null ? undefined : Number(value)),
      z
        .number("Jumlah peserta harus berupa angka.")
        .int("Jumlah peserta harus bilangan bulat.")
        .min(1, "Minimal 1 peserta.")
        .max(10_000, "Maksimal 10.000 peserta.")
        .optional(),
    ),
    interest: z.string().trim().max(120).optional(),
    message: z.string().trim().max(2_000).optional(),
    consent: z.string().refine((value) => value === "on", {
      message: "Kamu perlu menyetujui untuk dihubungi.",
    }),
    source: z.string().trim().max(80).optional(),
    company_website: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.intent !== "notify" && !data.name) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Nama diperlukan agar kami bisa menyapa kamu.",
      })
    }

    if (data.intent === "institution" && !data.institution) {
      ctx.addIssue({
        code: "custom",
        path: ["institution"],
        message: "Nama institusi diperlukan.",
      })
    }
  })

export async function submitLead(
  _previousState: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const raw = Object.fromEntries(formData.entries())
  const parsed = leadSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}

    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form"
      fieldErrors[key] ??= issue.message
    }

    return {
      status: "error",
      message: "Ada isian yang perlu diperiksa.",
      fieldErrors,
    }
  }

  // Honeypot: silently accept bot submissions without doing anything.
  if (parsed.data.company_website) {
    return { status: "success", message: "Terima kasih." }
  }

  // TODO: Persist to the CRM or database once the backend is available.
  // Never log raw contact details in production.
  console.info("[lead]", {
    intent: parsed.data.intent,
    hasInstitution: Boolean(parsed.data.institution),
    hasWhatsapp: Boolean(parsed.data.whatsapp),
  })

  const messages: Record<typeof parsed.data.intent, string> = {
    student:
      "Pendaftaranmu tercatat. Kami akan menghubungi kamu untuk jadwal dan langkah berikutnya.",
    institution:
      "Permintaan penawaran tercatat. Tim institusi akan menghubungi kamu untuk membahas kebutuhan dan jadwal.",
    consultation:
      "Pertanyaanmu tercatat. Kami akan menghubungi kamu untuk membahas langkah berikutnya.",
    notify:
      "Kabar akan dikirim ke emailmu saat bagian ini dibuka.",
  }

  return { status: "success", message: messages[parsed.data.intent] }
}
