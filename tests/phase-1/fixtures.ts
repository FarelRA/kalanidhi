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

/** Deterministic, schema-valid content document built from the shipped copy. */
export function contentFixture(): SiteData {
  return {
    ...structuredClone(siteSeed),
    catalog: {
      ...structuredClone(siteSeed.catalog),
      fields: catalogFieldsSeed.map((field, index) => ({
        ...structuredClone(field),
        order: index,
      })),
    },
    paths: pathsSeed.map((path, index) => ({
      ...structuredClone(path),
      order: index,
    })),
    teachers: teachersSeed.map((teacher, index) => ({
      ...structuredClone(teacher),
      order: index,
    })),
    works: worksSeed.map((work, index) => ({
      ...structuredClone(work),
      order: index,
    })),
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
    await ctx.db.insert("siteContent", {
      key: "site",
      value: {
        hero: data.hero,
        traction: data.traction,
        loop: data.loop,
        catalog: {
          label: data.catalog.label,
          title: data.catalog.title,
          description: data.catalog.description,
          cta: data.catalog.cta,
          groups: data.catalog.groups,
        },
        mangsa: data.mangsa,
        ethics: data.ethics,
        institution: data.institution,
        sections: data.sections,
        footer: data.footer,
        navigation: data.navigation,
        overlays: data.overlays,
        header: data.header,
        search: data.search,
        mobileCta: data.mobileCta,
        leadDialogs: data.leadDialogs,
        metadata: data.metadata,
      },
      updatedAt: NOW,
    })

    for (const [index, field] of data.catalog.fields.entries()) {
      await ctx.db.insert("catalogFields", { order: index, ...field })
    }
    for (const [index, path] of data.paths.entries()) {
      await ctx.db.insert("paths", {
        ...path,
        order: index,
        status: "open",
        createdAt: NOW,
      })
    }
    for (const [index, teacher] of data.teachers.entries()) {
      await ctx.db.insert("teachers", {
        ...teacher,
        order: index,
        status: "active",
        published: true,
        verificationStatus: "verified",
        verifiedAt: NOW,
      })
    }
    for (const [index, work] of data.works.entries()) {
      await ctx.db.insert("works", {
        ...work,
        order: index,
        status: "published",
        createdAt: NOW,
      })
    }
    for (const [index, testimonial] of data.testimonials.entries()) {
      await ctx.db.insert("testimonials", { order: index, ...testimonial })
    }
    for (const [index, faq] of data.faqs.entries()) {
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
