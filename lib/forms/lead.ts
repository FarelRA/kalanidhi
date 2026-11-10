export type LeadState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: Record<string, string>
}

export const initialLeadState: LeadState = { status: "idle" }
