"use client"

import Image from "next/image"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { SectionCopy, Teacher } from "@/lib/content/types"
import { cn } from "cn"

import { TeacherDialog } from "./teacher-dialog"

export function BenchTeachers({
  teachers,
  copy,
}: {
  teachers: Teacher[]
  copy: SectionCopy["teachers"]
}) {
  const [selected, setSelected] = useState<Teacher | null>(null)

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

        <div className="mt-12 grid gap-12 md:grid-cols-3 md:items-start md:gap-7 lg:mt-16 lg:gap-8">
          {teachers.map((teacher, index) => (
            <article
              key={teacher.slug}
              className={cn(index === 1 && "md:mt-14")}
            >
              <div className="relative aspect-[4/5] overflow-hidden border-[6px] border-paper-2 bg-panel shadow-plate">
                <Image
                  src={teacher.image}
                  alt={`Foto ${teacher.name}, ${teacher.specialty}`}
                  fill
                  sizes="(min-width: 768px) 33vw, 92vw"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep/85 via-deep/25 to-transparent p-3.5 pt-12">
                  <span className="stamp border-cream-2/50 text-cream-2">
                    {teacher.experience}
                  </span>
                </div>
              </div>

              <div className="relative -mt-7 ml-3 mr-5 border-2 border-ink bg-paper-2 p-4 shadow-[4px_4px_0_var(--teak)]">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                  {teacher.specialty}
                </p>
                <h3 className="mt-1.5 font-heading text-[1.5rem] leading-none">
                  {teacher.name}
                </h3>
                <p className="mt-2 text-[11px] leading-snug text-ink-muted">
                  {teacher.region}
                </p>
              </div>

              <blockquote className="mt-5 px-1 font-heading text-[1.22rem] italic leading-[1.35] text-ink/85">
                &ldquo;{teacher.quote}&rdquo;
              </blockquote>

              <div className="mt-5 flex items-end justify-between gap-3 border-t border-ink/20 pt-3">
                <p className="max-w-[14rem] text-[10.5px] leading-snug text-ink-muted">
                  {teacher.community}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(teacher)}
                  aria-label={`Baca profil ${teacher.name}`}
                  className="shrink-0 border-ink/35"
                >
                  {copy.profileCta}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selected ? (
        <TeacherDialog
        teacher={selected}
        copy={copy}
        onClose={() => setSelected(null)}
      />
      ) : null}
    </section>
  )
}
