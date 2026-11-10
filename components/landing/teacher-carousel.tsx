"use client"

import Image from "next/image"
import { useState } from "react"

import { useOverlay } from "@/components/overlays/overlay-provider"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Teacher } from "@/lib/content/landing"

export function TeacherCarousel({ teachers }: { teachers: Teacher[] }) {
  const [selected, setSelected] = useState<Teacher | null>(null)
  const { openLead } = useOverlay()

  function openLeadAfterClose(request: Parameters<typeof openLead>[0]) {
    setSelected(null)
    window.setTimeout(() => openLead(request), 220)
  }

  return (
    <>
      <Carousel
        opts={{ align: "start", loop: false }}
        className="mt-10"
        aria-label="Pengajar dan praktisi"
      >
        <CarouselContent className="-ml-5">
          {teachers.map((teacher, index) => (
            <CarouselItem
              key={teacher.slug}
              className="basis-full pl-5 sm:basis-1/2 lg:basis-1/3"
            >
              <article className="group">
                <button
                  type="button"
                  onClick={() => setSelected(teacher)}
                  className="relative block aspect-[4/5] w-full overflow-hidden border border-paper/15 bg-ink-2 text-left"
                  aria-label={`Lihat profil ${teacher.name}`}
                >
                  <Image
                    src={teacher.image}
                    alt={`Potret ${teacher.name}`}
                    fill
                    placeholder="blur"
                    sizes="(max-width: 640px) 86vw, (max-width: 1024px) 50vw, 38vw"
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.025]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/15 to-transparent" />
                  <span className="absolute left-4 top-4 bg-ink/55 px-2 py-0.5 text-[10px] tracking-[0.08em] text-paper/80 backdrop-blur-sm">
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(teachers.length).padStart(2, "0")}
                  </span>
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 border border-paper/25 bg-ink/60 px-2 py-1 text-[9px] text-paper backdrop-blur-sm">
                    <span className="size-1.5 rounded-full bg-indigo-dust" />
                    Terverifikasi
                  </span>
                  <blockquote className="absolute inset-x-5 bottom-5 font-heading text-[1.25rem] leading-[1.2] text-paper sm:text-[1.45rem]">
                    “{teacher.quote}”
                  </blockquote>
                </button>

                <div className="mt-4 flex items-start justify-between gap-4 border-t border-paper/15 pt-3">
                  <div>
                    <h3 className="font-heading text-[1.3rem] leading-none text-paper">
                      {teacher.name}
                    </h3>
                    <p className="mt-1.5 text-[11px] text-soga">
                      {teacher.specialty}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {teacher.region}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(teacher)}
                    className="shrink-0 border-b border-paper/30 pb-0.5 text-[11px] text-paper-dim transition-colors hover:border-soga hover:text-soga"
                  >
                    Profil
                  </button>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="mt-7 flex items-center justify-end gap-4 border-t border-paper/12 pt-4">
          <div className="flex items-center gap-4">
            <CarouselPrevious
              variant="ghost"
              size="icon-sm"
              className="static my-0 border border-paper/20 text-paper"
            />
            <CarouselNext
              variant="ghost"
              size="icon-sm"
              className="static my-0 border border-paper/20 text-paper"
            />
          </div>
        </div>
      </Carousel>

      {selected ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
        >
          <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
            <div className="grid sm:grid-cols-[210px_1fr]">
              <div className="relative aspect-square bg-ink-2 sm:aspect-auto sm:h-full">
                <Image
                  src={selected.image}
                  alt={`Potret ${selected.name}`}
                  fill
                  placeholder="blur"
                  sizes="(max-width: 640px) 100vw, 210px"
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent sm:bg-gradient-to-r" />
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <DialogHeader className="gap-2 pr-6">
                  <p className="section-label">Pengajar terverifikasi</p>
                  <DialogTitle>{selected.name}</DialogTitle>
                  <DialogDescription>
                    {selected.specialty}, {selected.region}
                  </DialogDescription>
                </DialogHeader>

                <blockquote className="border-l border-soga/60 pl-4 font-heading text-[1.15rem] leading-[1.35] text-paper">
                  “{selected.quote}”
                </blockquote>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-paper/12 py-4">
                  {[
                    ["Pengalaman", selected.experience],
                    ["Komunitas", selected.community],
                    ["Fokus", selected.focus],
                    ["Jalur", selected.path],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[9px] text-text-muted">{label}</dt>
                      <dd className="mt-1 text-[12px] leading-snug text-paper">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-col-reverse gap-2 border-t border-paper/12 pt-4 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(null)}
                  >
                    Tutup
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openLeadAfterClose({
                        variant: "consultation",
                        interest: selected.path,
                      })
                    }
                  >
                    Tanya pengajar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const target = document.getElementById("jalur")
                      setSelected(null)
                      window.setTimeout(
                        () => target?.scrollIntoView({ behavior: "smooth" }),
                        220,
                      )
                    }}
                  >
                    Lihat jalur
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
