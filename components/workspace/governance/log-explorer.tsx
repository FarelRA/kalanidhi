"use client"

import * as React from "react"
import { Download, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
import {
  DetailDrawer,
  DetailGrid,
  DrawerSection,
} from "@/components/workspace/data/detail-drawer"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { logs } from "@/lib/workspace/mock-data"
import type { LogEntry, StatusTone } from "@/lib/workspace/types"
import { formatWorkspaceDateTime } from "@/lib/workspace/format"

const types = [
  "Semua",
  "Audit",
  "Auth",
  "Pembayaran",
  "Notifikasi",
  "Panggilan",
  "Moderasi",
  "Konten",
  "API",
  "Galat",
] as const

const severityTone: Record<LogEntry["severity"], StatusTone> = {
  info: "done",
  warning: "wait",
  error: "danger",
  critical: "danger",
}

export function LogExplorer() {
  const [tab, setTab] = React.useState("Semua")
  const [selected, setSelected] = React.useState<LogEntry | null>(null)

  const rows = tab === "Semua" ? logs : logs.filter((item) => item.type === tab)
  const correlated = selected
    ? logs.filter(
        (item) =>
          item.id !== selected.id &&
          (item.requestId === selected.requestId || item.entity === selected.entity),
      )
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Log"
        title="Jejak yang tidak bisa dihapus."
        description="Audit, autentikasi, pembayaran, notifikasi, panggilan, moderasi, konten, API, dan galat dalam satu penjelajah. Filter berdasarkan aktor, entitas, tingkat, atau ID permintaan."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast("Ekspor dicatat", {
                  description: "CSV log disiapkan dengan periode dan filter aktif.",
                })
              }
            >
              <Download aria-hidden="true" />
              Ekspor hasil
            </Button>
            <Button asChild>
              <a href="#log-table">
                <Search aria-hidden="true" />
                Cari ID permintaan
              </a>
            </Button>
          </>
        }
        meta={
          <p className="flex items-center gap-1.5 text-[10px] text-ink-muted">
            <ShieldCheck className="size-3.5 text-moss" aria-hidden="true" />
            Retensi audit 2 tahun · tidak dapat dihapus · akses sensitif memerlukan alasan
          </p>
        }
      />

      <SegmentedTabs
        tabs={types.map((type) => ({
          id: type,
          label: type,
          count: type === "Semua" ? logs.length : logs.filter((item) => item.type === type).length,
        }))}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih jenis log"
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-9"
          eyebrow="Penjelajah"
          title={`${tab} · ${rows.length} catatan`}
          bodyClassName="p-0"
          id="log-table"
        >
          <DataTable
            rows={rows}
            columns={logColumns(setSelected)}
            caption="Log dengan waktu, aksi, aktor, entitas, tingkat, dan ID permintaan"
            searchPlaceholder="Cari aktor, aksi, entitas, atau request ID"
            getSearchText={(row) =>
              `${row.actor} ${row.action} ${row.entity} ${row.requestId} ${row.detail}`
            }
            filters={[
              {
                id: "severity",
                label: "Tingkat",
                options: [
                  { value: "all", label: "Semua" },
                  { value: "info", label: "Info" },
                  { value: "warning", label: "Peringatan" },
                  { value: "error", label: "Galat" },
                ],
              },
            ]}
            filterRow={(row, values) =>
              !values.severity || values.severity === "all" || row.severity === values.severity
            }
            minWidth={900}
            footer={
              <p>
                Setiap baris membawa request ID. Korelasi lintas jenis memakai ID
                yang sama.
              </p>
            }
          />
        </Panel>

        <div className="space-y-4 xl:col-span-3">
          <Panel eyebrow="Kesehatan" title="Peringatan aktif">
            <ul className="space-y-2.5">
              {[
                ["Gateway timeout", "GoPay · 1 percobaan", "warning"],
                ["Webhook retry", "Email · 2 percobaan", "warning"],
                ["Galat aplikasi", "0 dalam 24 jam", "done"],
                ["Auth gagal", "3 percobaan · terkunci", "danger"],
              ].map(([label, note, tone]) => (
                <li key={label} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10.5px] font-semibold text-ink">{label}</p>
                    <p className="mt-0.5 text-[9px] text-ink-muted">{note}</p>
                  </div>
                  <StatusStamp
                    label={tone === "done" ? "Aman" : tone === "danger" ? "Tinjau" : "Pantau"}
                    tone={tone as StatusTone}
                  />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel eyebrow="Korelasi" title="Petunjuk">
            <p className="text-[10.5px] leading-relaxed text-ink-soft">
              Klik satu baris untuk melihat detail dan peristiwa terkait. ID permintaan
              yang sama menghubungkan API, pembayaran, dan notifikasi.
            </p>
            <p className="mt-3 border-t border-ink/15 pt-2.5 text-[9.5px] leading-relaxed text-ink-muted">
              Log tidak dapat dihapus, termasuk oleh pengelola. Retensi per jenis
              diatur di pengaturan.
            </p>
          </Panel>
        </div>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow={`${selected?.type ?? ""} · log`}
        title={selected?.action ?? ""}
        stamp={selected?.severity}
        tone={selected ? severityTone[selected.severity] : "muted"}
        description={selected?.id}
        footer={
          selected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(selected.requestId)
                toast("Request ID disalin", { description: selected.requestId })
              }}
            >
              Salin request ID
            </Button>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <DetailGrid
              items={[
                { label: "Waktu", value: formatWorkspaceDateTime(selected.ts) },
                { label: "Aktor", value: selected.actor },
                { label: "Aksi", value: selected.action },
                { label: "Entitas", value: selected.entity },
                { label: "Tingkat", value: selected.severity },
                { label: "Request ID", value: selected.requestId },
              ]}
            />
            <DrawerSection title="Detail">
              <p className="border-l-2 border-brass pl-3 text-[11.5px] leading-relaxed text-ink-soft">
                {selected.detail}
              </p>
            </DrawerSection>
            <DrawerSection
              title="Peristiwa terkait"
              aside={<span className="text-[9px] text-ink-muted">{correlated.length}</span>}
            >
              {correlated.length ? (
                <ol className="space-y-2.5">
                  {correlated.map((item) => (
                    <li key={item.id} className="flex gap-2.5">
                      <span className="mt-1 size-1.5 shrink-0 bg-copper-dark" aria-hidden="true" />
                      <div>
                        <p className="text-[10.5px] font-medium text-ink">{item.action}</p>
                        <p className="mt-0.5 text-[9px] text-ink-muted">
                          {item.entity} · {formatWorkspaceDateTime(item.ts)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[10.5px] text-ink-muted">
                  Tidak ada peristiwa terkait pada jendela waktu ini.
                </p>
              )}
            </DrawerSection>
            <DrawerSection title="Sebelum / sesudah">
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-ink/15 bg-panel/30 p-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                    Sebelum
                  </p>
                  <pre className="mt-1 overflow-x-auto text-[9px] leading-relaxed text-ink-soft">
{`{ status: "pending" }`}
                  </pre>
                </div>
                <div className="border border-ink/15 bg-paper p-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                    Sesudah
                  </p>
                  <pre className="mt-1 overflow-x-auto text-[9px] leading-relaxed text-ink">
{`{ status: "paid" }`}
                  </pre>
                </div>
              </div>
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>
    </div>
  )
}

function logColumns(onSelect: (row: LogEntry) => void): Column<LogEntry>[] {
  return [
    {
      id: "time",
      header: "Waktu",
      cell: (row) => (
        <span className="whitespace-nowrap text-[10px] text-ink-muted">
          {formatWorkspaceDateTime(row.ts)}
        </span>
      ),
    },
    {
      id: "action",
      header: "Aksi",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.action}</p>
          <p className="mt-0.5 max-w-56 truncate text-[10px] text-ink-muted">
            {row.entity}
          </p>
        </div>
      ),
    },
    {
      id: "actor",
      header: "Aktor",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">{row.actor}</span>
      ),
    },
    {
      id: "type",
      header: "Jenis",
      cell: (row) => (
        <span className="text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
          {row.type}
        </span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "severity",
      header: "Tingkat",
      cell: (row) => (
        <StatusStamp
          label={row.severity}
          tone={severityTone[row.severity]}
        />
      ),
    },
    {
      id: "request",
      header: "Request",
      cell: (row) => (
        <code className="text-[9px] text-ink-muted">{row.requestId}</code>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "open",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
          Buka
        </Button>
      ),
    },
  ]
}
