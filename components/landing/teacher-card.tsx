import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { SectionCopy, Teacher } from "@/lib/content/types"
import { interestHref, teacherHref } from "@/lib/content/routes"
import { cn } from "cn"

export function TeacherCard({
  teacher,
  copy,
  offset = false,
}: {
  teacher: Teacher
  copy: SectionCopy["teachers"]
  offset?: boolean
}) {
  return (
    <article className={cn(offset && "md:mt-14")}>
      <div className="relative aspect-[4/5] overflow-hidden border-[6px] border-paper-2 bg-panel shadow-plate">
        {teacher.image ? (
          <Image
            src={teacher.image}
            alt={`Foto ${teacher.name}, ${teacher.specialty}`}
            fill
            sizes="(min-width: 768px) 33vw, 92vw"
            className="object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center font-heading text-4xl text-ink-muted">
            {teacher.initials}
          </span>
        )}
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
          <Link
            href={teacherHref(teacher.slug)}
            className="transition-colors hover:text-copper-dark"
          >
            {teacher.name}
          </Link>
        </h3>
        <p className="mt-2 text-[11px] leading-snug text-ink-muted">
          {teacher.region}
        </p>
      </div>

      <blockquote className="mt-5 px-1 font-heading text-[1.22rem] italic leading-[1.35] text-ink/85">
        &ldquo;{teacher.quote}&rdquo;
      </blockquote>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-ink/20 pt-3">
        <p className="max-w-[14rem] text-[10.5px] leading-snug text-ink-muted">
          {teacher.community}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-ink/35"
          >
            <Link
              href={teacherHref(teacher.slug)}
              aria-label={`Baca profil ${teacher.name}`}
            >
              {copy.profileCta}
            </Link>
          </Button>
          <Link
            href={interestHref({ teacher: teacher.slug, intent: "consultation" })}
            className="inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
          >
            {copy.askCta}
          </Link>
        </div>
      </div>
    </article>
  )
}
