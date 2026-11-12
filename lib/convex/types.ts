export type LeadArgs = {
  intent: "student" | "institution" | "consultation" | "notify"
  name: string
  email?: string
  whatsapp?: string
  institution?: string
  institutionType?: string
  participants?: number
  interest?: string
  message?: string
  source?: string
  consent: boolean
}
