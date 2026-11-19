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

/** Descriptive alt text for the typographic plates the seed displays. */
const ALT_BY_FILENAME = {
  "hero-canting.jpg":
    "Plat tipografi KalaNidhi Digital di atas kertas krem, nama platform, ajakan belajar praktik budaya Nusantara, dan keterangan Yogyakarta",
  "og-kalanidhi.jpg":
    "Kartu pratinjau sosial KalaNidhi Digital, label platform, judul Belajar praktik budaya Nusantara, dan keterangan Yogyakarta dengan batik, aksara, pranatacara, tari, kuliner",
  "hasil-latihan.jpg":
    "Plat lembar latihan peserta, label Latihan Peserta, judul Garis canting, latihan 3, keterangan Batik Bambu, Krebet, Bantul, dan garis tembaga",
  "panduan-perawatan-produk-bambu.jpg":
    "Plat panduan perawatan produk bambu batik, empat langkah merawat, yaitu lap dengan kain kering, jangan rendam, hindari panas langsung, dan simpan di tempat kering",
  "path-batik-bambu.jpg":
    "Plat tipografi kelas Batik Bambu, judul besar, keterangan Krebet, Sendangsari, Pajangan, Bantul, dan garis tembaga di atas kertas krem",
  "path-pranatacara.jpg":
    "Plat tipografi kelas Seni Pembawa Acara Tradisi Jawa, tata wicara, urutan acara, dan etiket panggung, dengan garis tembaga",
  "path-gerabah-bantul.jpg":
    "Plat tipografi kelas Kriya Gerabah Bantul, membentuk, mengeringkan, dan membakar gerabah Kasongan",
  "path-aksara-jawa.jpg":
    "Plat tipografi kelas Aksara Jawa, dari hanacaraka sampai kalimat utuh tanpa spasi, Kota Yogyakarta",
  "path-batik-tulis-giriloyo.jpg":
    "Plat tipografi kelas Batik Tulis, materi batik tulis di atas kain sedang disiapkan, Giriloyo, Wukirsari, Imogiri, Bantul",
  "path-tari-kreasi.jpg":
    "Plat tipografi kelas Tari Kreasi, gerak murni dan maknawi, ruang-waktu-tenaga, Kota Yogyakarta dan Sleman",
  "path-kuliner-nusantara.jpg":
    "Plat tipografi kelas Kuliner Nusantara, gastronomi, identitas, dan pelestarian makanan, Kota Yogyakarta dan Kulon Progo",
  "teacher-hardjono.jpg":
    "Plat tipografi pengajar Bambang Hardjono, label pengajar, nama besar, dan keterangan pengajar batik halus Giriloyo",
  "teacher-sriningsih.jpg":
    "Plat tipografi pengajar Sri Sriningsih, perajin batik bambu dan pewarna alami, Krebet, Sendangsari, Pajangan, Bantul",
  "teacher-sudarsono.jpg":
    "Plat tipografi pengajar Widagdo Saputra, pembina pembawa acara adat, Kota Yogyakarta",
  "teacher-suwardi.jpg":
    "Plat tipografi pengajar Suwardi Pratama, pengajar aksara Jawa, Kota Yogyakarta",
  "teacher-gerabah.jpg":
    "Plat tipografi perajin Sutrisno Wibowo, pengrajin gerabah Kasongan, Kasihan, Bantul",
  "teacher-tari-kreasi.jpg":
    "Plat tipografi pengajar Retno Wulandari, pengajar tari dan koreografer, Sleman",
  "teacher-kuliner-nusantara.jpg":
    "Plat tipografi pengajar Joko Santosa, pengajar kuliner rumahan dan pendamping UMKM, Kulon Progo",
  "work-bambu-nampan.jpg":
    "Plat Kartu Karya KN-8821 Nampan Batik Bambu, bingkai tipis, judul, garis tembaga, dan keterangan pembuat Anisa Rahmawati",
  "work-bambu-box-tisu.jpg":
    "Plat Kartu Karya KN-9014 Box Tisu Batik Bambu, bingkai tipis, judul, dan keterangan pembuat Dimas Yoga Pratama",
  "work-bambu-hiasan.jpg":
    "Plat Kartu Karya KN-9147 Hiasan Dinding Batik Bambu, bingkai tipis, judul, dan keterangan pembuat Bambang Purnomo",
  "work-pranatacara.jpg":
    "Plat Kartu Karya KN-JS-014 Pembawa Acara Siraman dan Midodareni, bingkai tipis dan keterangan praktisi Rani Wikaningsih",
  "work-aksara.jpg":
    "Plat Kartu Karya KN-AKS-021 Jasa Tulis Aksara untuk Undangan dan Papan Nama, bingkai tipis dan keterangan Galuh Puspita",
  "work-tari-kreasi.jpg":
    "Plat Kartu Karya KN-TRI-031 Tari Kreasi untuk Acara Keluarga, bingkai tipis dan keterangan Sekar Ayuningtyas",
  "work-kuliner-nusantara.jpg":
    "Plat Kartu Karya KN-KUL-042 Geblek Renteng Beku, bingkai tipis dan keterangan Bimo Prakoso, Kulon Progo",
  "lesson-mola.jpg":
    "Plat pelajaran Mola, memindahkan pola, dengan keterangan Batik Bambu, Krebet, Bantul, dan garis tembaga",
  "lesson-canting.jpg":
    "Plat pelajaran Canting, memegang dan meneteskan malam, dengan keterangan tekanan, suhu, dan jarak titik pada kelas Batik Bambu",
  "motif-larangan-yogyakarta-1.jpg":
    "Plat lembar Motif Larangan Yogyakarta, delapan kotak bergaris tembaga berlabel Parang, Kawung, Ceplok, Mega Mendung, Lereng, Semen, Truntum, dan Sido Mukti",
}

function altFor(filename) {
  if (ALT_BY_FILENAME[filename]) return ALT_BY_FILENAME[filename]
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
