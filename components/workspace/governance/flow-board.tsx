"use client"

import * as React from "react"
import { ArrowRight, BellRing, Save, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { flows } from "@/lib/workspace/mock-data"
import type { Flow } from "@/lib/workspace/types"
import { cn } from "cn"

type StuckRow = Flow["stuckItems"][number] & { flow: string }

export function FlowBoard() {
  const [activeId, setActiveId] = React.useState(flows[0]?.id ?? "")
  const active = flows.find((flow) => flow.id === activeId) ?? flows[0]
  const stuckRows: StuckRow[] = flows.flatMap((flow) =>
    flow.stuckItems.map((item) => ({ ...item, flow: flow.name })),
  )

  const stuckColumns: Column<StuckRow>[] = [
    {
      id: "record",
      header: "Catatan",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.record}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.flow}</p>
        </div>
      ),
    },
    {
      id: "age",
      header: "Umur",
      cell: (row) => <span className="text-[11px] tabular-nums text-[#9a3423]">{row.age}</span>,
    },
    {
      id: "owner",
      header: "Pemilik",
      cell: (row) => <span className="text-[10.5px] text-ink-soft">{row.owner}</span>,
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "next",
      header: "Langkah berikut",
      cell: (row) => <span className="text-[10.5px] text-ink-soft">{row.next}</span>,
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            toast("Pengingat dikirim", {
              description: `${row.record} · pemilik ${row.owner} menerima pengingat.`,
            })
          }
        >
          <BellRing aria-hidden="true" />
          Ingatkan
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alur"
        title="Mesin keadaan yang menjaga janji."
        description="Setiap alur punya keadaan sah, penjaga transisi, SLA, dan aturan pengingat. Catatan macet diurutkan dari yang paling tua."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast("Konfigurasi diekspor", {
                  description: "Definisi 6 alur dan SLA diekspor sebagai JSON.",
                })
              }
            >
              Ekspor definisi
            </Button>
            <Button
              onClick={() =>
                toast("Aturan baru", {
                  description: "Editor aturan dibuka dengan definisi alur aktif.",
                })
              }
            >
              Tambah aturan
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-4">
          {flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              onClick={() => setActiveId(flow.id)}
              aria-pressed={activeId === flow.id}
              className={cn(
                "w-full border p-3.5 text-left transition-colors",
                activeId === flow.id
                  ? "border-ink/50 bg-paper-2 shadow-[3px_3px_0_rgba(32,19,13,0.08)]"
                  : "border-ink/20 bg-paper-2/60 hover:border-ink/35",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                    {flow.states.length} keadaan · SLA {flow.sla}
                  </p>
                  <h2 className="mt-1 font-heading text-[1.1rem] leading-tight text-ink">
                    {flow.name}
                  </h2>
                </div>
                <StatusStamp
                  label={`${flow.stuck} macet`}
                  tone={flow.stuck > 1 ? "danger" : "wait"}
                />
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-ink-muted">
                {flow.description}
              </p>
              <p className="mt-2 text-[8.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                Pemilik {flow.owner}
              </p>
            </button>
          ))}
        </div>

        <div className="space-y-4 xl:col-span-8">
          <Panel
            eyebrow="Mesin keadaan"
            title={active?.name ?? ""}
            bodyClassName="p-4"
            action={<StatusStamp label={`${active?.sla ?? ""} SLA`} tone="progress" />}
          >
            <div className="overflow-x-auto pb-1">
              <ol className="flex min-w-[600px] items-stretch">
                {active?.states.map((state, index) => (
                  <li key={state.id} className="flex flex-1 items-center">
                    <div
                      className={cn(
                        "w-full border px-2 py-2.5 text-center",
                        state.id === active.current
                          ? "border-copper-dark bg-copper/10"
                          : "border-ink/20 bg-paper",
                      )}
                    >
                      <p className="text-[8px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-0.5 text-[10.5px] font-semibold leading-tight text-ink">
                        {state.label}
                      </p>
                      <p className="mt-0.5 text-[8.5px] leading-tight text-ink-muted">
                        {state.note}
                      </p>
                    </div>
                    {index < (active?.states.length ?? 0) - 1 ? (
                      <ArrowRight className="mx-1 size-3 shrink-0 text-ink-muted" aria-hidden="true" />
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-3 border-t border-ink/15 pt-2.5 text-[10px] leading-relaxed text-ink-muted">
              Keadaan aktif saat ini: <strong className="text-ink">{active?.current}</strong>.
              Transisi hanya sah bila penjaga terpenuhi; setiap perubahan mencatat aktor,
              waktu, dan alasan.
            </p>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel eyebrow="Transisi" title="Sah dan penjaga">
              <ul className="divide-y divide-ink/10">
                {active?.transitions.map((transition) => (
                  <li key={`${transition.from}-${transition.to}`} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold">
                      <span className="border border-ink/20 bg-panel/35 px-1.5 py-0.5">
                        {transition.from}
                      </span>
                      <ArrowRight className="size-3 text-ink-muted" aria-hidden="true" />
                      <span className="border border-copper-dark/30 bg-copper/10 px-1.5 py-0.5 text-copper-dark">
                        {transition.to}
                      </span>
                    </p>
                    <p className="mt-1 text-[9.5px] leading-relaxed text-ink-muted">
                      {transition.guard}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel eyebrow="SLA dan pengingat" title="Ambang">
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="flow-sla">SLA utama</Label>
                  <Input
                    id="flow-sla"
                    defaultValue={active?.sla}
                    className="mt-1.5 h-11 text-[12px]"
                  />
                </div>
                <div>
                  <Label htmlFor="flow-reminder">Pengingat pertama</Label>
                  <Input id="flow-reminder" defaultValue="24 jam sebelum lewat" className="mt-1.5 h-11 text-[12px]" />
                </div>
                <div>
                  <Label htmlFor="flow-escalation">Eskalasi</Label>
                  <Input id="flow-escalation" defaultValue="Lewat SLA + 24 jam" className="mt-1.5 h-11 text-[12px]" />
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    toast("SLA disimpan", {
                      description: "Perubahan berlaku untuk catatan baru dan tercatat di audit.",
                    })
                  }
                >
                  <Save aria-hidden="true" />
                  Simpan ambang
                </Button>
              </div>
            </Panel>
          </div>

          <Panel eyebrow="Pemantauan" title="Catatan macet" bodyClassName="p-0">
            <DataTable
              rows={stuckRows}
              columns={stuckColumns}
              caption="Catatan macet lintas alur dengan umur, pemilik, dan langkah berikut"
              searchPlaceholder="Cari catatan, alur, atau pemilik"
              getSearchText={(row) => `${row.record} ${row.flow} ${row.owner}`}
              minWidth={720}
              emptyTitle="Tidak ada catatan macet"
            />
          </Panel>
        </div>
      </div>

      <Panel eyebrow="Catatan" title="Yang tidak boleh dilakukan">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Tidak ada skrip bebas", "Konfigurasi transisi dan penjaga, bukan editor kode."],
            ["Tidak ada penilaian diam-diam", "Pengelola tidak dapat mengubah skor tanpa alasan."],
            ["Override selalu tercatat", "Aktor, waktu, keadaan sebelum, dan sesudah disimpan."],
          ].map(([title, note]) => (
            <div key={title} className="flex gap-2.5 border border-ink/15 bg-paper/40 p-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-copper-dark" aria-hidden="true" />
              <div>
                <p className="text-[10.5px] font-semibold text-ink">{title}</p>
                <p className="mt-1 text-[9.5px] leading-relaxed text-ink-muted">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
