"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarDays, Clock3 } from "lucide-react"
import { useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"
import type { SessionOverview } from "@/lib/workspace/phase2-types"
import type { StatusTone } from "@/lib/workspace/types"
import {
  formatWorkspaceDate,
  formatWorkspaceTime,
} from "@/lib/workspace/format"

function iso(ms: number) {
  return new Date(ms).toISOString()
}

function kindLabel(kind: SessionOverview["kind"]) {
  if (kind === "session") return "Kelas kohort"
  if (kind === "office_hours") return "Jam kantor"
  if (kind === "call") return "Panggilan"
  return "Penilaian"
}

function toneFor(status: SessionOverview["status"]): StatusTone {
  if (status === "live") return "progress"
  if (status === "ended") return "done"
  if (status === "cancelled") return "danger"
  return "open"
}

function statusLabel(status: SessionOverview["status"]) {
  if (status === "live") return "Berlangsung"
  if (status === "ended") return "Selesai"
  if (status === "cancelled") return "Dibatalkan"
  return "Terjadwal"
}

export function LiveScheduleBoard() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState("all")
  const sessions = useQuery(api.learning.listSessions, {}) ?? []

  const filtered =
    tab === "all"
      ? sessions
      : sessions.filter((session) => session.kind === tab)

  const columns: Column<SessionOverview>[] = [
    {
      id: "session",
      header: "Sesi",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.title}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            {kindLabel(row.kind)} · {row.cohortCode}
          </p>
        </div>
      ),
    },
    {
      id: "when",
      header: "Waktu",
      cell: (row) => (
        <div className="text-[11px] leading-snug">
          <p>{formatWorkspaceDate(iso(row.startsAt))}</p>
          <p className="mt-0.5 text-ink-muted">
            {formatWorkspaceTime(iso(row.startsAt))}–
            {formatWorkspaceTime(iso(row.endsAt))}
          </p>
        </div>
      ),
    },
    {
      id: "teacher",
      header: "Pengajar",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">{row.teacherName}</span>
      ),
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "attendees",
      header: "Peserta",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{row.attendees}</span>
      ),
      align: "center",
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "timezone",
      header: "Zona waktu",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-muted">{row.timezone}</span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={row.past && row.status === "scheduled" ? "Lewat" : statusLabel(row.status)}
          tone={row.past && row.status === "scheduled" ? "wait" : toneFor(row.status)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jadwal"
        title={can("schedule.manage") ? "Ketersediaan dan sesi." : "Jadwal yang menunggumu."}
        description={
          can("schedule.manage")
            ? "Sesi kohort yang kamu ampu, dibaca langsung dari Convex. Zona waktu Asia/Jakarta."
            : "Sesi kohort dan panggilan yang sudah dijadwalkan. Tambahkan ke kalender perangkat."
        }
        meta={
          <p className="flex items-center gap-1.5 text-[10px] text-ink-muted">
            <Clock3 className="size-3.5" aria-hidden="true" />
            Asia/Jakarta (WIB)
          </p>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/ruang/panggilan">
                <CalendarDays aria-hidden="true" />
                Ruang panggilan
              </Link>
            </Button>
          </>
        }
      />

      <SegmentedTabs
        tabs={[
          { id: "all", label: "Semua", count: sessions.length },
          {
            id: "session",
            label: "Kelas kohort",
            count: sessions.filter((item) => item.kind === "session").length,
          },
          {
            id: "office_hours",
            label: "Jam kantor",
            count: sessions.filter((item) => item.kind === "office_hours").length,
          },
          {
            id: "call",
            label: "Panggilan",
            count: sessions.filter((item) => item.kind === "call").length,
          },
          {
            id: "assessment",
            label: "Penilaian",
            count: sessions.filter((item) => item.kind === "assessment").length,
          },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih jenis jadwal"
      />

      <Panel eyebrow="Agenda" title="Sesi terjadwal" bodyClassName="p-0">
        {sessions.length === 0 ? (
          <EmptyState
            title="Belum ada sesi"
            description="Sesi kohort akan muncul setelah pengajar atau pengelola menjadwalkannya."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/ruang/belajar">Buka kohort</Link>
              </Button>
            }
            className="border-0"
          />
        ) : (
          <DataTable
            rows={filtered}
            columns={columns}
            caption="Sesi kohort dengan waktu, pengajar, peserta, dan status"
            searchPlaceholder="Cari sesi, kohort, atau pengajar"
            getSearchText={(row) =>
              `${row.title} ${row.cohortCode} ${row.teacherName} ${kindLabel(row.kind)}`
            }
            emptyTitle="Tidak ada sesi untuk jenis ini"
            minWidth={760}
          />
        )}
      </Panel>
    </div>
  )
}
