import { describe, expect, it } from "vitest"

import { leadSchema } from "../lib/forms/lead-schema"

const base = {
  intent: "student",
  name: "Wahyu Pratama",
  whatsapp: "0812 3456 7890",
  consent: "on",
}

describe("lead form validation", () => {
  it("accepts a lead with WhatsApp and no email", () => {
    const parsed = leadSchema.safeParse(base)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.email).toBeUndefined()
      expect(parsed.data.whatsapp).toBe("0812 3456 7890")
    }
  })

  it("treats an empty email as absent", () => {
    const parsed = leadSchema.safeParse({ ...base, email: "   " })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.email).toBeUndefined()
  })

  it("still validates a provided email", () => {
    expect(
      leadSchema.safeParse({ ...base, email: "bukan-email" }).success,
    ).toBe(false)
    expect(
      leadSchema.safeParse({ ...base, email: "wahyu@example.test" }).success,
    ).toBe(true)
  })

  it("requires WhatsApp", () => {
    const parsed = leadSchema.safeParse({ ...base, whatsapp: "" })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Nomor WhatsApp diperlukan.")
    }
  })

  it("keeps institution and notify rules", () => {
    expect(
      leadSchema.safeParse({
        ...base,
        intent: "institution",
        institution: "",
      }).success,
    ).toBe(false)
    expect(
      leadSchema.safeParse({
        intent: "notify",
        whatsapp: "0812",
        consent: "on",
      }).success,
    ).toBe(true)
  })
})
