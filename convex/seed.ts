import { ConvexError } from "convex/values"

import type {
  ContentDocument,
  FeaturedSelection,
} from "../lib/content/types"
import { pathHref, PUBLIC_ROUTES, workHref } from "../lib/content/routes"
import type { StoredContentValue } from "./content"
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
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server"
import {
  DAY,
  SEED_NOW as NOW,
  seedAdmin,
  seedAgo as ago,
} from "./seedIdentities"

const CLEAR_TABLES = [
  "siteContent",
  "contentRevisions",
  "contentPreviews",
  "contentLocks",
  "catalogFields",
  "paths",
  "pathModules",
  "lessons",
  "teachers",
  "works",
  "testimonials",
  "faqs",
  "seoOverrides",
  "whatsappVerifications",
  "roleAssignments",
  "invites",
  "consents",
  "payoutAccounts",
  "sellerProfiles",
  "cohorts",
  "cohortSessions",
  "enrollments",
  "lessonProgress",
  "submissions",
  "submissionAssets",
  "assessments",
  "assessmentEvents",
  "disputes",
  "certificates",
  "certificateEvents",
  "workCards",
  "orders",
  "orderItems",
  "payments",
  "paymentEvents",
  "payouts",
  "refunds",
  "ledgerEntries",
  "conversations",
  "conversationMembers",
  "messages",
  "messageAssets",
  "messageReceipts",
  "messageFlags",
  "blocks",
  "messageEdits",
  "messageAccessGrants",
  "messageUploadIntents",
  "messagingRestrictions",
  "callSessions",
  "callParticipants",
  "callEvents",
  "callRecordings",
  "leads",
  "leadNotes",
  "leadAssignments",
  "supportTickets",
  "supportMessages",
  "supportCannedReplies",
  "auditLogs",
  "authLogs",
  "webhookDeliveries",
  "notificationOutbox",
  "featureFlags",
  "settings",
  "integrationHealth",
  "dailyMetrics",
  "metricDefinitions",
  "flowDefinitions",
  "flowTransitions",
  "slaPolicies",
  "automationRules",
  "notificationTemplates",
  "apiKeys",
  "webhookEndpoints",
  "privacyRequests",
  "impersonationSessions",
  "culturalSources",
  "takedownRequests",
  "breakGlassGrants",
] as const

async function clearTable(ctx: MutationCtx, table: string) {
  // The table list is a closed union of every domain table. Convex's typed
  // query builder cannot infer a single table from a runtime string, so the
  // seed uses the documented escape hatch here only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documents = await ctx.db.query(table as any).collect()
  for (const document of documents) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.db.delete(table as any, document._id)
  }
}

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of CLEAR_TABLES) {
      await clearTable(ctx, table)
    }

    const users = await ctx.db.query("users").collect()
    for (const user of users) {
      if (user.roles.includes("admin")) continue
      await ctx.db.delete(user._id)
    }

    const sessions = await ctx.db.query("sessions").collect()
    for (const session of sessions) {
      const user = await ctx.db.get(session.userId)
      if (!user || !user.roles.includes("admin")) {
        await ctx.db.delete(session._id)
      }
    }

    const assets = await ctx.db.query("mediaAssets").collect()
    for (const asset of assets) {
      if (asset.uploadedBy === "seed") {
        await ctx.db.delete(asset._id)
      }
    }

    return { cleared: true }
  },
})

/**
 * The seed never falls back to static files. Every `imageFile` must already
 * exist as an active image in `mediaAssets` (uploaded from `seed/images` by
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

async function storageUrl(
  ctx: MutationCtx,
  id: Id<"mediaAssets">,
): Promise<string> {
  const asset = await ctx.db.get(id)
  const url = asset
    ? asset.storageId
      ? await ctx.storage.getUrl(asset.storageId)
      : asset.externalUrl
    : null
  if (!url) {
    throw new ConvexError({
      code: "SEED_IMAGE_MISSING",
      message: `Aset gambar ${id} tidak punya URL penyimpanan. Unggah ulang gambar seed.`,
    })
  }
  return url
}

/** Seed rows are linked by name, so no slug/email map can drift. */
async function usersByName(ctx: MutationCtx) {
  const users = await ctx.db.query("users").collect()
  return new Map(users.map((user) => [user.name, user] as const))
}

function teacherForPath(path: { teacher: string; title: string }) {
  return (
    teachersSeed.find((teacher) => teacher.name === path.teacher) ??
    teachersSeed.find((teacher) => teacher.path === path.title)
  )
}

function pathForTeacher(teacher: { path: string; name: string }) {
  return (
    pathsSeed.find((path) => path.title === teacher.path) ??
    pathsSeed.find((path) => path.teacher === teacher.name)
  )
}

export const seedContent = internalMutation({
  args: {},
  handler: async (ctx) => {
    const assets = await imageAssetsByFilename(ctx)
    const baseCopy: Omit<StoredContentValue, "featured"> = {
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
    }

    const seededPaths = pathsSeed.map(({ imageFile, ...rest }) => ({
      ...rest,
      imageAssetId: requireImage(assets, imageFile, `jalur ${rest.slug}`),
    }))
    // Identity fields power the workspace seed; the public table stores only
    // the published teacher record.
    const seededTeachers = teachersSeed.map(
      ({ imageFile, key, pathIds, status, verificationStatus, published, ...rest }) => {
        void key
        void pathIds
        void status
        void verificationStatus
        void published
        return {
          ...rest,
          imageAssetId: requireImage(assets, imageFile, `pengajar ${rest.slug}`),
        }
      },
    )
    const seededWorks = worksSeed.map(
      ({ imageFile, makerKey, pathSlug, certificateKey, ...rest }) => {
        void makerKey
        void pathSlug
        void certificateKey
        return {
          ...rest,
          imageAssetId: requireImage(assets, imageFile, `karya ${rest.slug}`),
        }
      },
    )

    for (const [order, field] of catalogFieldsSeed.entries()) {
      await ctx.db.insert("catalogFields", { order, ...field })
    }

    const users = await usersByName(ctx)

    for (const [order, path] of seededPaths.entries()) {
      const teacher = teacherForPath(path)
      const user = teacher ? users.get(teacher.name) : undefined
      if (!user) {
        throw new Error(`Seed teacher user missing for path ${path.slug}`)
      }
      await ctx.db.insert("paths", {
        order,
        ...path,
        modules: 0,
        teacherId: user._id,
        status: path.comingSoon ? "planned" : "open",
        createdAt: ago(395 - order * 12),
      })
    }

    for (const [order, teacher] of seededTeachers.entries()) {
      const user = users.get(teacher.name)
      if (!user) throw new Error(`Seed user missing: ${teacher.name}`)
      const isReview = !teacher.verified
      const path = pathForTeacher(teacher)
      await ctx.db.insert("teachers", {
        order,
        ...teacher,
        userId: user._id,
        pathIds: path ? [path.slug] : [],
        status: isReview ? "review" : "active",
        verificationStatus: isReview ? "under_review" : "verified",
        verifiedBy: isReview ? undefined : "Pengelola",
        verifiedAt: isReview ? undefined : ago(390 - order * 10),
        published: !isReview,
        publishedAt: isReview ? undefined : ago(388 - order * 10),
      })
    }

    for (const [order, work] of seededWorks.entries()) {
      await ctx.db.insert("works", {
        order,
        ...work,
        status: "published",
        createdAt: ago(320 - order * 55),
      })
    }

    const testimonialIds: string[] = []
    for (const [order, testimonial] of testimonialsSeed.entries()) {
      const id = await ctx.db.insert("testimonials", {
        order,
        ...testimonial,
      })
      testimonialIds.push(id)
    }

    const faqIds: string[] = []
    for (const [order, faq] of faqsSeed.entries()) {
      const id = await ctx.db.insert("faqs", { order, ...faq })
      faqIds.push(id)
    }

    const featured: FeaturedSelection = {
      pathSlugs: seededPaths.map((path) => path.slug),
      teacherSlugs: seededTeachers
        .filter((teacher) => teacher.slug !== "joko-santoso")
        .map((teacher) => teacher.slug),
      workSlugs: seededWorks.map((work) => work.slug),
      testimonialIds,
      catalogFieldKeys: catalogFieldsSeed.map((field) => field.name),
      faqKeys: faqIds,
      heroWorkSlug: seededWorks.length > 0 ? seededWorks[0].slug : null,
    }

    await ctx.db.insert("siteContent", {
      key: "site",
      value: { ...baseCopy, featured } satisfies StoredContentValue,
      updatedAt: NOW,
    })

    const revisionCopy: ContentDocument = {
      ...baseCopy,
      featured,
      hero: {
        ...baseCopy.hero,
        plate: {
          alt: baseCopy.hero.plate.alt,
          caption: baseCopy.hero.plate.caption,
          note: baseCopy.hero.plate.note,
          image: await storageUrl(ctx, baseCopy.hero.plate.imageAssetId),
        },
      },
      metadata: {
        ...baseCopy.metadata,
        image: {
          width: baseCopy.metadata.image.width,
          height: baseCopy.metadata.image.height,
          alt: baseCopy.metadata.image.alt,
          url: await storageUrl(ctx, baseCopy.metadata.image.imageAssetId),
        },
      },
    }

    const draftCopy = JSON.parse(JSON.stringify(revisionCopy)) as Record<
      string,
      unknown
    >
    const draftHero = draftCopy.hero as { title: string[] }
    draftHero.title = [
      "Duduk di bangku ini.",
      "Nanti kamu yang mengajari.",
    ]
    const scheduledCopy = JSON.parse(JSON.stringify(revisionCopy)) as Record<
      string,
      unknown
    >
    const scheduledBanner = scheduledCopy.footer as {
      newsletter: { label: string }
    }
    scheduledBanner.newsletter.label =
      "Kabar jalur dan karya baru, edisi Desember"

    await ctx.db.insert("contentRevisions", {
      key: "site",
      version: 1,
      value: revisionCopy,
      status: "published",
      authorId: (await seedAdmin(ctx))._id,
      note: "Terbitan awal edisi 2026.",
      createdAt: ago(60),
      publishedAt: ago(60),
    })
    await ctx.db.insert("contentRevisions", {
      key: "site",
      version: 2,
      value: draftCopy,
      status: "draft",
      authorId: (await seedAdmin(ctx))._id,
      note: "Draf penyempurnaan judul hero.",
      basedOnVersion: 1,
      createdAt: ago(2),
    })
    await ctx.db.insert("contentRevisions", {
      key: "site",
      version: 3,
      value: scheduledCopy,
      status: "scheduled",
      authorId: (await seedAdmin(ctx))._id,
      note: "Jadwal pembaruan kabar edisi Desember.",
      basedOnVersion: 1,
      createdAt: ago(1),
      scheduledFor: NOW + 7 * DAY,
    })

    await ctx.db.insert("contentPreviews", {
      contentKey: "site",
      version: 2,
      tokenHash: await sha256("seed-preview-token"),
      createdBy: (await seedAdmin(ctx))._id,
      createdAt: ago(1),
      expiresAt: NOW + 2 * DAY,
    })

    const siteName = siteSeed.metadata.siteName
    const siteUrl = siteSeed.metadata.siteUrl.replace(/\/+$/, "")
    const seoRoutes = [
      {
        route: PUBLIC_ROUTES.home,
        title: `${siteName} — Belajar praktik budaya Nusantara`,
        description: siteSeed.metadata.description,
      },
      ...seededPaths.map((path) => ({
        route: pathHref(path.slug),
        title: `${path.title} — ${siteName}`,
        description: path.subtitle,
      })),
      ...seededWorks.map((work) => ({
        route: workHref(work.slug),
        title: `${work.title} — ${siteName}`,
        description: work.description,
      })),
      {
        route: PUBLIC_ROUTES.verify,
        title: `Verifikasi sertifikat — ${siteName}`,
        description:
          "Periksa status sertifikat platform dan Kartu Karya KalaNidhi Digital.",
      },
    ]
    for (const seo of seoRoutes) {
      await ctx.db.insert("seoOverrides", {
        route: seo.route,
        title: seo.title,
        description: seo.description,
        ogTitle: seo.title,
        ogDescription: seo.description,
        canonical: `${siteUrl}${seo.route === "/" ? "" : seo.route}`,
        keywords: ["KalaNidhi", "budaya Nusantara", "kursus budaya"],
        robots: "index,follow",
        updatedAt: NOW,
      })
    }

    const audioStorage = await ctx.storage.store(
      new Blob(["KalaNidhi seed lesson audio"], { type: "audio/mpeg" }),
    )
    const videoStorage = await ctx.storage.store(
      new Blob(["KalaNidhi seed lesson video"], { type: "video/mp4" }),
    )
    await ctx.db.insert("mediaAssets", {
      kind: "audio",
      storageId: audioStorage,
      filename: "lesson-soga-audio.mp3",
      mimeType: "audio/mpeg",
      size: 32_000,
      durationMs: 180_000,
      alt: "Rekaman penjelasan suhu malam",
      caption: "Rekaman penjelasan suhu malam untuk pelajaran batik.",
      credit: "KalaNidhi Digital",
      permission: "Izin internal platform",
      status: "active",
      uploadedBy: "Pengelola",
      createdAt: ago(60),
    })
    await ctx.db.insert("mediaAssets", {
      kind: "video",
      storageId: videoStorage,
      filename: "lesson-pranatacara-video.mp4",
      mimeType: "video/mp4",
      size: 64_000,
      durationMs: 240_000,
      alt: "Rekaman latihan tata wicara",
      caption: "Rekaman latihan tata wicara untuk pelajaran pranatacara.",
      credit: "KalaNidhi Digital",
      permission: "Izin internal platform",
      status: "active",
      uploadedBy: "Pengelola",
      createdAt: ago(60),
    })

    return {
      seeded: true,
      fields: catalogFieldsSeed.length,
      paths: pathsSeed.length,
      teachers: teachersSeed.length,
      works: worksSeed.length,
      testimonials: testimonialsSeed.length,
      faqs: faqsSeed.length,
      revisions: 3,
      seo: seoRoutes.length,
    }
  },
})

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export const hasContent = internalQuery({
  args: {},
  handler: async (ctx) => {
    const site = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique()
    return Boolean(site)
  },
})
