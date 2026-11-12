"use server"

import type { LeadArgs } from "@/lib/convex/types"
import type { LeadState } from "@/lib/forms/lead"
import { leadSchema } from "@/lib/forms/lead-schema"
import { isConvexConfigured, persistLead } from "@/lib/convex/server"

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

  const lead: LeadArgs = {
    intent: parsed.data.intent,
    name: parsed.data.name,
    email: parsed.data.email,
    whatsapp: parsed.data.whatsapp,
    institution: parsed.data.institution,
    institutionType: parsed.data.institutionType,
    participants: parsed.data.participants,
    interest: parsed.data.interest,
    message: parsed.data.message,
    source: parsed.data.source,
    consent: parsed.data.consent === "on",
  }

  const stored = await persistLead(lead)

  if (isConvexConfigured() && !stored) {
    return {
      status: "error",
      message:
        "Pendaftaranmu belum bisa disimpan. Coba lagi sebentar, atau hubungi kami lewat WhatsApp.",
    }
  }

  const messages: Record<typeof parsed.data.intent, string> = {
    student:
      "Pendaftaranmu tercatat. Kami akan menghubungi kamu untuk jadwal dan langkah berikutnya.",
    institution:
      "Permintaan penawaran tercatat. Tim institusi akan menghubungi kamu untuk membahas kebutuhan dan jadwal.",
    consultation:
      "Pertanyaanmu tercatat. Kami akan menghubungi kamu untuk membahas langkah berikutnya.",
    notify:
      "Kabar akan dikirim ke WhatsApp-mu saat bagian ini dibuka.",
  }

  return { status: "success", message: messages[parsed.data.intent] }
}
