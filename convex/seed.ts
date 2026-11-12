import { ConvexError } from "convex/values"

import { toStoredCopy, type StoredSiteData } from "./content"
import {
  catalogFieldsSeed,
  faqsSeed,
  pathsSeed,
  siteSeed,
  teachersSeed,
  testimonialsSeed,
  worksSeed,
} from "./seedData"
import type { Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"

async function clearContent(ctx: MutationCtx) {
  for (const table of [
    "siteContent",
    "catalogFields",
    "paths",
    "teachers",
    "works",
    "testimonials",
    "faqs",
  ] as const) {
    const documents = await ctx.db.query(table).collect()
    for (const document of documents) {
      await ctx.db.delete(table, document._id)
    }
  }
}

/**
 * The seed never falls back to `public/images`. Every `imageFile` must already
 * exist as an active image in `mediaAssets` (uploaded by
 * `scripts/upload-images.mjs`), otherwise the whole seed fails loudly.
 */
async function imageAssetsByFilename(
  ctx: MutationCtx,
): Promise<Map<string, Id<"mediaAssets">>> {
  const assets = await ctx.db.query("mediaAssets").collect()
  const byFilename = new Map<string, Id<"mediaAssets">>()
  for (const asset of assets) {
    if (asset.kind !== "image" || asset.status !== "active") continue
    if (!byFilename.has(asset.filename)) {
      byFilename.set(asset.filename, asset._id)
    }
  }
  return byFilename
}

function requireImage(
  assets: Map<string, Id<"mediaAssets">>,
  filename: string,
  label: string,
): Id<"mediaAssets"> {
  const id = assets.get(filename)
  if (!id) {
    throw new ConvexError({
      code: "SEED_IMAGE_MISSING",
      message: `Gambar seed "${filename}" untuk ${label} belum ada di mediaAssets. Jalankan scripts/upload-images.mjs lalu ulangi seed.`,
    })
  }
  return id
}

async function seedAll(ctx: MutationCtx) {
  await clearContent(ctx)

  const assets = await imageAssetsByFilename(ctx)
  const storedSite: StoredSiteData = {
    ...siteSeed,
    hero: {
      ...siteSeed.hero,
      plate: {
        alt: siteSeed.hero.plate.alt,
        caption: siteSeed.hero.plate.caption,
        note: siteSeed.hero.plate.note,
        imageAssetId: requireImage(
          assets,
          siteSeed.hero.plate.imageFile,
          "hero.plate",
        ),
      },
    },
    metadata: {
      ...siteSeed.metadata,
      image: {
        width: siteSeed.metadata.image.width,
        height: siteSeed.metadata.image.height,
        alt: siteSeed.metadata.image.alt,
        imageAssetId: requireImage(
          assets,
          siteSeed.metadata.image.imageFile,
          "metadata.image",
        ),
      },
    },
    catalog: {
      ...siteSeed.catalog,
      fields: catalogFieldsSeed,
    },
    paths: pathsSeed.map(({ imageFile, ...rest }) => ({
      ...rest,
      imageAssetId: requireImage(assets, imageFile, `jalur ${rest.slug}`),
    })),
    teachers: teachersSeed.map(({ imageFile, ...rest }) => ({
      ...rest,
      imageAssetId: requireImage(assets, imageFile, `pengajar ${rest.slug}`),
    })),
    works: worksSeed.map(({ imageFile, ...rest }) => ({
      ...rest,
      imageAssetId: requireImage(assets, imageFile, `karya ${rest.slug}`),
    })),
    testimonials: testimonialsSeed,
    faqs: faqsSeed,
  }

  await ctx.db.insert("siteContent", {
    key: "site",
    value: toStoredCopy(storedSite),
    updatedAt: Date.now(),
  })

  for (const [order, field] of catalogFieldsSeed.entries()) {
    await ctx.db.insert("catalogFields", { order, ...field })
  }

  for (const [order, path] of storedSite.paths.entries()) {
    await ctx.db.insert("paths", { order, ...path })
  }

  for (const [order, teacher] of storedSite.teachers.entries()) {
    await ctx.db.insert("teachers", { order, ...teacher })
  }

  for (const [order, work] of storedSite.works.entries()) {
    await ctx.db.insert("works", { order, ...work })
  }

  for (const [order, testimonial] of testimonialsSeed.entries()) {
    await ctx.db.insert("testimonials", { order, ...testimonial })
  }

  for (const [order, faq] of faqsSeed.entries()) {
    await ctx.db.insert("faqs", { order, ...faq })
  }

  return {
    seeded: true,
    fields: catalogFieldsSeed.length,
    paths: pathsSeed.length,
    teachers: teachersSeed.length,
    works: worksSeed.length,
    testimonials: testimonialsSeed.length,
    faqs: faqsSeed.length,
  }
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => await seedAll(ctx),
})

export const runIfEmpty = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique()

    if (existing) return { seeded: false as const }
    return await seedAll(ctx)
  },
})
