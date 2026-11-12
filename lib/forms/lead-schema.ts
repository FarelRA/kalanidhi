import { z } from "zod"

import { LEAD_INTENTS } from "../leads/options"

/**
 * Public lead validation. WhatsApp is the primary identity, so it is always
 * required; email is an optional secondary channel.
 */
export const leadSchema = z
  .object({
    intent: z.enum(LEAD_INTENTS),
    name: z.string().trim().max(120).optional(),
    email: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.email("Masukkan alamat email yang valid.").max(200).optional(),
    ),
    whatsapp: z
      .string()
      .trim()
      .min(1, "Nomor WhatsApp diperlukan.")
      .max(30, "Nomor WhatsApp terlalu panjang."),
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

export type LeadInput = z.infer<typeof leadSchema>
