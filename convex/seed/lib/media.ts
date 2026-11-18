import { ConvexError } from "convex/values"

import type { Doc, Id } from "../../_generated/dataModel"
import type { MutationCtx } from "../../_generated/server"

type MediaCtx = Pick<MutationCtx, "db" | "storage">

type MediaKind = Doc<"mediaAssets">["kind"]

/**
 * Resolves a bare seed filename to one active media asset.
 *
 * There is no filename index, so the kind index narrows the scan and the
 * oldest active row wins. That keeps the mapping deterministic when a file was
 * re-uploaded: the first active asset is always the one the seed references.
 */
export async function resolveMediaAsset(
  ctx: Pick<MutationCtx, "db">,
  filename: string,
  kind: MediaKind = "image",
): Promise<Id<"mediaAssets">> {
  const candidates = await ctx.db
    .query("mediaAssets")
    .withIndex("by_kind", (q) => q.eq("kind", kind))
    .collect()
  const asset = candidates
    .filter((row) => row.status === "active" && row.filename === filename)
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
      return String(a._id).localeCompare(String(b._id))
    })[0]
  if (!asset) {
    throw new ConvexError({
      code: "SEED_IMAGE_MISSING",
      message: `Aset seed "${filename}" (${kind}) belum ada di mediaAssets. Jalankan scripts/upload-images.mjs lalu ulangi seed.`,
    })
  }
  return asset._id
}

/** The public URL of an asset, whether stored in Convex or external. */
export async function mediaUrl(
  ctx: MediaCtx,
  assetId: Id<"mediaAssets">,
): Promise<string> {
  const asset = await ctx.db.get(assetId)
  const url = asset
    ? asset.storageId
      ? await ctx.storage.getUrl(asset.storageId)
      : asset.externalUrl
    : null
  if (!url) {
    throw new ConvexError({
      code: "SEED_IMAGE_MISSING",
      message: `Aset "${asset?.filename ?? assetId}" tidak punya URL penyimpanan. Unggah ulang gambar seed.`,
    })
  }
  return url
}

/**
 * A storage id for task evidence. Reuses the oldest active image so evidence
 * rows never upload the same blob again; a fresh blob is only stored when the
 * seed has no image at all.
 */
export async function evidenceStorageId(
  ctx: MediaCtx,
): Promise<Id<"_storage">> {
  const images = await ctx.db
    .query("mediaAssets")
    .withIndex("by_kind", (q) => q.eq("kind", "image"))
    .collect()
  const image = images
    .filter((asset) => asset.status === "active" && asset.storageId)
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
      return String(a._id).localeCompare(String(b._id))
    })[0]
  if (image?.storageId) return image.storageId
  return await ctx.storage.store(
    new Blob(["KalaNidhi seed evidence"], { type: "image/jpeg" }),
  )
}
