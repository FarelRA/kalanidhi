import type { Doc, Id } from "../../_generated/dataModel"
import type { QueryCtx } from "../../_generated/server"
type LookupCtx = Pick<QueryCtx, "db">

function missing(label: string, key: string): Error {
  return new Error(`Seed ${label} missing: ${key}`)
}

export async function userByEmail(
  ctx: LookupCtx,
  email: string,
): Promise<Doc<"users">> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique()
  if (!user) throw missing("user", email)
  return user
}

/**
 * The live admin row is tied to a Better Auth subject, so it must be resolved
 * by role instead of by a mailbox the seed controls.
 */
export async function seedAdmin(ctx: LookupCtx): Promise<Doc<"users">> {
  const users = await ctx.db.query("users").collect()
  const admin = users.find(
    (user) => user.roles.includes("admin") && user.status === "active",
  )
  if (!admin) throw new Error("Seed admin missing")
  return admin
}

export async function workBySlug(
  ctx: LookupCtx,
  slug: string,
): Promise<Doc<"works">> {
  const work = await ctx.db
    .query("works")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (!work) throw missing("work", slug)
  return work
}

export async function cohortByCode(
  ctx: LookupCtx,
  code: string,
): Promise<Doc<"cohorts">> {
  const cohorts = await ctx.db.query("cohorts").collect()
  const cohort = cohorts.find((item) => item.code === code)
  if (!cohort) throw missing("cohort", code)
  return cohort
}

export async function orderByCode(
  ctx: LookupCtx,
  code: string,
): Promise<Doc<"orders">> {
  const order = await ctx.db
    .query("orders")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique()
  if (!order) throw missing("order", code)
  return order
}

export async function submissionByCode(
  ctx: LookupCtx,
  code: string,
): Promise<Doc<"submissions">> {
  const submission = await ctx.db
    .query("submissions")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique()
  if (!submission) throw missing("submission", code)
  return submission
}

export async function certificateByCode(
  ctx: LookupCtx,
  code: string,
): Promise<Doc<"certificates">> {
  const certificate = await ctx.db
    .query("certificates")
    .withIndex("by_publicCode", (q) => q.eq("publicCode", code))
    .unique()
  if (!certificate) throw missing("certificate", code)
  return certificate
}

export async function pathBySlug(
  ctx: LookupCtx,
  slug: string,
): Promise<Doc<"paths">> {
  const path = await ctx.db
    .query("paths")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (!path) throw missing("path", slug)
  return path
}

export async function conversationByTitle(
  ctx: LookupCtx,
  title: string,
): Promise<Doc<"conversations">> {
  const conversations = await ctx.db.query("conversations").collect()
  const conversation = conversations.find((item) => item.title === title)
  if (!conversation) throw missing("conversation", title)
  return conversation
}

/** Open paths only: not archived, not coming soon, with a teacher and price. */
export function isOpenPath(path: Doc<"paths">): boolean {
  if (path.comingSoon === true) return false
  const status = String(path.status ?? "open")
  if (status === "archived" || status === "planned" || status === "mapping") {
    return false
  }
  if (status !== "open" && status !== "published") return false
  return Boolean(path.teacherId) && (path.price ?? 0) > 0
}

export type OpenPath = Doc<"paths"> & {
  teacherId: Id<"users">
  price: number
}

/**
 * Every path a growth learner can enroll in, with its teacher still present.
 * The teacher lookup is per-path instead of collecting the whole user table.
 */
export async function openPaths(ctx: LookupCtx): Promise<OpenPath[]> {
  const paths = await ctx.db.query("paths").withIndex("by_order").collect()
  const open: OpenPath[] = []
  for (const path of paths) {
    if (!isOpenPath(path) || path.teacherId === undefined) continue
    const teacher = await ctx.db.get(path.teacherId as Id<"users">)
    if (!teacher) continue
    open.push({
      ...path,
      teacherId: path.teacherId as Id<"users">,
      price: path.price as number,
    })
  }
  return open
}
