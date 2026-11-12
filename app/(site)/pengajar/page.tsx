import type { Metadata } from "next"

import { PublicPageIntro } from "@/components/landing/public-page-intro"
import { TeacherCard } from "@/components/landing/teacher-card"
import { buildPageMetadata } from "@/lib/content/metadata"
import { PUBLIC_ROUTES } from "@/lib/content/routes"
import { getPublicTeachers, getSiteData } from "@/lib/convex/server"

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData()
  return buildPageMetadata(PUBLIC_ROUTES.teachers, {
    title: data.sections.teachers.title,
    description: data.sections.teachers.description,
    alternates: { canonical: PUBLIC_ROUTES.teachers },
  })
}

export default async function TeachersPage() {
  const [data, teachers] = await Promise.all([
    getSiteData(),
    getPublicTeachers(),
  ])
  const copy = data.sections.teachers

  return (
    <div className="bg-cream">
      <section className="shell py-12 sm:py-16">
        <PublicPageIntro
          homeLabel={data.header.homeLabel}
          eyebrow={copy.label}
          title={copy.title}
          description={copy.description}
        />

        {teachers.length === 0 ? (
          <p className="mt-12 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
            Belum ada pengajar terbit di Convex. Profil akan muncul di sini
            setelah pengajar menyelesaikan verifikasi dan publikasi.
          </p>
        ) : (
          <div className="mt-12 grid gap-12 md:grid-cols-3 md:items-start md:gap-7 lg:gap-8">
            {teachers.map((teacher, index) => (
              <TeacherCard
                key={teacher.slug}
                teacher={teacher}
                copy={copy}
                offset={index === 1}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
