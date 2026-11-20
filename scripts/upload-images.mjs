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

import sharp from "sharp"

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

/** Descriptive alt text for every checked-in seed image. */
const ALT_BY_FILENAME = {
  "hero-canting.webp":
    "Canting meneteskan malam di atas nampan anyaman bambu",
  "chat-lembar-pola.webp":
    "Peserta menggambar pola batik di atas kertas",
  "path-batik-bambu.webp":
    "Sri Sriningsih mendampingi peserta mencanting silinder bambu",
  "path-pranatacara.webp":
    "Plat tipografi kelas Seni Pembawa Acara Tradisi Jawa, tata wicara, urutan acara, dan etiket panggung, dengan garis tembaga",
  "path-gerabah-bantul.webp":
    "Plat tipografi kelas Kriya Gerabah Bantul, membentuk, mengeringkan, dan membakar gerabah Kasongan",
  "path-aksara-jawa.webp":
    "Plat tipografi kelas Aksara Jawa, dari hanacaraka sampai kalimat utuh tanpa spasi, Kota Yogyakarta",
  "path-batik-tulis-giriloyo.webp":
    "Plat tipografi kelas Batik Tulis, materi batik tulis di atas kain sedang disiapkan, Giriloyo, Wukirsari, Imogiri, Bantul",
  "path-tari-kreasi.webp":
    "Plat tipografi kelas Tari Kreasi, gerak murni dan maknawi, ruang-waktu-tenaga, Kota Yogyakarta dan Sleman",
  "path-kuliner-nusantara.webp":
    "Plat tipografi kelas Kuliner Nusantara, gastronomi, identitas, dan pelestarian makanan, Kota Yogyakarta dan Kulon Progo",
  "teacher-hardjono.webp":
    "Plat tipografi pengajar Bambang Hardjono, label pengajar, nama besar, dan keterangan pengajar batik halus Giriloyo",
  "teacher-sriningsih.webp":
    "Sri Sriningsih di depan layar Batik Bambu",
  "teacher-sudarsono.webp":
    "Plat tipografi pengajar Widagdo Saputra, pembina pembawa acara adat, Kota Yogyakarta",
  "teacher-suwardi.webp":
    "Plat tipografi pengajar Suwardi Pratama, pengajar aksara Jawa, Kota Yogyakarta",
  "teacher-gerabah.webp":
    "Plat tipografi perajin Sutrisno Wibowo, pengrajin gerabah Kasongan, Kasihan, Bantul",
  "teacher-tari-kreasi.webp":
    "Plat tipografi pengajar Retno Wulandari, pengajar tari dan koreografer, Sleman",
  "teacher-kuliner-nusantara.webp":
    "Plat tipografi pengajar Joko Santosa, pengajar kuliner rumahan dan pendamping UMKM, Kulon Progo",
  "work-bambu-nampan.webp":
    "Nampan bambu batik bermotif geometris",
  "work-bambu-kotak-bundar.webp":
    "Kotak bambu bundar bertutup dengan motif batik",
  "work-bambu-hiasan.webp":
    "Panel bambu batik berdiri tegak",
  "work-pranatacara.webp":
    "Plat Kartu Karya KN-JS-014 Pembawa Acara Siraman dan Midodareni, bingkai tipis dan keterangan praktisi Rani Wikaningsih",
  "work-aksara.webp":
    "Plat Kartu Karya KN-AKS-021 Jasa Tulis Aksara untuk Undangan dan Papan Nama, bingkai tipis dan keterangan Galuh Puspita",
  "work-tari-kreasi.webp":
    "Plat Kartu Karya KN-TRI-031 Tari Kreasi untuk Acara Keluarga, bingkai tipis dan keterangan Sekar Ayuningtyas",
  "work-kuliner-nusantara.webp":
    "Plat Kartu Karya KN-KUL-042 Geblek Renteng Beku, bingkai tipis dan keterangan Bimo Prakoso, Kulon Progo",
  "lesson-mola.webp":
    "Tangan menggambar pola di atas silinder bambu",
  "lesson-canting.webp":
    "Ujung canting meneteskan malam pada garis di atas anyaman bambu",
  "lesson-bambu-pengertian.webp":
    "Silinder bambu batik dan lembar pola di atas tikar",
  "lesson-bambu-alat.webp":
    "Wajan malam di atas kompor dan canting",
  "lesson-bambu-bidang.webp":
    "Silinder bambu dan lembar pola datar di atas tikar",
  "lesson-bambu-lengkung.webp":
    "Silinder bambu bermotif dipegang tangan",
  "lesson-bambu-latihan-pola.webp":
    "Peserta menggambar pola di atas kertas",
  "lesson-bambu-celah.webp":
    "Ujung canting menutup celah garis pada silinder bambu",
  "lesson-bambu-isen.webp":
    "Canting mengisi bidang pada silinder bambu",
  "lesson-bambu-canting-pegangan.webp":
    "Tangan memegang canting di atas silinder bambu bermotif",
  "lesson-bambu-latihan-garis.webp":
    "Nampan bambu hasil latihan nglowongi",
  "lesson-bambu-mbabar.webp":
    "Pencelupan pertama silinder bambu di wadah celup",
  "lesson-bambu-nembok.webp":
    "Menutup motif dengan malam pada silinder bambu",
  "lesson-bambu-warna-dasar.webp":
    "Silinder bambu dicelup di baskom warna dasar",
  "lesson-bambu-dua-warna.webp":
    "Dua silinder bambu hasil pewarnaan dua warna",
  "lesson-bambu-nglorod.webp":
    "Silinder bambu dilepas malamnya di air panas",
  "lesson-bambu-mepe.webp":
    "Dua silinder bambu dikeringkan di atas batu",
  "lesson-bambu-finishing.webp":
    "Silinder bambu batik diangkat setelah pelapisan",
  "lesson-bambu-mutu.webp":
    "Silinder bambu diletakkan di meja kerja untuk diperiksa",
  "lesson-bambu-keselamatan.webp":
    "Panci berisi air dan malam di atas kompor",
  "lesson-bambu-benda.webp":
    "Tiga silinder bambu berbagai ukuran di atas tikar",
  "lesson-bambu-catatan.webp":
    "Peserta mencatat proses di lembar kerja",
  "lesson-bambu-biaya.webp":
    "Lembar catatan dan alat kerja di atas tikar",
  "lesson-bambu-ujian.webp":
    "Silinder bambu batik diangkat sebagai hasil ujian",
}

/** Target box per asset family. Images are never enlarged. */
const MAX_BY_BASE = {
  "hero-canting": { width: 1600, height: 900 },
  "chat-lembar-pola": { width: 1200, height: 900 },
}

function maxFor(base) {
  if (MAX_BY_BASE[base]) return MAX_BY_BASE[base]
  if (base.startsWith("teacher-")) return { width: 1200, height: 1500 }
  if (base.startsWith("path-")) return { width: 1600, height: 1200 }
  if (base.startsWith("work-")) return { width: 1600, height: 1200 }
  if (base.startsWith("lesson-")) return { width: 1600, height: 1200 }
  return { width: 1600, height: 1600 }
}

/** Batik Bambu photos come from the class archive, plates from the in-house set. */
const CREDIT_BY_BASE = {
  "path-batik-bambu": "Dokumentasi kelas Batik Bambu",
  "teacher-sriningsih": "Dokumentasi kelas Batik Bambu",
  "work-bambu-nampan": "Dokumentasi kelas Batik Bambu",
  "work-bambu-kotak-bundar": "Dokumentasi kelas Batik Bambu",
  "work-bambu-hiasan": "Dokumentasi kelas Batik Bambu",
  "lesson-mola": "Dokumentasi kelas Batik Bambu",
  "lesson-canting": "Dokumentasi kelas Batik Bambu",
  "chat-lembar-pola": "Dokumentasi kelas Batik Bambu",
  "hero-canting": "Dokumentasi kelas Batik Bambu",
}

const ALT_BY_BASE = Object.fromEntries(
  Object.entries(ALT_BY_FILENAME).map(([filename, alt]) => [
    filename.replace(/\.[^.]+$/, ""),
    alt,
  ]),
)

function altFor(base) {
  if (ALT_BY_BASE[base]) return ALT_BY_BASE[base]
  return base.replace(/[-_]+/g, " ").trim()
}

function creditFor(base) {
  if (base.startsWith("lesson-bambu-")) return "Dokumentasi kelas Batik Bambu"
  return CREDIT_BY_BASE[base] ?? "Arsip KalaNidhi Digital"
}

async function optimizeToWebp(filename, bytes) {
  const base = filename.replace(/\.[^.]+$/, "")
  const limits = maxFor(base)
  if (path.extname(filename).toLowerCase() === ".webp") {
    const meta = await sharp(bytes).metadata()
    if (
      meta.width &&
      meta.height &&
      meta.width <= limits.width &&
      meta.height <= limits.height
    ) {
      return {
        buffer: bytes,
        filename: `${base}.webp`,
        width: meta.width,
        height: meta.height,
      }
    }
  }
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

  return {
    buffer: data,
    filename: `${base}.webp`,
    width: info.width,
    height: info.height,
  }
}

const entries = await readdir(imageDir, { withFileTypes: true })
const supported = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => MIME_BY_EXTENSION[path.extname(name).toLowerCase()])

// Group by stem and prefer an existing WebP source over a sibling JPEG/PNG.
const byBase = new Map()
for (const name of supported) {
  const base = name.replace(/\.[^.]+$/, "")
  const extension = path.extname(name).toLowerCase()
  if (!byBase.has(base) || extension === ".webp") byBase.set(base, name)
}
const files = Array.from(byBase.keys()).sort()

if (files.length === 0) {
  console.error(`No supported images found in ${imageDir}.`)
  process.exit(1)
}

let uploaded = 0
const keepFilenames = []
for (const base of files) {
  const source = byBase.get(base)
  const filePath = path.join(imageDir, source)
  const bytes = await readFile(filePath)
  const optimized = await optimizeToWebp(source, bytes)
  keepFilenames.push(optimized.filename)

  const uploadUrl = await client.mutation(api.media.generateSeedUploadUrl, {
    token,
  })
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "image/webp" },
    body: optimized.buffer,
  })
  if (!response.ok) {
    throw new Error(
      `Upload failed for ${source}: ${response.status} ${response.statusText}`,
    )
  }
  const payload = await response.json()
  if (!payload.storageId) {
    throw new Error(`Upload for ${source} did not return a storageId.`)
  }

  await client.mutation(api.media.registerSeedImageUpload, {
    token,
    filename: optimized.filename,
    storageId: payload.storageId,
    mimeType: "image/webp",
    size: optimized.buffer.byteLength,
    alt: altFor(base),
    credit: creditFor(base),
    width: optimized.width,
    height: optimized.height,
  })

  uploaded += 1
  console.log(
    `uploaded ${source} -> ${optimized.filename} (${optimized.width}x${optimized.height})`,
  )
}

const pruned = await client.mutation(api.media.pruneSeedImageUploads, {
  token,
  keepFilenames,
})
console.log(
  `Registry cleanup. ${pruned.archived} stale/duplicate row(s) archived, ${pruned.active} active seed image(s).`,
)

console.log(`Done. ${uploaded} image(s) registered in mediaAssets as WebP.`)
