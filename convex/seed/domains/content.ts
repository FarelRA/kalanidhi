import { v } from "convex/values"

import type {
  ContentDocument,
  FeaturedSelection,
} from "../../../lib/content/types"
import { pathHref, PUBLIC_ROUTES, workHref } from "../../../lib/content/routes"
import type { StoredContentValue } from "../../content"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../../_generated/server"
import { createSeedClock, DAY } from "../lib/clock"
import { sha256 } from "../lib/hash"
import { seedAdmin } from "../lib/lookup"
import { mediaUrl, resolveMediaAsset } from "../lib/media"
import {
  catalogFieldsSeed,
  faqsSeed,
  pathsSeed,
  siteSeed,
  teachersSeed,
  testimonialsSeed,
  worksSeed,
} from "../content/data"

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
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const baseCopy: Omit<StoredContentValue, "featured"> = {
      ...siteSeed,
      hero: {
        ...siteSeed.hero,
        plate: {
          alt: siteSeed.hero.plate.alt,
          caption: siteSeed.hero.plate.caption,
          note: siteSeed.hero.plate.note,
          imageAssetId: await resolveMediaAsset(
            ctx,
            siteSeed.hero.plate.imageFile,
          ),
        },
      },
      metadata: {
        ...siteSeed.metadata,
        image: {
          width: siteSeed.metadata.image.width,
          height: siteSeed.metadata.image.height,
          alt: siteSeed.metadata.image.alt,
          imageAssetId: await resolveMediaAsset(
            ctx,
            siteSeed.metadata.image.imageFile,
          ),
        },
      },
    }

    const seededPaths = await Promise.all(
      pathsSeed.map(async ({ imageFile, ...rest }) => ({
        ...rest,
        imageAssetId: await resolveMediaAsset(ctx, imageFile),
      })),
    )
    // Identity fields power the workspace seed; the public table stores only
    // the published teacher record.
    const seededTeachers = await Promise.all(
      teachersSeed.map(
        async ({
          imageFile,
          key,
          pathIds,
          status,
          verificationStatus,
          published,
          ...rest
        }) => {
          void key
          void pathIds
          void status
          void verificationStatus
          void published
          return {
            ...rest,
            imageAssetId: await resolveMediaAsset(ctx, imageFile),
          }
        },
      ),
    )
    const seededWorks = await Promise.all(
      worksSeed.map(
        async ({ imageFile, makerKey, pathSlug, certificateKey, ...rest }) => {
          void makerKey
          void pathSlug
          void certificateKey
          return {
            ...rest,
            imageAssetId: await resolveMediaAsset(ctx, imageFile),
          }
        },
      ),
    )

    for (const [order, field] of catalogFieldsSeed.entries()) {
      await ctx.db.insert("catalogFields", { order, ...field })
    }

    const users = await usersByName(ctx)

    for (const [order, path] of seededPaths.entries()) {
      const teacher = teacherForPath(path)
      const user = teacher ? users.get(teacher.name) : undefined
      if (teacher && !user) {
        throw new Error(`Seed teacher user missing for path ${path.slug}`)
      }
      await ctx.db.insert("paths", {
        order,
        ...path,
        modules: 0,
        teacherId: user?._id,
        status: path.comingSoon ? "planned" : "open",
        createdAt: clock.ago(395 - order * 12),
      })
    }

    for (const [order, teacher] of seededTeachers.entries()) {
      const user = users.get(teacher.name)
      if (!user) throw new Error(`Seed user missing, ${teacher.name}`)
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
        verifiedAt: isReview ? undefined : clock.ago(390 - order * 10),
        published: !isReview,
        publishedAt: isReview ? undefined : clock.ago(388 - order * 10),
      })
    }

    const makers = await usersByName(ctx)
    for (const [order, work] of seededWorks.entries()) {
      const source = worksSeed[order]
      const maker = source ? makers.get(source.maker) : undefined
      const workId = await ctx.db.insert("works", {
        order,
        ...work,
        makerId: maker?._id,
        pathId: source?.pathSlug,
        status: "published",
        createdAt: clock.ago(390 - order * 20),
      })
      if (source && maker) {
        await ctx.db.insert("workCards", {
          workId,
          makerId: maker._id,
          serial: source.workCard,
          title: source.title,
          technique: source.technique,
          materials: source.unit,
          provenance: `Karya peserta ${source.maker} pada ${source.pathSlug}.`,
          permission: source.permission,
          accessLevel: "public",
          status: "published",
          createdAt: clock.ago(390 - order * 20),
          updatedAt: clock.now,
        })
      }
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
      teacherSlugs: teachersSeed
        .filter((teacher) => teacher.published)
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
      updatedAt: clock.now,
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
          image: await mediaUrl(ctx, baseCopy.hero.plate.imageAssetId),
        },
      },
      metadata: {
        ...baseCopy.metadata,
        image: {
          width: baseCopy.metadata.image.width,
          height: baseCopy.metadata.image.height,
          alt: baseCopy.metadata.image.alt,
          url: await mediaUrl(ctx, baseCopy.metadata.image.imageAssetId),
        },
      },
    }

    const draftCopy = JSON.parse(JSON.stringify(revisionCopy)) as Record<
      string,
      unknown
    >
    const draftHero = draftCopy.hero as { title: string[] }
    draftHero.title = [
      "Buka layarmu,",
      "Kenali Budayamu",
    ]
    const scheduledCopy = JSON.parse(JSON.stringify(revisionCopy)) as Record<
      string,
      unknown
    >
    const scheduledBanner = scheduledCopy.footer as {
      newsletter: { label: string }
    }
    scheduledBanner.newsletter.label =
      "Kabar kelas dan karya baru, edisi Desember"

    await ctx.db.insert("contentRevisions", {
      key: "site",
      version: 1,
      value: revisionCopy,
      status: "published",
      authorId: (await seedAdmin(ctx))._id,
      note: "Terbitan awal edisi 2026.",
      createdAt: clock.ago(60),
      publishedAt: clock.ago(60),
    })
    await ctx.db.insert("contentRevisions", {
      key: "site",
      version: 2,
      value: draftCopy,
      status: "draft",
      authorId: (await seedAdmin(ctx))._id,
      note: "Draf penyempurnaan judul hero.",
      basedOnVersion: 1,
      createdAt: clock.ago(2),
    })
    await ctx.db.insert("contentRevisions", {
      key: "site",
      version: 3,
      value: scheduledCopy,
      status: "scheduled",
      authorId: (await seedAdmin(ctx))._id,
      note: "Jadwal pembaruan kabar edisi Desember.",
      basedOnVersion: 1,
      createdAt: clock.ago(1),
      scheduledFor: clock.now + 7 * DAY,
    })

    await ctx.db.insert("contentPreviews", {
      contentKey: "site",
      version: 2,
      tokenHash: await sha256("seed-preview-token"),
      createdBy: (await seedAdmin(ctx))._id,
      createdAt: clock.ago(1),
      expiresAt: clock.now + 2 * DAY,
    })

    const siteName = siteSeed.metadata.siteName
    const siteUrl = siteSeed.metadata.siteUrl.replace(/\/+$/, "")
    const seoRoutes = [
      {
        route: PUBLIC_ROUTES.home,
        title: `${siteName} | Belajar praktik budaya Nusantara`,
        description: siteSeed.metadata.description,
      },
      ...seededPaths.map((path) => ({
        route: pathHref(path.slug),
        title: `${path.title} | ${siteName}`,
        description: path.subtitle,
      })),
      ...seededWorks.map((work) => ({
        route: workHref(work.slug),
        title: `${work.title} | ${siteName}`,
        description: work.description,
      })),
      {
        route: PUBLIC_ROUTES.verify,
        title: `Verifikasi sertifikat | ${siteName}`,
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
        updatedAt: clock.now,
      })
    }

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
