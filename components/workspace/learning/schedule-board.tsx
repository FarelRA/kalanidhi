"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarDays, Clock3, MapPin, Plus, Video } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { scheduleSessions } from "@/lib/workspace/mock-data"
import { formatWorkspaceDate } from "@/lib/workspace/format"
import { cn } from "cn"

import { LiveScheduleBoard } from "./live-schedule-board"

const dayOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const

export function ScheduleBoard() {
  const { isPreview } = useViewer()
  return isPreview ? <PreviewScheduleBoard /> : <LiveScheduleBoard />
}

function PreviewScheduleBoard() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState("all")
  const [availability, setAvailability] = React.useState<Record<string, boolean>>({
    Senin: true,
    Selasa: false,
    Rabu: true,
    Kamis: true,
    Jumat: true,
    Sabtu: false,
    Minggu: false,
  })

  const rows = scheduleSessions.filter((item) => {
    if (tab === "all") return true
    if (tab === "cohort") return item.kind === "Kelas kohort"
    if (tab === "office") return item.kind === "Office hour"
    if (tab === "call") return item.kind === "Panggilan"
    return item.kind === "Penilaian"
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jadwal"
        title={can("schedule.manage") ? "Ketersediaan dan sesi." : "Jadwal yang menunggumu."}
        description={
          can("schedule.manage")
            ? "Jam kantor, sesi kohort, dan panggilan.Buffer antar panggilan 15 menit. Zona waktu Asia/Jakarta."
            : "Sesi kohort, jam kantor pengajar, dan panggilan yang sudah disepakati. Tambahkan ke kalender perangkat."
        }
        meta={
          <p className="flex items-center gap-1.5 text-[10px] text-ink-muted">
            <Clock3 className="size-3.5" aria-hidden="true" />
            Asia/Jakarta (WIB) · pekan 11–17 November 2026
          </p>
        }
        actions={
          <>
            {can("schedule.manage") ? (
              <Button
                onClick={() =>
                  toast("Slot baru", {
                    description: "Slot baru langsung tampil pada jadwal peserta.",
                  })
                }
              >
                <Plus aria-hidden="true" />
                Tambah slot
              </Button>
            ) : (
              <Button
                onClick={() =>
                  toast("Kalender disiapkan", {
                    description: "Tautan .ics dibuat untuk sesi yang dipilih.",
                  })
                }
              >
                <CalendarDays aria-hidden="true" />
                Tambah ke kalender
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/ruang/panggilan">
                <Video aria-hidden="true" />
                Ruang panggilan
              </Link>
            </Button>
          </>
        }
      />

      <SegmentedTabs
        tabs={[
          { id: "all", label: "Semua", count: scheduleSessions.length },
          { id: "cohort", label: "Kelas kohort" },
          { id: "office", label: "Jam kantor" },
          { id: "call", label: "Panggilan" },
          { id: "assessment", label: "Penilaian" },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih jenis jadwal"
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-8" eyebrow="Pekan ini" title="Agenda" bodyClassName="p-4">
          <div className="space-y-5">
            {dayOrder.map((day) => {
              const daySessions = rows.filter((item) => item.day === day)
              if (daySessions.length === 0) return null
              return (
                <section key={day} aria-labelledby={`day-${day}`}>
                  <h2
                    id={`day-${day}`}
                    className="flex items-center gap-2 border-b border-ink/20 pb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-copper-dark"
                  >
                    {day}
                    <span className="text-ink-muted">
                      {daySessions.length} sesi
                    </span>
                  </h2>
                  <ul className="divide-y divide-ink/10">
                    {daySessions.map((session) => (
                      <li key={session.id} className="flex items-start gap-3 py-3">
                        <div className="w-14 shrink-0 border border-ink/20 bg-panel/35 px-1 py-1.5 text-center">
                          <p className="font-heading text-[13px] leading-tight text-ink">
                            {session.time}
                          </p>
                          <p className="mt-0.5 text-[7.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                            {formatWorkspaceDate(session.date)}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-[12px] font-semibold leading-snug text-ink">
                              {session.title}
                            </p>
                            {session.status === "rescheduled" ? (
                              <StatusStamp label="Dipindah" tone="wait" />
                            ) : null}
                          </div>
                          <p className="mt-1 text-[10.5px] text-ink-muted">
                            {session.kind} · {session.cohort} · {session.duration}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-[9.5px] text-ink-muted">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" aria-hidden="true" />
                              {session.mode}
                            </span>
                            <span>{session.teacher}</span>
                            <span>{session.attendees} peserta</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            toast("Tautan sesi disalin", {
                              description: `${session.title} · ${session.time}`,
                            })
                          }
                        >
                          {session.kind === "Panggilan" ? "Buka" : "Detail"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
            {rows.length === 0 ? (
              <p className="border border-dashed border-ink/20 px-4 py-10 text-center text-[12px] text-ink-muted">
                Tidak ada sesi untuk jenis ini pada pekan tersebut.
              </p>
            ) : null}
          </div>
        </Panel>

        <div className="space-y-4 xl:col-span-4">
          {can("schedule.manage") ? (
            <Panel eyebrow="Ketersediaan" title="Jam kantor">
              <p className="text-[10.5px] leading-relaxed text-ink-muted">
                Pilih hari yang terbuka untuk panggilan peserta. Setiap slot
                berdurasi 30 menit, dengan jeda 15 menit.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Hari ketersediaan">
                {dayOrder.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={availability[day]}
                    onClick={() =>
                      setAvailability((current) => ({
                        ...current,
                        [day]: !current[day],
                      }))
                    }
                    className={cn(
                      "min-h-9 border px-2 text-[9.5px] font-bold uppercase tracking-[0.05em] transition-colors max-lg:min-h-11",
                      availability[day]
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/20 text-ink-muted hover:border-ink/40",
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="start-time">Mulai</Label>
                  <Input id="start-time" defaultValue="16.00" className="mt-1.5 h-11 text-[12px]" />
                </div>
                <div>
                  <Label htmlFor="end-time">Selesai</Label>
                  <Input id="end-time" defaultValue="18.00" className="mt-1.5 h-11 text-[12px]" />
                </div>
              </div>
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() =>
                  toast("Ketersediaan disimpan", {
                    description: "Peserta melihat slot baru pada halaman jadwal.",
                  })
                }
              >
                Simpan ketersediaan
              </Button>
            </Panel>
          ) : (
            <Panel eyebrow="Jam kantor" title="Kapan bisa menelepon">
              <ul className="space-y-2.5">
                {[
                  ["Selasa", "16.00–17.00", false],
                  ["Kamis", "16.00–18.00", true],
                  ["Jumat", "16.00–17.00", false],
                ].map(([day, time, busy]) => (
                  <li key={String(day)} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink">
                      {day} · {time}
                    </span>
                    <StatusStamp
                      label={busy ? "Penuh" : "Tersedia"}
                      tone={busy ? "danger" : "done"}
                    />
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-ink/15 pt-2.5 text-[9.5px] leading-relaxed text-ink-muted">
                Panggilan di luar jam kantor memerlukan undangan pengajar.
              </p>
            </Panel>
          )}

          <Panel eyebrow="Pengingat" title="Sebelum sesi">
            <ul className="space-y-2.5">
              {[
                ["10 menit", "Pengingat WhatsApp dan dalam aplikasi"],
                ["5 menit", "Uji mikrofon dan kamera"],
                ["1 menit", "Tautan ruang panggilan aktif"],
              ].map(([time, note]) => (
                <li key={time} className="flex gap-2.5">
                  <span className="w-14 shrink-0 border border-ink/15 bg-panel/30 px-1 py-1 text-center text-[8px] font-bold uppercase tracking-[0.04em]">
                    {time}
                  </span>
                  <span className="text-[10.5px] leading-relaxed text-ink-soft">{note}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
