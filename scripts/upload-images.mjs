#!/usr/bin/env node
/**
 * Upload every image in `seed/images` to Convex file storage and register it
 * in the `mediaAssets` table. The app never serves these files at runtime;
 * this directory is only the upload source for Convex storage.
 *
 * Usage (self-hosted Convex):
 *
 *   CONVEX_SELF_HOSTED_URL="https://convex.example.com" \
 *   CONVEX_SELF_HOSTED_ADMIN_KEY="<admin-key>" \
 *   node scripts/upload-images.mjs
 *
 * Optional:
 *   IMAGE_DIR=seed/images     directory to read (default: seed/images)
 *   SEED_UPLOAD_SECRET        must match the Convex env var of the same name
 *                             when that variable is set on the deployment
 *
 * The script is idempotent: re-uploading a filename updates the existing
 * active `mediaAssets` row instead of creating a duplicate. Secrets are never
 * printed.
 */
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { ConvexHttpClient } from "convex/browser"

import { api } from "../convex/_generated/api.js"

const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
}

const url = process.env.CONVEX_SELF_HOSTED_URL
const adminKey = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY

if (!url || !adminKey) {
  console.error(
    "Missing CONVEX_SELF_HOSTED_URL or CONVEX_SELF_HOSTED_ADMIN_KEY. See the script header for usage.",
  )
  process.exit(1)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const imageDir = path.resolve(root, process.env.IMAGE_DIR ?? "seed/images")

const client = new ConvexHttpClient(url)
client.setAdminAuth(adminKey)
const token = process.env.SEED_UPLOAD_SECRET

function altFor(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
}

const entries = await readdir(imageDir, { withFileTypes: true })
const files = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => MIME_BY_EXTENSION[path.extname(name).toLowerCase()])
  .sort()

if (files.length === 0) {
  console.error(`No supported images found in ${imageDir}.`)
  process.exit(1)
}

let uploaded = 0
for (const filename of files) {
  const filePath = path.join(imageDir, filename)
  const bytes = await readFile(filePath)
  const mimeType = MIME_BY_EXTENSION[path.extname(filename).toLowerCase()]

  const uploadUrl = await client.mutation(api.media.generateSeedUploadUrl, {
    token,
  })
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: bytes,
  })
  if (!response.ok) {
    throw new Error(
      `Upload failed for ${filename}: ${response.status} ${response.statusText}`,
    )
  }
  const payload = await response.json()
  if (!payload.storageId) {
    throw new Error(`Upload for ${filename} did not return a storageId.`)
  }

  const assetId = await client.mutation(api.media.registerSeedImageUpload, {
    token,
    filename,
    storageId: payload.storageId,
    mimeType,
    size: bytes.byteLength,
    alt: altFor(filename),
  })

  uploaded += 1
  console.log(`uploaded ${filename} -> ${assetId}`)
}

console.log(`Done. ${uploaded} image(s) registered in mediaAssets.`)
