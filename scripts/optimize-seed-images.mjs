#!/usr/bin/env node
/**
 * Normalize every source image in `seed/images` to WebP.
 *
 * The uploader already converts on the fly, but keeping the source folder
 * WebP-only makes the checked-in assets match what is served and keeps the
 * repository small. Conversion is idempotent and never enlarges an image.
 *
 * Usage:
 *
 *   node scripts/optimize-seed-images.mjs
 *   node scripts/optimize-seed-images.mjs --dry-run
 */
import { readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const imageDir = path.resolve(root, process.env.IMAGE_DIR ?? "seed/images")
const dryRun = process.argv.includes("--dry-run")

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"])

function maxFor(base) {
  if (base === "hero-canting") return { width: 1600, height: 900 }
  if (base === "chat-lembar-pola") return { width: 1200, height: 900 }
  if (base.startsWith("teacher-")) return { width: 1200, height: 1500 }
  if (
    base.startsWith("path-") ||
    base.startsWith("work-") ||
    base.startsWith("lesson-")
  ) {
    return { width: 1600, height: 1200 }
  }
  return { width: 1600, height: 1600 }
}

const entries = await readdir(imageDir, { withFileTypes: true })
const supported = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => SUPPORTED.has(path.extname(name).toLowerCase()))

const byBase = new Map()
for (const name of supported) {
  const base = name.replace(/\.[^.]+$/, "")
  const extension = path.extname(name).toLowerCase()
  if (!byBase.has(base) || extension === ".webp") byBase.set(base, name)
}

let converted = 0
let removed = 0
for (const [base, source] of Array.from(byBase.entries()).sort()) {
  const sourcePath = path.join(imageDir, source)
  const target = `${base}.webp`
  const targetPath = path.join(imageDir, target)
  const limits = maxFor(base)
  const bytes = await readFile(sourcePath)
  const { data, info } = await sharp(bytes, { failOn: "none" })
    .rotate()
    .resize({
      width: limits.width,
      height: limits.height,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toBuffer({ resolveWithObject: true })

  console.log(
    `${source} -> ${target} (${info.width}x${info.height}, ${Math.round(
      data.byteLength / 1024,
    )} KB)`,
  )
  if (!dryRun) {
    await writeFile(targetPath, data)
    if (source !== target) {
      await rm(sourcePath)
      removed += 1
    }
  }
  converted += 1
}

console.log(
  `${dryRun ? "Would convert" : "Converted"} ${converted} image(s), removed ${removed} non-WebP source(s).`,
)
