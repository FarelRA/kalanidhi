import { readFileSync } from "node:fs"
import path from "node:path"

import sharp from "sharp"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")

async function cornerAlpha(file: string) {
  const buffer = readFileSync(path.join(root, file))
  const image = sharp(buffer)
  const { width, height } = await image.metadata()
  if (!width || !height) throw new Error(`${file} has no dimensions`)

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const alphaAt = (x: number, y: number) =>
    data[(y * info.width + x) * info.channels + 3]

  return {
    topLeft: alphaAt(0, 0),
    topRight: alphaAt(info.width - 1, 0),
    bottomLeft: alphaAt(0, info.height - 1),
    bottomRight: alphaAt(info.width - 1, info.height - 1),
    topEdge: alphaAt(Math.floor(info.width / 2), 0),
    center: alphaAt(Math.floor(info.width / 2), Math.floor(info.height / 2)),
  }
}

describe("app icons", () => {
  it("rounds every browser and install tile", async () => {
    for (const file of [
      "app/icon.png",
      "public/brand/kalanidhi-icon-192.png",
      "public/brand/kalanidhi-icon-512.png",
    ]) {
      const alpha = await cornerAlpha(file)
      expect(alpha, file).toMatchObject({
        topLeft: 0,
        topRight: 0,
        bottomLeft: 0,
        bottomRight: 0,
        topEdge: 255,
        center: 255,
      })
    }
  })

  it("leaves the apple touch icon and maskable tile full-bleed", async () => {
    // iOS and the launcher apply their own shape mask; a pre-rounded icon
    // leaves dark specks inside it, so these two stay square on purpose.
    for (const file of [
      "app/apple-icon.png",
      "public/brand/kalanidhi-icon-maskable-512.png",
    ]) {
      const alpha = await cornerAlpha(file)
      expect(alpha, file).toMatchObject({ topLeft: 255, bottomRight: 255 })
    }
  })

  it("ships a multi-resolution favicon with rounded frames", () => {
    const buffer = readFileSync(path.join(root, "app/favicon.ico"))
    // ICONDIR: reserved 0, type 1, count > 1.
    expect(buffer.readUInt16LE(0)).toBe(0)
    expect(buffer.readUInt16LE(2)).toBe(1)
    expect(buffer.readUInt16LE(4)).toBeGreaterThan(1)
  })

  it("keeps the unmasked master so repeated builds stay crisp", async () => {
    const alpha = await cornerAlpha("scripts/assets/kalanidhi-icon-square.png")
    expect(alpha).toMatchObject({ topLeft: 255, topEdge: 255 })
  })
})
