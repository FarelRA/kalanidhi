#!/usr/bin/env node
/**
 * Builds every tab, home-screen, and install icon from one master tile.
 *
 * The artwork is a cream "K" on a dark wood tile. A tile with square corners
 * looks cut out next to the rest of the interface, so the master is masked with
 * an anti-aliased rounded rectangle before export. The master itself stays
 * unmasked (`scripts/assets/kalanidhi-icon-square.png`) so repeated builds never
 * degrade the edge.
 *
 * Apple touch icons are intentionally left square: iOS applies its own rounded
 * mask, and a pre-rounded icon with transparent corners leaves dark specks
 * inside that mask. Maskable install icons are also left full-bleed for the
 * same reason — the launcher decides the shape.
 *
 * Usage: node scripts/build-icons.mjs
 */
import { execFileSync } from "node:child_process"
import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const master = path.join(root, "scripts/assets/kalanidhi-icon-square.png")
const scratch = path.join(root, ".icon-build")

/** iOS-style corner radius, as a share of the tile's side. */
const CORNER = 0.2237
/** Oversampling factor so the curve lands on clean sub-pixel edges. */
const OVERSAMPLE = 4

async function roundedTile(size) {
  const side = size * OVERSAMPLE
  const radius = Math.round(side * CORNER)
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}">` +
      `<rect x="0" y="0" width="${side}" height="${side}" rx="${radius}" ry="${radius}" fill="#fff"/>` +
      `</svg>`,
  )

  // Two passes: sharp allows only one resize per pipeline, and the mask must
  // match the oversampled canvas before the final downscale.
  const masked = await sharp(master)
    .resize(side, side, { fit: "fill" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer()

  return sharp(masked)
    .resize(size, size, { kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function squareTile(size) {
  return sharp(master)
    .resize(size, size, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function main() {
  await mkdir(scratch, { recursive: true })

  const outputs = [
    ["app/icon.png", 512, roundedTile],
    ["app/apple-icon.png", 180, squareTile],
    ["public/brand/kalanidhi-icon-192.png", 192, roundedTile],
    ["public/brand/kalanidhi-icon-512.png", 512, roundedTile],
    ["public/brand/kalanidhi-icon-maskable-512.png", 512, squareTile],
  ]

  for (const [file, size, render] of outputs) {
    const buffer = await render(size)
    await writeFile(path.join(root, file), buffer)
    console.log(`${file} -> ${size}px`)
  }

  // Multi-resolution ICO. Each frame is rendered at its native size so the
  // corner curve stays crisp at 16 px instead of being a downscaled 256.
  // Browsers pick from 16–64; larger install icons live in the manifest.
  const frames = [16, 32, 48, 64]
  const framePaths = []
  for (const size of frames) {
    const framePath = path.join(scratch, `favicon-${size}.png`)
    await writeFile(framePath, await roundedTile(size))
    framePaths.push(framePath)
  }

  execFileSync("magick", [...framePaths, path.join(root, "app/favicon.ico")])
  console.log(`app/favicon.ico -> ${frames.join("/")}`)

  await rm(scratch, { recursive: true, force: true })
}

await main()
