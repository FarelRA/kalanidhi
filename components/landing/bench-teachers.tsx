import type { SectionCopy, Teacher } from "@/lib/content/types"

import { TeacherCard } from "./teacher-card"

export function BenchTeachers({
  teachers,
  copy,
}: {
  teachers: Teacher[]
  copy: SectionCopy["teachers"]
}) {
  return (
    <section
      id="pengajar"
      aria-labelledby="teachers-title"
      className="border-b border-ink/15 bg-cream py-16 sm:py-20 lg:py-24"
    >
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="stamp border-ink/35 text-ink">{copy.label}</span>
            <h2 id="teachers-title" className="heading-section mt-5 max-w-[16ch]">
              {copy.title}
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="body-copy max-w-[34rem]">{copy.description}</p>
          </div>
        </div>

        {teachers.length === 0 ? (
          <p className="mt-12 max-w-xl border border-ink/25 bg-paper-2 p-5 text-[12.5px] leading-relaxed text-ink-soft">
            {copy.emptyState}
          </p>
        ) : (
          <div className="mt-12 grid gap-12 md:grid-cols-3 md:items-start md:gap-7 lg:mt-16 lg:gap-8">
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
      </div>
    </section>
  )
}
