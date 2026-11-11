"use client"

import * as React from "react"
import { Download, Eye } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailDrawer,
  DetailGrid,
  DrawerSection,
} from "@/components/workspace/data/detail-drawer"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { api } from "@/convex/_generated/api"
import { downloadCsv } from "@/lib/admin/csv"
import type { LogKind, LogRow } from "@/lib/admin/types"
import type { StatusTone } from "@/lib/workspace/types"
import { useMutation, useQuery } from "convex/react"

const TABS: { id: LogKind; label: string }[] = [
  { id: "audit", label: "Audit" },
  { id: "auth", label: "Auth" },
  { id: "payments", label: "Pembayaran" },
  { id: "notifications", label: "Notifikasi" },
  { id: "calls", label: "Panggilan" },
  { id: "moderation", label: "Moderasi" },
  { id: "content", label: "Konten" },
  { id: "api", label: "API" },
  { id: "errors", label: "Galat" },
]

function severityTone(severity: LogRow["severity"]): StatusTone {
  if (severity === "critical" || severity === "error") return "danger"
  if (severity === "warning") return "wait"
  return "muted"
}

export function LogLive() {
  const [kind, setKind] = React.useState<LogKind>("audit")
  const [query, setQuery] = React.useState("")
  const [severity, setSeverity] = React.useState("")
  const [selected, setSelected] = React.useState<{ kind: LogKind; id: string } | null>(null)
  const result = useQuery(api.audit.list, {
    kind,
    q: query || undefined,
    severity:
      severity === "warning" || severity === "error" || severity === "critical"
        ? severity
        : undefined,
  })
  const exportLogs = useMutation(api.audit.exportLogs)

  async function exportCsv() {
    try {
      const exported = await exportLogs({
        kind,
        q: query || undefined,
        reason: "Ekspor dari penjelajah log",
      })
      downloadCsv("log-kalanidhi.csv", [
        ["waktu", "jenis", "aktor", "aksi", "entitas", "id", "severity", "request", "detail"],
        ...exported.rows.map((row) => [
          new Date(row.createdAt).toISOString(),
          row.kind,
          row.actor ?? "",
          row.action,
          row.entity,
          row.entityId ?? "",
          row.severity,
          row.requestId ?? "",
          row.detail,
        ]),
      ])
      toast("Ekspor log tercatat", {
        description: `${exported.rows.length} baris diunduh.`,
      })
    } catch (error) {
      toast("Ekspor gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Log"
        title="Satu meja untuk semua jejak."
        description="Audit, auth, pembayaran, notifikasi, panggilan, moderasi, dan konten dibaca dari catatan masing-masing. Sumber yang belum ada dinyatakan kosong, bukan diisi data karangan."
        meta={
          <span className="text-[10px] text-ink-muted">
            {result?.rows.length ?? 0} baris · {result?.note ?? "append-only"}
          </span>
        }
        actions={
          <Button variant="outline" onClick={() => void exportCsv()} disabled={!result?.available}>
            <Download aria-hidden="true" />
            Ekspor
          </Button>
        }
      />

      <SegmentedTabs
        tabs={TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        value={kind}
        onChange={(value) => setKind(value as LogKind)}
        ariaLabel="Pilih jenis log"
      />

      <div className="flex flex-wrap items-end gap-3 border border-ink/20 bg-paper-2 p-3">
        <div className="min-w-48 flex-1">
          <Label htmlFor="log-search">Cari</Label>
          <Input
            id="log-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Aktor, aksi, entitas, atau request ID"
            className="mt-1 h-8 text-[11px]"
          />
        </div>
        <div>
          <Label htmlFor="log-severity">Severity</Label>
          <select
            id="log-severity"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="mt-1 flex h-8 border border-ink/20 bg-paper-2 px-2 text-[11px]"
          >
            <option value="">Semua</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
            <option value="critical">critical</option>
          </select>
        </div>
      </div>

      <Panel eyebrow={TABS.find((tab) => tab.id === kind)?.label ?? "Log"} title="Catatan" bodyClassName="p-0">
        {result && !result.available ? (
          <EmptyState
            title="Sumber log belum tersedia"
            description={result.note ?? "Tidak ada tabel sumber pada fase ini."}
            className="border-0"
          />
        ) : (result?.rows.length ?? 0) === 0 ? (
          <EmptyState
            title="Belum ada catatan"
            description="Filter ini tidak menemukan baris. Tidak ada data yang ditambahkan untuk mengisi tampilan."
            className="border-0"
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <caption className="sr-only">Log {kind} dengan waktu, aktor, aksi, entitas, dan severity</caption>
              <thead>
                <tr className="border-b border-ink/25 bg-panel/55">
                  {["Waktu", "Aktor", "Aksi", "Entitas", "Severity", ""].map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-soft"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result?.rows.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="border-b border-ink/10 align-top hover:bg-panel/25">
                    <td className="px-3 py-2.5 text-[10.5px] tabular-nums text-ink-muted">
                      {new Intl.DateTimeFormat("id-ID", {
                        timeZone: "Asia/Jakarta",
                        dateStyle: "short",
                        timeStyle: "medium",
                      }).format(new Date(row.createdAt))}
                    </td>
                    <td className="px-3 py-2.5 text-[10.5px] text-ink-soft">
                      {row.actor ?? "Sistem"}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-semibold text-ink">
                      {row.action}
                    </td>
                    <td className="px-3 py-2.5 text-[10.5px] text-ink-soft">
                      {row.entity}
                      {row.entityId ? (
                        <span className="mt-0.5 block truncate text-[9px] text-ink-muted">
                          {row.entityId}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusStamp label={row.severity} tone={severityTone(row.severity)} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelected({ kind: row.kind, id: row.id })}
                      >
                        <Eye aria-hidden="true" />
                        Buka
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <LogDrawer selection={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function LogDrawer({
  selection,
  onClose,
}: {
  selection: { kind: LogKind; id: string } | null
  onClose: () => void
}) {
  const detail = useQuery(
    api.audit.get,
    selection === null ? "skip" : selection,
  )

  if (selection === null) return null

  return (
    <DetailDrawer
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow={`Log · ${selection.kind}`}
      title={detail?.action ?? "Memuat catatan"}
      stamp={detail?.severity}
      tone={detail ? severityTone(detail.severity) : "muted"}
      description={detail?.detail}
      width="sm:max-w-[640px]"
    >
      {detail ? (
        <div className="space-y-6">
          <DetailGrid
            items={[
              { label: "Waktu", value: new Intl.DateTimeFormat("id-ID", {
                timeZone: "Asia/Jakarta",
                dateStyle: "medium",
                timeStyle: "medium",
              }).format(new Date(detail.createdAt)) },
              { label: "Aktor", value: detail.actor ?? "Sistem" },
              { label: "Entitas", value: detail.entity },
              { label: "ID entitas", value: detail.entityId ?? "—" },
              { label: "Request ID", value: detail.requestId ?? "—" },
              { label: "Severity", value: detail.severity },
            ]}
          />
          <DrawerSection title="Detail">
            <p className="border-l-2 border-copper/50 pl-3 text-[11.5px] leading-relaxed text-ink-soft">
              {detail.detail || "Tidak ada detail tambahan."}
            </p>
          </DrawerSection>
          <DrawerSection title="Peristiwa terkait">
            {detail.correlation.events.length === 0 ? (
              <p className="text-[11.5px] text-ink-muted">
                Tidak ada peristiwa lain dengan request atau entitas yang sama.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {detail.correlation.events.map((event) => (
                  <li key={`${event.kind}-${event.id}`} className="border-l-2 border-copper/40 pl-2.5">
                    <p className="text-[10.5px] text-ink">
                      {event.action} · {event.entity}
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                      {event.kind} ·{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        timeZone: "Asia/Jakarta",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(event.createdAt))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DrawerSection>
        </div>
      ) : (
        <p className="text-[12px] text-ink-muted">Memuat catatan log.</p>
      )}
    </DetailDrawer>
  )
}
