"use client"

import * as React from "react"
import Image from "next/image"
import {
  Check,
  ChevronRight,
  Eye,
  FileText,
  History,
  Monitor,
  Save,
  Send,
  Smartphone,
  TriangleAlert,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import {
  cmsSections,
  contentRevisions,
  paths,
  teachers,
  works,
} from "@/lib/workspace/mock-data"
import type { CmsSection } from "@/lib/workspace/types"
import { cn } from "cn"

export function ContentCms() {
  const [sections, setSections] = React.useState<CmsSection[]>(cmsSections)
  const [activeId, setActiveId] = React.useState(sections[0]?.id ?? "hero")
  const [viewport, setViewport] = React.useState<"desktop" | "mobile">("desktop")
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [schedule, setSchedule] = React.useState("")
  const [savedAt, setSavedAt] = React.useState("09.12")
  const [published, setPublished] = React.useState(false)

  const active = sections.find((item) => item.id === activeId) ?? sections[0]

  function updateField(fieldId: string, value: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === activeId
          ? {
              ...section,
              dirty: true,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, value } : field,
              ),
            }
          : section,
      ),
    )
  }

  function valueOf(sectionId: string, fieldId: string) {
    return (
      sections
        .find((section) => section.id === sectionId)
        ?.fields.find((field) => field.id === fieldId)?.value ?? ""
    )
  }

  const dirtySections = sections.filter((section) => section.dirty)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Konten"
        title="Halaman depan, dari bangku ini."
        description="Setiap teks dan entitas di landing dapat diedit, dipratinjau, lalu diterbitkan. Perubahan disimpan sebagai revisi dan bisa dibalik."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp
              label={published ? "Terbit" : "Draf v18"}
              tone={published ? "done" : "wait"}
            />
            <span className="text-[10px] text-ink-muted">
              {dirtySections.length} bagian berubah · tersimpan {savedAt}
            </span>
          </div>
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setSavedAt(
                  new Intl.DateTimeFormat("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date()),
                )
                toast("Draf tersimpan", {
                  description: "Perubahan tersimpan sebagai draf baru.",
                })
              }}
            >
              <Save aria-hidden="true" />
              Simpan draf
            </Button>
            <Button onClick={() => setPublishOpen(true)}>
              <Send aria-hidden="true" />
              Terbitkan
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,0.95fr)]">
        <Panel eyebrow="Bagian" title="Editor" bodyClassName="p-0">
          <nav aria-label="Bagian konten" className="max-h-[72vh] overflow-y-auto">
            <ul className="divide-y divide-ink/10">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(section.id)}
                    aria-pressed={activeId === section.id}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left transition-colors",
                      activeId === section.id
                        ? "bg-panel/60 text-ink"
                        : "text-ink-soft hover:bg-panel/30 hover:text-ink",
                    )}
                  >
                    <FileText className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold leading-tight">
                        {section.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] text-ink-muted">
                        {section.fields.length} medan
                      </span>
                    </span>
                    {section.dirty ? (
                      <span
                        className="size-1.5 shrink-0 bg-copper-dark"
                        aria-label="Ada perubahan"
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-ink/15 bg-paper/40 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[9.5px] leading-relaxed text-ink-muted">
              <Check className="size-3 text-moss" aria-hidden="true" />
              Tautan dan gambar valid
            </p>
          </div>
        </Panel>

        <Panel eyebrow="Medan" title={active?.label ?? "Editor"} bodyClassName="p-4">
          <p className="mb-4 border-l-2 border-copper/50 pl-3 text-[11px] leading-relaxed text-ink-soft">
            {active?.description}
          </p>
          <div className="space-y-4">
            {active?.fields.map((field) => (
              <div key={field.id}>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <span className="text-[8px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                    {field.id}
                  </span>
                </div>
                {field.multiline ? (
                  <Textarea
                    id={field.id}
                    value={field.value}
                    onChange={(event) => updateField(field.id, event.target.value)}
                    className="mt-1.5 min-h-24 text-[12px] leading-relaxed"
                  />
                ) : (
                  <Input
                    id={field.id}
                    value={field.value}
                    onChange={(event) => updateField(field.id, event.target.value)}
                    className="mt-1.5 text-[12px]"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/15 pt-3">
            <Button size="sm" variant="outline" onClick={() => setActiveId("hero")}>
              <Eye aria-hidden="true" />
              Lihat pratinjau
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                toast("Pemeriksaan konten", {
                  description: "0 tautan rusak, 0 gambar tanpa alt, 0 medan wajib kosong.",
                })
              }
            >
              Periksa medan
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            eyebrow="Pratinjau"
            title="Landing"
            bodyClassName="p-3"
            action={
              <div className="flex gap-1" role="group" aria-label="Ukuran pratinjau">
                <button
                  type="button"
                  aria-pressed={viewport === "desktop"}
                  onClick={() => setViewport("desktop")}
                  className={cn(
                    "flex size-11 items-center justify-center border",
                    viewport === "desktop"
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/20 text-ink-muted",
                  )}
                  aria-label="Pratinjau desktop"
                >
                  <Monitor className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-pressed={viewport === "mobile"}
                  onClick={() => setViewport("mobile")}
                  className={cn(
                    "flex size-11 items-center justify-center border",
                    viewport === "mobile"
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/20 text-ink-muted",
                  )}
                  aria-label="Pratinjau ponsel"
                >
                  <Smartphone className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            }
          >
            <div
              className={cn(
                "mx-auto overflow-hidden border border-ink/25 bg-cream transition-[max-width] duration-300",
                viewport === "mobile" ? "max-w-[300px]" : "max-w-full",
              )}
            >
              <div className="flex items-center justify-between border-b border-ink/15 bg-cream/95 px-3 py-2">
                <span className="font-heading text-[11px] font-semibold">KalaNidhi</span>
                <span className="flex gap-2 text-[7px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  <span>Jalur</span>
                  <span>Pengajar</span>
                  <span className="text-copper-dark">Daftar</span>
                </span>
              </div>
              <div className="wood-deep relative overflow-hidden px-4 py-5 text-paper">
                <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-brass">
                  KalaNidhi Digital · Yogyakarta
                </p>
                <h2 className="mt-2 max-w-sm font-heading text-[clamp(1.3rem,3.4vw,2rem)] leading-[1.02] text-paper">
                  {valueOf("hero", "hero.title.1")}{" "}
                  <span className="text-copper-light">{valueOf("hero", "hero.title.2")}</span>
                </h2>
                <p className="mt-2 line-clamp-4 max-w-sm text-[8px] leading-relaxed text-paper/70">
                  {valueOf("hero", "hero.description")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="border border-copper bg-copper px-2 py-1 text-[7px] font-bold uppercase tracking-[0.05em] text-paper">
                    {valueOf("hero", "hero.cta.primary")}
                  </span>
                  <span className="border border-paper/35 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.05em] text-paper/80">
                    {valueOf("hero", "hero.cta.secondary")}
                  </span>
                </div>
                <div className="absolute right-3 bottom-3 hidden w-24 rotate-2 border border-paper/30 bg-paper p-1 sm:block">
                  <div className="relative h-12 overflow-hidden bg-teak/30">
                    {valueOf("hero", "hero.plate.image") ? (
                      <Image
                        src={valueOf("hero", "hero.plate.image")}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[5px] font-bold uppercase tracking-[0.08em] text-ink">
                    {valueOf("hero", "hero.card.serial")} · Kartu Karya
                  </p>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div>
                  <p className="text-[6px] font-bold uppercase tracking-[0.12em] text-copper-dark">
                    {valueOf("loop", "loop.label")}
                  </p>
                  <h3 className="mt-1 font-heading text-[11px] leading-tight text-ink">
                    {valueOf("loop", "loop.title")}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[7px] leading-relaxed text-ink-soft">
                    {valueOf("loop", "loop.description")}
                  </p>
                  <ol className="mt-2 grid grid-cols-5 gap-1">
                    {["Belajar", "Dinilai", "Sertifikat", "Berkarya", "Kembali"].map(
                      (stage, index) => (
                        <li
                          key={stage}
                          className={cn(
                            "border px-0.5 py-1 text-center text-[5px] font-bold uppercase tracking-[0.04em]",
                            index === 4
                              ? "border-copper text-copper-dark"
                              : "border-ink/20 text-ink-muted",
                          )}
                        >
                          {stage}
                        </li>
                      ),
                    )}
                  </ol>
                </div>

                <div className="border-t border-ink/15 pt-3">
                  <p className="text-[6px] font-bold uppercase tracking-[0.12em] text-copper-dark">
                    {valueOf("catalog", "catalog.label")}
                  </p>
                  <h3 className="mt-1 font-heading text-[11px] leading-tight text-ink">
                    {valueOf("catalog", "catalog.title")}
                  </h3>
                  <div className="mt-2 space-y-1">
                    {paths.slice(0, 2).map((path) => (
                      <div
                        key={path.id}
                        className="flex items-center justify-between border border-ink/15 bg-paper-2 px-2 py-1 text-[6px]"
                      >
                        <span className="font-semibold text-ink">{path.title}</span>
                        <span className="text-ink-muted">{path.teacher}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-ink/15 pt-3">
                  <div>
                    <p className="text-[6px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                      Pengajar
                    </p>
                    {teachers.slice(0, 2).map((teacher) => (
                      <div key={teacher.slug} className="mt-1 border border-ink/15 p-1.5">
                        <p className="text-[6px] font-semibold text-ink">{teacher.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-[5px] leading-relaxed text-ink-muted">
                          {teacher.quote}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[6px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                      Karya
                    </p>
                    {works.slice(0, 2).map((work) => (
                      <div key={work.id} className="mt-1 border border-ink/15 p-1.5">
                        <p className="text-[6px] font-semibold text-ink">{work.title}</p>
                        <p className="mt-0.5 text-[5px] text-ink-muted">{work.maker}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="wood-deep px-4 py-3 text-paper">
                <p className="text-[6px] leading-relaxed text-paper/70">
                  {valueOf("footer", "footer.description")}
                </p>
                <p className="mt-1 text-[5px] uppercase tracking-[0.08em] text-brass">
                  {valueOf("footer", "footer.edition")} ·{" "}
                  {valueOf("footer", "footer.certificateNote")}
                </p>
              </div>
            </div>
            <p className="mt-2 text-center text-[9px] text-ink-muted">
              {viewport === "desktop" ? "Desktop 1200px" : "Ponsel 360px"} · pratinjau
              langsung
            </p>
          </Panel>

          <Panel
            eyebrow="Revisi"
            title="Riwayat terbit"
            bodyClassName="p-0"
            action={
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                <History className="size-3" aria-hidden="true" />
                5 revisi
              </span>
            }
          >
            <ul className="divide-y divide-ink/10">
              {contentRevisions.map((revision) => (
                <li key={revision.id} className="flex items-start gap-2.5 px-3 py-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-ink/20 font-heading text-[8px]">
                    {revision.version.replace("v", "")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10.5px] font-semibold text-ink">
                        {revision.version}
                      </span>
                      <StatusStamp
                        label={revision.status === "published" ? "Terbit" : revision.status === "scheduled" ? "Jadwal" : "Draf"}
                        tone={revision.status === "published" ? "done" : "wait"}
                      />
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">
                      {revision.note}
                    </span>
                    <span className="mt-0.5 block text-[8.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                      {revision.author} · {revision.time}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      toast("Revisi dibuka", {
                        description: `${revision.version} dimuat ke editor sebagai draf baru.`,
                      })
                    }
                    className="inline-flex min-h-11 items-center text-[9px] font-bold uppercase tracking-[0.05em] text-copper-dark hover:text-ink sm:min-h-8"
                  >
                    Buka
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel eyebrow="Validasi" title="Sebelum terbit">
            <ul className="space-y-2">
              {[
                ["Medan wajib", "Lengkap", true],
                ["URL dan tautan", "0 rusak", true],
                ["Alt gambar", "Semua terisi", true],
                ["Perubahan sensitif", "Harga dan sertifikat", false],
              ].map(([label, note, ok]) => (
                <li key={String(label)} className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] text-ink-soft">{label}</span>
                  <span className="flex items-center gap-1 text-[9.5px] font-semibold text-ink">
                    {ok ? (
                      <Check className="size-3 text-moss" aria-hidden="true" />
                    ) : (
                      <TriangleAlert className="size-3 text-[#8a5a16]" aria-hidden="true" />
                    )}
                    {note}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terbitkan konten v18</DialogTitle>
            <DialogDescription>
              Perubahan akan tampil di landing publik. Bagian yang berubah:{" "}
              {dirtySections.map((section) => section.label).join(", ") || "tidak ada"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="schedule">Jadwalkan (opsional)</Label>
              <Input
                id="schedule"
                type="datetime-local"
                value={schedule}
                onChange={(event) => setSchedule(event.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1 text-[10px] text-ink-muted">
                Kosongkan untuk terbit sekarang. Zona waktu Asia/Jakarta.
              </p>
            </div>
            <div className="border border-ink/20 bg-panel/30 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Ringkasan
              </p>
              <ul className="mt-2 space-y-1 text-[10.5px] text-ink-soft">
                <li>Hero dan metadata akan diterbitkan.</li>
                <li>Revisi v17 tetap tersedia untuk pembalikan.</li>
                <li>Perubahan harga memerlukan konfirmasi kedua.</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                setPublished(true)
                setPublishOpen(false)
                toast("Konten diterbitkan", {
                  description: schedule
                    ? `Dijadwalkan pada ${schedule}.`
                    : "Landing publik memakai versi v18.",
                })
              }}
            >
              <ChevronRight aria-hidden="true" />
              {schedule ? "Jadwalkan terbit" : "Terbitkan sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
