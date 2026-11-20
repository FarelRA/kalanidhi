import { ConvexError, v } from "convex/values"

import type { MediaAssetView, MediaUsage } from "../lib/admin/types"
import { now, requireAdmin, requireReason } from "./admin_context"
import { appendAudit } from "./audit"
import { requireViewer } from "./commerce_shared"
import { assemblePublishedSite } from "./content"
import type { Doc, Id } from "./_generated/dataModel"
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
])
const AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
])
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"])
const DOCUMENT_TYPES = new Set(["application/pdf"])

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_MEDIA_BYTES = 25 * 1024 * 1024

const kindValidator = v.union(
  v.literal("image"),
  v.literal("audio"),
  v.literal("video"),
  v.literal("document"),
)

function allowedMime(kind: Doc<"mediaAssets">["kind"], mime: string): boolean {
  if (mime === "image/svg+xml" || mime === "text/html") return false
  if (kind === "image") return IMAGE_TYPES.has(mime)
  if (kind === "audio") return AUDIO_TYPES.has(mime)
  if (kind === "video") return VIDEO_TYPES.has(mime)
  return DOCUMENT_TYPES.has(mime)
}

function extensionFor(filename: string): string {
  const index = filename.lastIndexOf(".")
  return index >= 0 ? filename.slice(index + 1).toLowerCase() : ""
}

function mimeMatchesExtension(mime: string, filename: string): boolean {
  const extension = extensionFor(filename)
  const expected: Record<string, string[]> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "image/avif": ["avif"],
    "image/gif": ["gif"],
    "audio/webm": ["webm"],
    "audio/ogg": ["ogg", "oga"],
    "audio/mpeg": ["mp3"],
    "audio/wav": ["wav"],
    "video/mp4": ["mp4"],
    "video/webm": ["webm"],
    "application/pdf": ["pdf"],
  }
  return (expected[mime] ?? []).includes(extension)
}

async function viewFor(
  ctx: QueryCtx | MutationCtx,
  document: Doc<"mediaAssets">,
): Promise<MediaAssetView> {
  const url = document.storageId
    ? await ctx.storage.getUrl(document.storageId)
    : (document.externalUrl ?? null)

  return {
    id: document._id,
    kind: document.kind,
    filename: document.filename,
    mimeType: document.mimeType,
    size: document.size,
    width: document.width ?? null,
    height: document.height ?? null,
    durationMs: document.durationMs ?? null,
    alt: document.alt,
    caption: document.caption ?? null,
    credit: document.credit ?? null,
    permission: document.permission ?? null,
    focalX: document.focalX ?? null,
    focalY: document.focalY ?? null,
    status: document.status,
    url,
    uploadedBy: document.uploadedBy,
    replacedBy: document.replacedBy ?? null,
    createdAt: document.createdAt,
    variants: document.variants ?? [],
  }
}

async function urlsFor(
  ctx: QueryCtx | MutationCtx,
  document: Doc<"mediaAssets">,
): Promise<string[]> {
  const urls = [
    document.externalUrl,
    document.storageId ? await ctx.storage.getUrl(document.storageId) : null,
  ].filter((value): value is string => Boolean(value))
  return urls
}

async function scanUsage(
  ctx: QueryCtx | MutationCtx,
  document: Doc<"mediaAssets">,
): Promise<MediaUsage> {
  const urls = await urlsFor(ctx, document)
  if (urls.length === 0) return { inUse: false, references: [] }

  const references: MediaUsage["references"] = []
  const site = await assemblePublishedSite(ctx)
  if (site) {
    const text = JSON.stringify(site)
    if (urls.some((url) => text.includes(url))) {
      references.push({ label: "Landing publik", source: "published" })
    }
  }

  const revisions = await ctx.db.query("contentRevisions").collect()
  for (const revision of revisions) {
    if (revision.status === "published") continue
    const text = JSON.stringify(revision.value)
    if (urls.some((url) => text.includes(url))) {
      references.push({
        label: `Draf v${revision.version}`,
        source: "draft",
      })
    }
  }

  const [works, paths, teachers] = await Promise.all([
    ctx.db.query("works").collect(),
    ctx.db.query("paths").collect(),
    ctx.db.query("teachers").collect(),
  ])
  if (works.some((work) => work.imageAssetId === document._id)) {
    references.push({ label: "Tabel karya", source: "entity" })
  }
  if (paths.some((path) => path.imageAssetId === document._id)) {
    references.push({ label: "Tabel kelas", source: "entity" })
  }
  if (teachers.some((teacher) => teacher.imageAssetId === document._id)) {
    references.push({ label: "Tabel pengajar", source: "entity" })
  }

  return { inUse: references.length > 0, references }
}

type SeedImageArgs = {
  filename: string
  storageId: Id<"_storage">
  mimeType: string
  size: number
  alt: string
  width?: number
  height?: number
  credit?: string
}

/**
 * Registers a seed image. Re-running the upload script updates the existing
 * row instead of creating duplicates, so the seed stays deterministic.
 */
async function insertSeedImage(ctx: MutationCtx, args: SeedImageArgs) {
  const filename = args.filename.trim()
  if (!filename) {
    throw new ConvexError({
      code: "SEED_IMAGE_FILENAME_REQUIRED",
      message: "Nama berkas seed wajib diisi.",
    })
  }
  if (!args.storageId) {
    throw new ConvexError({
      code: "SEED_IMAGE_STORAGE_REQUIRED",
      message: "Aset seed membutuhkan berkas di Convex storage.",
    })
  }

  const existing = await ctx.db
    .query("mediaAssets")
    .withIndex("by_kind", (q) => q.eq("kind", "image"))
    .collect()
  const match = existing
    .filter((asset) => asset.filename === filename && asset.status === "active")
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
      return String(a._id).localeCompare(String(b._id))
    })[0]
  if (match) {
    await ctx.db.patch(match._id, {
      storageId: args.storageId,
      mimeType: args.mimeType,
      size: args.size,
      width: args.width ?? match.width,
      height: args.height ?? match.height,
      credit: args.credit ?? match.credit,
      alt: args.alt.trim() || match.alt,
    })
    return match._id
  }

  return await ctx.db.insert("mediaAssets", {
    kind: "image",
    storageId: args.storageId,
    filename,
    mimeType: args.mimeType,
    size: args.size,
    width: args.width,
    height: args.height,
    alt: args.alt.trim() || filename,
    credit: args.credit,
    status: "active",
    uploadedBy: "system",
    createdAt: now(),
  })
}

export const registerSeedImage = internalMutation({
  args: {
    filename: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    size: v.number(),
    alt: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    credit: v.optional(v.string()),
  },
  handler: async (ctx, args) => await insertSeedImage(ctx, args),
})

/**
 * Public wrapper used by `scripts/upload-images.mjs`. Convex internal
 * mutations cannot be reached through the HTTP client, so the seed script
 * needs a public entry point; it is guarded by an admin key at the deployment
 * edge and is otherwise idempotent.
 */
export const registerSeedImageUpload = mutation({
  args: {
    token: v.optional(v.string()),
    filename: v.string(),
    storageId: v.id("_storage"),
    mimeType: v.string(),
    size: v.number(),
    alt: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    credit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertSeedSecret(args.token)
    return await insertSeedImage(ctx, args)
  },
})

/**
 * Known intrinsic metadata for the checked-in seed plates. The uploader reads
 * the same values, and the seed-run prune backfills them for an older registry.
 */
const SEED_IMAGE_METADATA: Record<
  string,
  { width: number; height: number; credit: string }
> = {
  "chat-lembar-pola.webp": { width: 1200, height: 900, credit: "Dokumentasi kelas Batik Bambu" },
  "hero-canting.webp": { width: 1600, height: 900, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-canting.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-pengertian.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-alat.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-bidang.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-lengkung.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-latihan-pola.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-celah.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-isen.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-canting-pegangan.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-latihan-garis.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-mbabar.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-nembok.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-warna-dasar.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-dua-warna.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-nglorod.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-mepe.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-finishing.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-mutu.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-keselamatan.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-benda.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-catatan.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-biaya.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-bambu-ujian.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "lesson-mola.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "path-aksara-jawa.webp": { width: 1600, height: 1000, credit: "Arsip KalaNidhi Digital" },
  "path-batik-bambu.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "path-batik-tulis-giriloyo.webp": { width: 1600, height: 1000, credit: "Arsip KalaNidhi Digital" },
  "path-gerabah-bantul.webp": { width: 1600, height: 1000, credit: "Arsip KalaNidhi Digital" },
  "path-kuliner-nusantara.webp": { width: 1600, height: 1000, credit: "Arsip KalaNidhi Digital" },
  "path-pranatacara.webp": { width: 1600, height: 1000, credit: "Arsip KalaNidhi Digital" },
  "path-tari-kreasi.webp": { width: 1600, height: 1000, credit: "Arsip KalaNidhi Digital" },
  "teacher-gerabah.webp": { width: 1200, height: 1500, credit: "Arsip KalaNidhi Digital" },
  "teacher-hardjono.webp": { width: 1200, height: 1500, credit: "Arsip KalaNidhi Digital" },
  "teacher-kuliner-nusantara.webp": { width: 1200, height: 1500, credit: "Arsip KalaNidhi Digital" },
  "teacher-sriningsih.webp": { width: 1200, height: 1500, credit: "Dokumentasi kelas Batik Bambu" },
  "teacher-sudarsono.webp": { width: 1200, height: 1500, credit: "Arsip KalaNidhi Digital" },
  "teacher-suwardi.webp": { width: 1200, height: 1500, credit: "Arsip KalaNidhi Digital" },
  "teacher-tari-kreasi.webp": { width: 1200, height: 1500, credit: "Arsip KalaNidhi Digital" },
  "work-aksara.webp": { width: 1400, height: 760, credit: "Arsip KalaNidhi Digital" },
  "work-bambu-kotak-bundar.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "work-bambu-hiasan.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "work-bambu-nampan.webp": { width: 1600, height: 1200, credit: "Dokumentasi kelas Batik Bambu" },
  "work-kuliner-nusantara.webp": { width: 1400, height: 760, credit: "Arsip KalaNidhi Digital" },
  "work-pranatacara.webp": { width: 1400, height: 760, credit: "Arsip KalaNidhi Digital" },
  "work-tari-kreasi.webp": { width: 1400, height: 760, credit: "Arsip KalaNidhi Digital" },
}

/**
 * Archives duplicate and stale seed images without touching an asset that a
 * content row still references. The uploader calls this after registering the
 * files on disk, so the live registry converges on one active row per file.
 */
async function pruneSeedImages(
  ctx: MutationCtx,
  keepFilenames: string[],
  dryRun: boolean,
): Promise<{ archived: number; active: number; kept: string[] }> {
  const keep = new Set(keepFilenames.map((name) => name.trim()))
  // Prune every kind, not just images. A stale audio or video row would
  // otherwise survive every reseed and break the one-file-one-row invariant.
  const assets = await ctx.db.query("mediaAssets").collect()

  const [works, paths, teachers, lessons, site, revisions] = await Promise.all([
    ctx.db.query("works").collect(),
    ctx.db.query("paths").collect(),
    ctx.db.query("teachers").collect(),
    ctx.db.query("lessons").collect(),
    ctx.db.query("siteContent").collect(),
    ctx.db.query("contentRevisions").collect(),
  ])
  const referenced = new Set<string>()
  for (const row of works) if (row.imageAssetId) referenced.add(row.imageAssetId)
  for (const row of paths) if (row.imageAssetId) referenced.add(row.imageAssetId)
  for (const row of teachers) {
    if (row.imageAssetId) referenced.add(row.imageAssetId)
  }
  for (const row of lessons) {
    for (const id of row.mediaAssetIds) referenced.add(id)
  }
  const contentText = JSON.stringify([site, revisions])
  for (const asset of assets) {
    if (referenced.has(asset._id)) continue
    for (const url of await urlsFor(ctx, asset)) {
      if (contentText.includes(url)) {
        referenced.add(asset._id)
        break
      }
    }
  }

  const seen = new Set<string>()
  const active = assets
    .filter((asset) => asset.status === "active")
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
      return String(a._id).localeCompare(String(b._id))
    })
  let archived = 0
  const kept: string[] = []
  for (const asset of active) {
    const firstForFilename = keep.has(asset.filename) && !seen.has(asset.filename)
    if (firstForFilename) seen.add(asset.filename)
    if (firstForFilename || referenced.has(asset._id)) {
      kept.push(asset.filename)
      // Only backfill what the uploader could not read. It now records real
      // dimensions from the optimized WebP, so never overwrite those.
      const metadata = SEED_IMAGE_METADATA[asset.filename]
      if (metadata) {
        const patch: { width?: number; height?: number; credit?: string } = {}
        if (!asset.width && metadata.width) patch.width = metadata.width
        if (!asset.height && metadata.height) patch.height = metadata.height
        if (!asset.credit && metadata.credit) patch.credit = metadata.credit
        if (!dryRun && Object.keys(patch).length > 0) {
          await ctx.db.patch(asset._id, patch)
        }
      }
      continue
    }
    archived += 1
    if (!dryRun) await ctx.db.patch(asset._id, { status: "archived" })
  }

  return {
    archived,
    active: active.length - archived,
    kept: Array.from(new Set(kept)).sort(),
  }
}

export const pruneSeedImageUploads = mutation({
  args: {
    token: v.optional(v.string()),
    keepFilenames: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertSeedSecret(args.token)
    return await pruneSeedImages(
      ctx,
      args.keepFilenames,
      args.dryRun ?? false,
    )
  },
})

/** Seed-run wrapper; the uploader uses the public token-guarded variant. */
export const pruneSeedImagesInternal = internalMutation({
  args: {
    keepFilenames: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) =>
    await pruneSeedImages(ctx, args.keepFilenames, args.dryRun ?? false),
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx, "content.publish")
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Sellers upload work photos without the admin content capability. The
 * resulting asset is owned by the seller and can only be attached to their
 * own work cards.
 */
export const generateWorkImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireViewer(ctx, "sell")
    return await ctx.storage.generateUploadUrl()
  },
})

export const saveWorkImage = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    alt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "sell")
    if (!allowedMime("image", args.mimeType)) {
      throw new ConvexError({
        code: "MEDIA_TYPE_REJECTED",
        message: `Tipe ${args.mimeType} tidak diizinkan untuk foto karya.`,
      })
    }
    if (!mimeMatchesExtension(args.mimeType, args.filename)) {
      throw new ConvexError({
        code: "MEDIA_EXTENSION_MISMATCH",
        message: "Ekstensi berkas tidak cocok dengan tipe MIME.",
      })
    }
    if (args.size <= 0 || args.size > MAX_IMAGE_BYTES) {
      throw new ConvexError({
        code: "MEDIA_SIZE_REJECTED",
        message: `Ukuran foto harus antara 1 dan ${MAX_IMAGE_BYTES} byte.`,
      })
    }
    const url = await ctx.storage.getUrl(args.storageId)
    if (!url) {
      throw new ConvexError({
        code: "MEDIA_NOT_FOUND",
        message: "Berkas unggahan tidak ditemukan di Convex storage.",
      })
    }

    const assetId = await ctx.db.insert("mediaAssets", {
      kind: "image",
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      alt: args.alt?.trim() || args.filename,
      status: "active",
      uploadedBy: viewer.userId,
      createdAt: now(),
    })

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "media.workImage.save",
      entityType: "mediaAssets",
      entityId: assetId,
      reason: "Penjual mengunggah foto karya.",
      after: { filename: args.filename, size: args.size },
    })

    return { assetId, url }
  },
})

/**
 * Optional shared secret for the seed upload endpoints. When it is set on the
 * Convex deployment, the script must send the same value.
 */
function assertSeedSecret(token: string | undefined): void {
  const expected = process.env.SEED_UPLOAD_SECRET
  if (!expected) return
  if (token !== expected) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Token unggah seed tidak cocok.",
    })
  }
}

/**
 * Upload URL for the seed script. The script authenticates with the
 * self-hosted admin key, which is not an application user, so it cannot pass
 * `requireAdmin`. Registration still goes through `registerSeedImageUpload`.
 */
export const generateSeedUploadUrl = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    assertSeedSecret(args.token)
    return await ctx.storage.generateUploadUrl()
  },
})

export const saveAsset = mutation({
  args: {
    kind: kindValidator,
    storageId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    alt: v.string(),
    caption: v.optional(v.string()),
    credit: v.optional(v.string()),
    permission: v.optional(v.string()),
    focalX: v.optional(v.number()),
    focalY: v.optional(v.number()),
    variants: v.optional(
      v.array(
        v.object({
          label: v.string(),
          url: v.string(),
          width: v.number(),
          height: v.number(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    if (!args.storageId && !args.externalUrl) {
      throw new ConvexError({
        code: "MEDIA_SOURCE_REQUIRED",
        message: "Aset membutuhkan berkas unggahan atau URL eksternal.",
      })
    }
    if (!allowedMime(args.kind, args.mimeType)) {
      throw new ConvexError({
        code: "MEDIA_TYPE_REJECTED",
        message: `Tipe ${args.mimeType} tidak diizinkan untuk ${args.kind}.`,
      })
    }
    if (!mimeMatchesExtension(args.mimeType, args.filename)) {
      throw new ConvexError({
        code: "MEDIA_EXTENSION_MISMATCH",
        message: "Ekstensi berkas tidak cocok dengan tipe MIME.",
      })
    }
    const limit = args.kind === "image" ? MAX_IMAGE_BYTES : MAX_MEDIA_BYTES
    if (args.size <= 0 || args.size > limit) {
      throw new ConvexError({
        code: "MEDIA_SIZE_REJECTED",
        message: `Ukuran berkas harus antara 1 dan ${limit} byte.`,
      })
    }
    if (args.kind === "image" && args.alt.trim().length === 0) {
      throw new ConvexError({
        code: "MEDIA_ALT_REQUIRED",
        message: "Teks alternatif wajib untuk gambar.",
      })
    }
    if (args.externalUrl && !/^https?:\/\//.test(args.externalUrl)) {
      throw new ConvexError({
        code: "MEDIA_URL_REJECTED",
        message: "URL aset harus http atau https.",
      })
    }

    const id = await ctx.db.insert("mediaAssets", {
      kind: args.kind,
      storageId: args.storageId,
      externalUrl: args.externalUrl,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      width: args.width,
      height: args.height,
      durationMs: args.durationMs,
      alt: args.alt.trim(),
      caption: args.caption,
      credit: args.credit,
      permission: args.permission,
      focalX: args.focalX,
      focalY: args.focalY,
      variants: args.variants,
      status: "active",
      uploadedBy: viewer.userId,
      createdAt: now(),
    })

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "media.save",
      entityType: "mediaAssets",
      entityId: id,
      reason: "Menambahkan aset media",
      after: { filename: args.filename, kind: args.kind },
    })

    return id
  },
})

export const updateAsset = mutation({
  args: {
    id: v.id("mediaAssets"),
    alt: v.optional(v.string()),
    caption: v.optional(v.string()),
    credit: v.optional(v.string()),
    permission: v.optional(v.string()),
    focalX: v.optional(v.number()),
    focalY: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const reason = requireReason(args.reason)
    const asset = await ctx.db.get(args.id)
    if (!asset) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Aset tidak ada." })
    }
    if (
      asset.kind === "image" &&
      args.alt !== undefined &&
      args.alt.trim().length === 0
    ) {
      throw new ConvexError({
        code: "MEDIA_ALT_REQUIRED",
        message: "Teks alternatif wajib untuk gambar.",
      })
    }

    await ctx.db.patch(asset._id, {
      alt: args.alt?.trim() ?? asset.alt,
      caption: args.caption ?? asset.caption,
      credit: args.credit ?? asset.credit,
      permission: args.permission ?? asset.permission,
      focalX: args.focalX ?? asset.focalX,
      focalY: args.focalY ?? asset.focalY,
      status: args.status ?? asset.status,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "media.update",
      entityType: "mediaAssets",
      entityId: asset._id,
      reason,
      before: { alt: asset.alt, status: asset.status },
      after: {
        alt: args.alt ?? asset.alt,
        status: args.status ?? asset.status,
      },
    })
    return null
  },
})

export const replaceAsset = mutation({
  args: {
    id: v.id("mediaAssets"),
    storageId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const reason = requireReason(args.reason)
    const asset = await ctx.db.get(args.id)
    if (!asset) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Aset tidak ada." })
    }
    if (!args.storageId && !args.externalUrl) {
      throw new ConvexError({
        code: "MEDIA_SOURCE_REQUIRED",
        message: "Aset pengganti membutuhkan berkas atau URL.",
      })
    }
    if (!allowedMime(asset.kind, args.mimeType)) {
      throw new ConvexError({
        code: "MEDIA_TYPE_REJECTED",
        message: `Tipe ${args.mimeType} tidak diizinkan.`,
      })
    }
    if (!mimeMatchesExtension(args.mimeType, args.filename)) {
      throw new ConvexError({
        code: "MEDIA_EXTENSION_MISMATCH",
        message: "Ekstensi berkas tidak cocok dengan tipe MIME.",
      })
    }

    await ctx.db.patch(asset._id, {
      storageId: args.storageId,
      externalUrl: args.externalUrl,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      width: args.width ?? asset.width,
      height: args.height ?? asset.height,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "media.replace",
      entityType: "mediaAssets",
      entityId: asset._id,
      reason,
      before: { filename: asset.filename },
      after: { filename: args.filename },
    })
    return null
  },
})

export const removeAsset = mutation({
  args: { id: v.id("mediaAssets"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "content.publish")
    const reason = requireReason(args.reason)
    const asset = await ctx.db.get(args.id)
    if (!asset) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Aset tidak ada." })
    }
    if (asset.status === "archived") return null

    const usage = await scanUsage(ctx, asset)
    if (usage.inUse) {
      throw new ConvexError({
        code: "MEDIA_IN_USE",
        message: "Aset masih dipakai. Ganti referensinya sebelum menghapus.",
        references: usage.references,
      })
    }

    await ctx.db.patch(asset._id, { status: "archived" })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "media.remove",
      entityType: "mediaAssets",
      entityId: asset._id,
      reason,
      before: { status: asset.status },
      after: { status: "archived" },
    })
    return null
  },
})

export const listAssets = query({
  args: {},
  handler: async (ctx): Promise<MediaAssetView[]> => {
    await requireAdmin(ctx, "content.publish")
    const assets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200)
    return await Promise.all(assets.map((asset) => viewFor(ctx, asset)))
  },
})

export const getAsset = query({
  args: { id: v.id("mediaAssets") },
  handler: async (ctx, args): Promise<MediaAssetView | null> => {
    await requireAdmin(ctx, "content.publish")
    const asset = await ctx.db.get(args.id)
    return asset ? await viewFor(ctx, asset) : null
  },
})

export const getUsage = query({
  args: { id: v.id("mediaAssets") },
  handler: async (ctx, args): Promise<MediaUsage> => {
    await requireAdmin(ctx, "content.publish")
    const asset = await ctx.db.get(args.id)
    if (!asset) return { inUse: false, references: [] }
    return await scanUsage(ctx, asset)
  },
})
