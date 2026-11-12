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
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server"

const DAY = 86_400_000
const NOW = Date.now()
const ago = (days: number) => NOW - days * DAY

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
  const documents = await ctx.db.query(table as any).collect()
  for (const document of documents) {
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

async function userByEmail(ctx: MutationCtx, email: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique()
  if (!user) throw new Error(`Seed user missing: ${email}`)
  return user
}

const PATH_TEACHER_EMAIL: Record<string, string> = {
  "batik-tulis-soga": "bambang@kalanidhi.site",
  "pranatacara-jawa": "widagdo@kalanidhi.site",
  "kriya-ukir-jepara": "joko@kalanidhi.site",
}

const PATH_STATUS: Record<string, "open" | "mapping" | "planned"> = {
  "batik-tulis-soga": "open",
  "pranatacara-jawa": "open",
  "kriya-ukir-jepara": "planned",
}

export const seedContent = internalMutation({
  args: {},
  handler: async (ctx) => {
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

    const baseCopy = toStoredCopy(storedSite)
    const siteId = await ctx.db.insert("siteContent", {
      key: "site",
      value: baseCopy,
      updatedAt: NOW,
    })

    for (const [order, field] of catalogFieldsSeed.entries()) {
      await ctx.db.insert("catalogFields", { order, ...field })
    }

    for (const [order, path] of storedSite.paths.entries()) {
      const teacher = await userByEmail(
        ctx,
        PATH_TEACHER_EMAIL[path.slug] ?? "bambang@kalanidhi.site",
      )
      await ctx.db.insert("paths", {
        order,
        ...path,
        teacherId: teacher._id,
        status: PATH_STATUS[path.slug] ?? "open",
        createdAt: ago(120),
      })
    }

    for (const [order, teacher] of storedSite.teachers.entries()) {
      const user = await userByEmail(
        ctx,
        `${teacher.slug.split("-")[0]}@kalanidhi.site`,
      )
      const isReview = teacher.slug === "joko-santoso"
      await ctx.db.insert("teachers", {
        order,
        ...teacher,
        userId: user._id,
        pathIds: [pathSlugForTeacher(teacher.slug)],
        status: isReview ? "review" : "active",
        verificationStatus: isReview ? "under_review" : "verified",
        verifiedBy: isReview ? undefined : "seed",
        verifiedAt: isReview ? undefined : ago(110),
        published: !isReview,
        publishedAt: isReview ? undefined : ago(110),
      })
    }

    for (const [order, work] of storedSite.works.entries()) {
      await ctx.db.insert("works", {
        order,
        ...work,
        status: "published",
        createdAt: ago(300),
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

    for (const [order, faq] of faqsSeed.entries()) {
      await ctx.db.insert("faqs", { order, ...faq })
    }

    const featured = {
      pathSlugs: storedSite.paths.map((path) => path.slug),
      teacherSlugs: storedSite.teachers.map((teacher) => teacher.slug),
      workSlugs: storedSite.works.map((work) => work.slug),
      testimonialIds,
    }
    await ctx.db.patch(siteId, {
      value: { ...baseCopy, featured },
      updatedAt: NOW,
    })

    const draftCopy = JSON.parse(JSON.stringify(baseCopy)) as Record<
      string,
      unknown
    >
    const draftHero = draftCopy.hero as { title: string[] }
    draftHero.title = [
      "Duduk di bangku ini.",
      "Nanti kamu yang mengajari.",
    ]
    const scheduledCopy = JSON.parse(JSON.stringify(baseCopy)) as Record<
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
      value: { ...baseCopy, featured },
      status: "published",
      authorId: (await userByEmail(ctx, "farel@farel.is-a.dev"))._id,
      note: "Terbitan awal edisi 2026.",
      createdAt: ago(60),
      publishedAt: ago(60),
    })
    await ctx.db.insert("contentRevisions", {
      key: "site",
      version: 2,
      value: { ...draftCopy, featured },
      status: "draft",
      authorId: (await userByEmail(ctx, "farel@farel.is-a.dev"))._id,
      note: "Draf penyempurnaan judul hero.",
      basedOnVersion: 1,
      createdAt: ago(2),
    })
    await ctx.db.insert("contentRevisions", {
      key: "site",
      version: 3,
      value: { ...scheduledCopy, featured },
      status: "scheduled",
      authorId: (await userByEmail(ctx, "farel@farel.is-a.dev"))._id,
      note: "Jadwal pembaruan kabar edisi Desember.",
      basedOnVersion: 1,
      createdAt: ago(1),
      scheduledFor: NOW + 7 * DAY,
    })

    await ctx.db.insert("contentPreviews", {
      contentKey: "site",
      version: 2,
      tokenHash: await sha256("seed-preview-token"),
      createdBy: (await userByEmail(ctx, "farel@farel.is-a.dev"))._id,
      createdAt: ago(1),
      expiresAt: NOW + 2 * DAY,
    })

    const seoRoutes = [
      {
        route: "/",
        title: "KalaNidhi Digital — Belajar praktik budaya Nusantara",
        description:
          "Platform belajar praktik budaya Nusantara dengan penilaian pengajar, sertifikat platform, dan Kartu Karya.",
      },
      {
        route: "/karya/batik-soga-anyaman",
        title: "Kain Batik Soga Anyaman — KalaNidhi Digital",
        description:
          "Kain batik tulis soga dari Anisa Rahmawati, lulusan jalur Batik Tulis Soga.",
      },
      {
        route: "/karya/selendang-canting-nitik",
        title: "Selendang Canting Nitik — KalaNidhi Digital",
        description:
          "Selendang primis dengan titik canting rapat dari Dimas Yoga Pratama.",
      },
      {
        route: "/karya/batik-soga-lereng",
        title: "Batik Tulis Soga Lereng — KalaNidhi Digital",
        description:
          "Karya lanjutan dengan 14 tahap pewarnaan soga dari Bambang Purnomo.",
      },
      {
        route: "/karya/pranatacara-siraman",
        title: "Pembawa Acara Siraman — KalaNidhi Digital",
        description:
          "Layanan pembawa acara siraman dan midodareni dari Rani Wikaningsih.",
      },
      {
        route: "/verifikasi",
        title: "Verifikasi sertifikat — KalaNidhi Digital",
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
        canonical: `https://kalanidhi.site${seo.route}`,
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
      caption: "Contoh audio pelajaran batik.",
      credit: "KalaNidhi Digital",
      permission: "Izin internal platform",
      status: "active",
      uploadedBy: "seed",
      createdAt: ago(60),
    })
    await ctx.db.insert("mediaAssets", {
      kind: "video",
      storageId: videoStorage,
      filename: "lesson-pranatacara-video.mp4",
      mimeType: "video/mp4",
      size: 64_000,
      durationMs: 240_000,
      alt: "Contoh video latihan tata wicara",
      caption: "Contoh video pelajaran pranatacara.",
      credit: "KalaNidhi Digital",
      permission: "Izin internal platform",
      status: "active",
      uploadedBy: "seed",
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

function pathSlugForTeacher(slug: string): string {
  if (slug === "bambang-hardjono" || slug === "sri-sriningsih") {
    return "batik-tulis-soga"
  }
  if (slug === "widagdo-saputra") return "pranatacara-jawa"
  return "kriya-ukir-jepara"
}

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
