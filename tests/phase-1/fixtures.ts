import type { Id } from "../../convex/_generated/dataModel"
import type { SiteData } from "../../lib/content/types"
import {
  catalogFieldsSeed,
  faqsSeed,
  pathsSeed,
  siteSeed,
  teachersSeed,
  testimonialsSeed,
  worksSeed,
} from "../../convex/seedData"
import { seedAccount, type TestDb } from "../helpers/convex"

export const NOW = 1_760_000_000_000
export const FIXTURE_IMAGE = "https://storage.example.test/seed.jpg"

/** Deterministic, schema-valid content document built from the shipped copy. */
export function contentFixture(): SiteData {
  return {
    ...structuredClone(siteSeed),
    hero: {
      ...structuredClone(siteSeed.hero),
      plate: {
        ...structuredClone(siteSeed.hero.plate),
        image: FIXTURE_IMAGE,
      },
    },
    metadata: {
      ...structuredClone(siteSeed.metadata),
      image: {
        ...structuredClone(siteSeed.metadata.image),
        url: FIXTURE_IMAGE,
      },
    },
    catalog: {
      ...structuredClone(siteSeed.catalog),
      fields: catalogFieldsSeed.map((field, index) => ({
        ...structuredClone(field),
        order: index,
      })),
    },
    paths: pathsSeed.map(({ imageFile, ...path }, index) => {
      void imageFile
      return { ...structuredClone(path), image: FIXTURE_IMAGE, order: index }
    }),
    teachers: teachersSeed.map(({ imageFile, ...teacher }, index) => {
      void imageFile
      return { ...structuredClone(teacher), image: FIXTURE_IMAGE, order: index }
    }),
    works: worksSeed.map(({ imageFile, ...work }, index) => {
      void imageFile
      return { ...structuredClone(work), image: FIXTURE_IMAGE, order: index }
    }),
    testimonials: testimonialsSeed.map((testimonial, index) => ({
      ...structuredClone(testimonial),
      order: index,
    })),
    faqs: faqsSeed.map((faq, index) => ({
      ...structuredClone(faq),
      order: index,
    })),
  } as SiteData
}

export async function seedContent(t: TestDb): Promise<void> {
  const data = contentFixture()
  await t.run(async (ctx) => {
    const imageAssetId = await ctx.db.insert("mediaAssets", {
      kind: "image",
      externalUrl: FIXTURE_IMAGE,
      filename: "seed.jpg",
      mimeType: "image/jpeg",
      size: 10,
      alt: "Gambar uji",
      status: "active",
      uploadedBy: "system",
      createdAt: NOW,
    })

    const {
      hero,
      metadata,
      catalog,
      paths,
      teachers,
      works,
      testimonials,
      faqs,
      ...copy
    } = data

    await ctx.db.insert("siteContent", {
      key: "site",
      value: {
        ...copy,
        hero: {
          ...hero,
          plate: {
            alt: hero.plate.alt,
            caption: hero.plate.caption,
            note: hero.plate.note,
            imageAssetId,
          },
        },
        metadata: {
          ...metadata,
          image: {
            width: metadata.image.width,
            height: metadata.image.height,
            alt: metadata.image.alt,
            imageAssetId,
          },
        },
        catalog: {
          label: catalog.label,
          title: catalog.title,
          description: catalog.description,
          cta: catalog.cta,
          groups: catalog.groups,
        },
      },
      updatedAt: NOW,
    })

    for (const [index, field] of catalog.fields.entries()) {
      await ctx.db.insert("catalogFields", { order: index, ...field })
    }
    for (const [index, path] of paths.entries()) {
      const { image, ...rest } = path
      void image
      await ctx.db.insert("paths", {
        ...rest,
        order: index,
        status: "open",
        createdAt: NOW,
        imageAssetId,
      })
    }
    for (const [index, teacher] of teachers.entries()) {
      const { image, ...rest } = teacher
      void image
      await ctx.db.insert("teachers", {
        ...rest,
        order: index,
        status: "active",
        published: true,
        verificationStatus: "verified",
        verifiedAt: NOW,
        imageAssetId,
      })
    }
    for (const [index, work] of works.entries()) {
      const { image, ...rest } = work
      void image
      await ctx.db.insert("works", {
        ...rest,
        order: index,
        status: "published",
        createdAt: NOW,
        imageAssetId,
      })
    }
    for (const [index, testimonial] of testimonials.entries()) {
      await ctx.db.insert("testimonials", { order: index, ...testimonial })
    }
    for (const [index, faq] of faqs.entries()) {
      await ctx.db.insert("faqs", { order: index, ...faq })
    }
  })
}

export async function seedAdmin(
  t: TestDb,
  authUserId = "auth-admin",
  name = "Nadia Kusuma",
): Promise<Id<"users">> {
  return await seedAccount(t, {
    authUserId,
    name,
    email: `${authUserId}@example.test`,
    roles: ["admin"],
  })
}

export async function seedStudent(
  t: TestDb,
  authUserId = "auth-student",
  name = "Anisa Rahmawati",
): Promise<Id<"users">> {
  return await seedAccount(t, {
    authUserId,
    name,
    email: `${authUserId}@example.test`,
    roles: ["student"],
  })
}

export async function seedLead(
  t: TestDb,
  overrides: Partial<{
    intent: "student" | "institution" | "consultation" | "notify"
    name: string
    email: string
    status: "new" | "contacted" | "qualified" | "converted" | "lost" | "closed" | "spam"
  }> = {},
): Promise<Id<"leads">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("leads", {
      intent: overrides.intent ?? "student",
      name: overrides.name ?? "Wahyu Pratama",
      email: overrides.email ?? "wahyu@example.test",
      whatsapp: "+62 800 1234",
      consent: true,
      status: overrides.status ?? "new",
      source: "landing",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

export function errorCode(error: unknown): string | null {
  const value = error as { data?: { code?: string }; message?: string }
  if (value?.data?.code) return value.data.code
  const match = value?.message?.match(/code[^a-z]+([A-Z_]+)/i)
  return match?.[1] ?? null
}

export function clone<T>(value: T): T {
  return structuredClone(value)
}
