#!/usr/bin/env node
/**
 * Crop the selected Batik Bambu source photos to their target aspect ratios
 * and write optimized WebP files into `seed/images`.
 *
 * Sources are downloaded originals. The manifest keeps the mapping between a
 * Drive session file and the target used by the seed, so the same photo can be
 * re-cropped later without guessing.
 *
 * Usage:
 *
 *   PHOTO_SOURCE_DIR=/path/to/downloads node scripts/process-batik-photos.mjs
 */
import { readFile, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceDir = path.resolve(
  process.env.PHOTO_SOURCE_DIR ?? "/tmp/opencode/gdrive/src",
)
const targetDir = path.resolve(root, "seed/images")

/** Landscape class and product photos, 4:3. */
const LANDSCAPE = { width: 1600, height: 1200 }
/** Lesson photos, 4:3. */
const LESSON = { width: 1600, height: 1200 }
/** Portrait teacher photo, 4:5. */
const PORTRAIT = { width: 1200, height: 1500 }

const photos = [
  { name: "path-batik-bambu", source: "path-batik-bambu.jpg", ...LANDSCAPE },
  {
    name: "teacher-zadira-ahmada",
    source: "teacher-batik-bambu.jpg",
    ...PORTRAIT,
  },
  {
    name: "work-bambu-nampan",
    source: "work-bambu-nampan.jpg",
    ...LANDSCAPE,
    subject: { left: 0.11, top: 0.38, width: 0.37, height: 0.56 },
    canvas: "blur",
  },
  {
    name: "work-bambu-kotak-bundar",
    source: "work-bambu-kotak-bundar.jpg",
    ...LANDSCAPE,
    crop: { left: 0.28, top: 0.35, width: 0.64, height: 0.48 },
  },
  {
    name: "work-bambu-hiasan",
    source: "work-bambu-hiasan.jpg",
    ...LANDSCAPE,
    subject: { left: 0.68, top: 0.14, width: 0.3, height: 0.68 },
    canvas: "blur",
  },
  { name: "lesson-mola", source: "lesson-mola.jpg", ...LESSON },
  { name: "lesson-canting", source: "lesson-canting.jpg", ...LESSON },
  {
    name: "chat-lembar-pola",
    source: "chat-lembar-pola.jpg",
    width: 1200,
    height: 900,
  },
  {
    name: "hero-canting",
    source: "hero-canting.jpg",
    width: 1600,
    height: 900,
  },
  {
    name: "lesson-bambu-pengertian",
    source: "lesson-bambu-pengertian.jpg",
    ...LESSON,
  },
  { name: "lesson-bambu-alat", source: "lesson-bambu-alat.jpg", ...LESSON },
  { name: "lesson-bambu-bidang", source: "lesson-bambu-bidang.jpg", ...LESSON },
  {
    name: "lesson-bambu-lengkung",
    source: "lesson-bambu-lengkung.jpg",
    ...LESSON,
  },
  {
    name: "lesson-bambu-latihan-pola",
    source: "lesson-bambu-latihan-pola.jpg",
    ...LESSON,
  },
  { name: "lesson-bambu-celah", source: "lesson-bambu-celah.jpg", ...LESSON },
  { name: "lesson-bambu-isen", source: "lesson-bambu-isen.jpg", ...LESSON },
  {
    name: "lesson-bambu-canting-pegangan",
    source: "lesson-bambu-canting-pegangan.jpg",
    ...LESSON,
  },
  {
    name: "lesson-bambu-latihan-garis",
    source: "lesson-bambu-latihan-garis.jpg",
    ...LESSON,
  },
  { name: "lesson-bambu-mbabar", source: "lesson-bambu-mbabar.jpg", ...LESSON },
  { name: "lesson-bambu-nembok", source: "lesson-bambu-nembok.jpg", ...LESSON },
  {
    name: "lesson-bambu-warna-dasar",
    source: "lesson-bambu-warna-dasar.jpg",
    ...LESSON,
  },
  {
    name: "lesson-bambu-dua-warna",
    source: "lesson-bambu-dua-warna.jpg",
    ...LESSON,
  },
  {
    name: "lesson-bambu-nglorod",
    source: "lesson-bambu-nglorod.jpg",
    ...LESSON,
  },
  { name: "lesson-bambu-mepe", source: "lesson-bambu-mepe.jpg", ...LESSON },
  {
    name: "lesson-bambu-finishing",
    source: "lesson-bambu-finishing.jpg",
    ...LESSON,
  },
  { name: "lesson-bambu-mutu", source: "lesson-bambu-mutu.jpg", ...LESSON },
  {
    name: "lesson-bambu-keselamatan",
    source: "lesson-bambu-keselamatan.jpg",
    ...LESSON,
  },
  { name: "lesson-bambu-benda", source: "lesson-bambu-benda.jpg", ...LESSON },
  {
    name: "lesson-bambu-catatan",
    source: "lesson-bambu-catatan.jpg",
    ...LESSON,
  },
  { name: "lesson-bambu-biaya", source: "lesson-bambu-biaya.jpg", ...LESSON },
  { name: "lesson-bambu-ujian", source: "lesson-bambu-ujian.jpg", ...LESSON },
]

let written = 0
const missing = []
for (const photo of photos) {
  const sourcePath = path.join(sourceDir, photo.source)
  try {
    await stat(sourcePath)
  } catch {
    missing.push(photo.source)
    continue
  }
  const bytes = await readFile(sourcePath)
  const meta = await sharp(bytes).metadata()
  const sourceWidth = meta.width ?? 0
  const sourceHeight = meta.height ?? 0
  const region = (box) => ({
    left: Math.round(sourceWidth * box.left),
    top: Math.round(sourceHeight * box.top),
    width: Math.round(sourceWidth * box.width),
    height: Math.round(sourceHeight * box.height),
  })

  let data
  let info
  if (photo.subject && photo.canvas === "blur") {
    // Keep the object whole on a soft backdrop made from the same frame.
    const backdrop = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({
        width: photo.width,
        height: photo.height,
        fit: "cover",
      })
      .blur(36)
      .modulate({ brightness: 0.72, saturation: 0.8 })
      .toBuffer()
    const subject = await sharp(bytes, { failOn: "none" })
      .rotate()
      .extract(region(photo.subject))
      .resize({ height: Math.round(photo.height * 0.92), fit: "inside" })
      .toBuffer()
    const composed = await sharp(backdrop)
      .composite([{ input: subject, gravity: "center" }])
      .webp({ quality: 84, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true })
    data = composed.data
    info = composed.info
  } else {
    let pipeline = sharp(bytes, { failOn: "none" }).rotate()
    if (photo.crop) pipeline = pipeline.extract(region(photo.crop))
    const result = await pipeline
      .resize({
        width: photo.width,
        height: photo.height,
        fit: "cover",
        position: photo.position ?? "center",
      })
      .webp({ quality: 84, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true })
    data = result.data
    info = result.info
  }

  await writeFile(path.join(targetDir, `${photo.name}.webp`), data)
  written += 1
  console.log(
    `${photo.source} -> ${photo.name}.webp (${info.width}x${info.height})`,
  )
}

if (missing.length > 0) {
  console.log(`Missing ${missing.length} source(s): ${missing.join(", ")}`)
}
console.log(`Wrote ${written} Batik Bambu photo(s) to ${targetDir}.`)
