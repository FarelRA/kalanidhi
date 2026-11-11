import { v } from "convex/values"

import { WORKSPACE_ROLES } from "../../lib/access/capabilities"

export const roleValidator = v.union(
  ...WORKSPACE_ROLES.map((role) => v.literal(role)),
)

export const accountStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("invited"),
  v.literal("deleted"),
)

export const severityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("error"),
  v.literal("critical"),
)

/**
 * Deliberate JSON bag for provider payloads, snapshots, and settings.
 * These fields are validated at their domain boundary, never free-form
 * database editing. Use a typed object validator for anything the app reads.
 */
export const jsonBagValidator = v.any()
