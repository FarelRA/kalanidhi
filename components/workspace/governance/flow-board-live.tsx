"use client"

import * as React from "react"
import { ArrowRight, Download, Save, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
import { DetailDrawer, DetailGrid, DrawerSection } from "@/components/workspace/data/detail-drawer"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { api } from "@/convex/_generated/api"
import {
  WORKSPACE_ROLES,
  WORKSPACE_ROLE_LABELS,
} from "@/lib/access/capabilities"
import type { FlowDefinitionView, StuckRecordView } from "@/lib/flows/types"
import type { StatusTone } from "@/lib/workspace/types"
import { cn } from "cn"

type StuckRow = StuckRecordView & { id: string }

function toneForTone(tone: FlowDefinitionView["states"][number]["tone"]): StatusTone {
  return tone
}

function roleLabel(role: string): string {
  return WORKSPACE_ROLES.includes(role as (typeof WORKSPACE_ROLES)[number])
    ? WORKSPACE_ROLE_LABELS[role as (typeof WORKSPACE_ROLES)[number]]
    : role
}

export function FlowBoardLive() {
  const definitions = useQuery(api.flows.listDefinitions)
  const stuck = useQuery(api.flows.stuckRecords, {})
  const [activeKey, setActiveKey] = React.useState<string>("")
  const [selected, setSelected] = React.useState<StuckRecordView | null>(null)
  const [slaDraft, setSlaDraft] = React.useState<{
    flowKey: string
    target: string
    escalation: string
  } | null>(null)
  const [reason, setReason] = React.useState("")
  const [toState, setToState] = React.useState("")
  const saveSla = useMutation(api.flows.saveSlaPolicy)
  const override = useMutation(api.flows.manualOverride)

  const active = definitions?.find((item) => item.key === activeKey) ?? definitions?.[0]
  const slaTarget =
    slaDraft && slaDraft.flowKey === active?.key
      ? slaDraft.target
      : String(active?.sla.targetMinutes ?? "")
  const slaEscalation =
    slaDraft && slaDraft.flowKey === active?.key
      ? slaDraft.escalation
      : active?.sla.escalationMinutes
        ? String(active.sla.escalationMinutes)
        : ""

  if (definitions === undefined) {
    return <EmptyState title="Memuat definisi alur" description="Membaca state machine dari Convex." />
  }

  if (definitions.length === 0) {
    return (
      <EmptyState
        title="Belum ada definisi alur"
        description="Definisi bawaan tersedia di modul alur; muat ulang atau periksa konfigurasi deployment."
      />
    )
  }

  async function saveThreshold() {
    if (!active) return
    try {
      await saveSla({
        flowKey: active.key,
        key: active.sla.key,
        name: active.sla.name,
        targetMinutes: Number(slaTarget),
        escalationMinutes: slaEscalation ? Number(slaEscalation) : undefined,
        owner: active.sla.owner,
      })
      toast("Ambang SLA disimpan", {
        description: "Berlaku untuk antrean dan statistik berikutnya; perubahan masuk audit.",
      })
    } catch (error) {
      toast("SLA gagal disimpan", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  async function runOverride() {
    if (!selected) return
    if (reason.trim().length < 8) {
      toast("Alasan terlalu pendek", { description: "Minimal 8 karakter." })
      return
    }
    try {
      await override({
        flowKey: selected.flowKey,
        recordId: selected.recordId,
        toState,
        reason: reason.trim(),
      })
      toast("Override dicatat", {
        description: `${selected.label} → ${toState}. Aktor, alasan, dan keadaan sebelum tersimpan.`,
      })
      setSelected(null)
      setReason("")
      setToState("")
    } catch (error) {
      toast("Override gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  function exportDefinitions() {
    const list = definitions ?? []
    const blob = new Blob([JSON.stringify(list, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "kalanidhi-alur.json"
    anchor.click()
    URL.revokeObjectURL(url)
    toast("Definisi diekspor", {
      description: `${list.length} alur diekspor sebagai JSON.`,
    })
  }

  const stuckRows: StuckRow[] = (stuck ?? []).map((row) => ({
    ...row,
    id: `${row.flowKey}:${row.recordId}`,
  }))

  const stuckColumns: Column<StuckRow>[] = [
    {
      id: "record",
      header: "Catatan",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.label}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            {row.flowName} · {row.stateLabel}
          </p>
        </div>
      ),
    },
    {
      id: "age",
      header: "Umur",
      cell: (row) => (
        <span
          className={cn(
            "text-[11px] tabular-nums",
            row.overdue ? "text-[#9a3423]" : "text-ink-soft",
          )}
        >
          {Math.floor(row.ageMinutes / 60)} jam
        </span>
      ),
    },
    {
      id: "owner",
      header: "Pemilik",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">
          {row.ownerName ?? "Belum ada"}
        </span>
      ),
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "next",
      header: "Langkah berikut",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">{row.nextAction}</span>
      ),
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
          onClick={() => {
            setSelected(row)
            setToState("")
            setReason("")
          }}
        >
          Override
          <ArrowRight aria-hidden="true" />
        </Button>
      ),
    },
  ]

  const overrideTransitions = active
    ? active.transitions.filter((item) => item.from === selected?.state)
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alur"
        title="Mesin keadaan yang menjaga janji."
        description="Definisi alur, penjaga transisi, SLA, otomasi, dan catatan macet dari tabel nyata. Override memerlukan alasan dan selalu masuk audit."
        actions={
          <Button variant="outline" onClick={exportDefinitions}>
            <Download aria-hidden="true" />
            Ekspor definisi
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-4">
          {definitions.map((flow) => (
            <button
              key={flow.key}
              type="button"
              onClick={() => setActiveKey(flow.key)}
              aria-pressed={active?.key === flow.key}
              className={cn(
                "w-full border p-3.5 text-left transition-colors",
                active?.key === flow.key
                  ? "border-ink/50 bg-paper-2 shadow-[3px_3px_0_rgba(32,19,13,0.08)]"
                  : "border-ink/20 bg-paper-2/60 hover:border-ink/35",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                    {flow.states.length} keadaan · SLA {Math.round(flow.sla.targetMinutes / 60)} jam
                  </p>
                  <h2 className="mt-1 font-heading text-[1.1rem] leading-tight text-ink">
                    {flow.name}
                  </h2>
                </div>
                <StatusStamp
                  label={`${stuckRows.filter((row) => row.flowKey === flow.key).length} macet`}
                  tone={
                    stuckRows.some((row) => row.flowKey === flow.key && row.overdue)
                      ? "danger"
                      : "wait"
                  }
                />
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-ink-muted">
                {flow.description}
              </p>
              <p className="mt-2 text-[8.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                Pemilik {flow.owner} · {flow.source === "configured" ? "konfigurasi" : "bawaan"}
              </p>
            </button>
          ))}
        </div>

        <div className="space-y-4 xl:col-span-8">
          <Panel
            eyebrow="Mesin keadaan"
            title={active?.name ?? ""}
            bodyClassName="p-4"
            action={<StatusStamp label={`${active?.transitions.length ?? 0} transisi`} tone="progress" />}
          >
            <div className="overflow-x-auto pb-1">
              <ol className="flex min-w-[600px] items-stretch">
                {active?.states.map((state, index) => (
                  <li key={state.key} className="flex flex-1 items-center">
                    <div className="w-full border border-ink/20 bg-paper px-2 py-2.5 text-center">
                      <p className="text-[8px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-0.5 text-[10.5px] font-semibold leading-tight text-ink">
                        {state.label}
                      </p>
                      <StatusStamp
                        className="mt-1"
                        label={state.terminal ? "Terminal" : "Aktif"}
                        tone={toneForTone(state.tone)}
                      />
                    </div>
                    {index < (active?.states.length ?? 0) - 1 ? (
                      <ArrowRight className="mx-1 size-3 shrink-0 text-ink-muted" aria-hidden="true" />
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-3 border-t border-ink/15 pt-2.5 text-[10px] leading-relaxed text-ink-muted">
              Versi {active?.version || 0} · {active?.source === "configured" ? "dikonfigurasi pengelola" : "definisi bawaan"}. Transisi hanya sah bila penjaga terpenuhi.
            </p>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel eyebrow="Transisi" title="Sah dan penjaga">
              <ul className="max-h-72 divide-y divide-ink/10 overflow-y-auto">
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
                      {transition.requiresRole
                        ? ` · peran ${roleLabel(transition.requiresRole)}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel eyebrow="SLA dan otomasi" title="Ambang">
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="flow-sla">SLA utama (menit)</Label>
                  <Input
                    id="flow-sla"
                    type="number"
                    min={1}
                    value={slaTarget}
                    onChange={(event) =>
                      setSlaDraft({
                        flowKey: active?.key ?? "",
                        target: event.target.value,
                        escalation: slaEscalation,
                      })
                    }
                    className="mt-1.5 h-11 text-[12px]"
                  />
                </div>
                <div>
                  <Label htmlFor="flow-escalation">Eskalasi (menit)</Label>
                  <Input
                    id="flow-escalation"
                    type="number"
                    min={1}
                    value={slaEscalation}
                    onChange={(event) =>
                      setSlaDraft({
                        flowKey: active?.key ?? "",
                        target: slaTarget,
                        escalation: event.target.value,
                      })
                    }
                    className="mt-1.5 h-11 text-[12px]"
                  />
                </div>
                <Button size="sm" onClick={() => void saveThreshold()}>
                  <Save aria-hidden="true" />
                  Simpan ambang
                </Button>
                <ul className="space-y-1.5 border-t border-ink/15 pt-2.5">
                  {active?.automations.map((rule) => (
                    <li key={rule.key} className="text-[9.5px] leading-relaxed text-ink-muted">
                      <strong className="text-ink">{rule.kind}</strong> · {rule.trigger} → {rule.action}
                      {rule.enabled ? "" : " (mati)"}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>

          <Panel eyebrow="Pemantauan" title="Catatan macet" bodyClassName="p-0">
            <DataTable
              rows={stuckRows}
              columns={stuckColumns}
              caption="Catatan macet lintas alur dengan umur, pemilik, dan langkah berikut"
              searchPlaceholder="Cari catatan, alur, atau pemilik"
              getSearchText={(row) => `${row.label} ${row.flowName} ${row.ownerName ?? ""}`}
              minWidth={720}
              emptyTitle="Tidak ada catatan macet"
              emptyDescription="Antrean bersih pada definisi dan SLA saat ini."
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

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        eyebrow={selected ? `${selected.flowName} · ${selected.stateLabel}` : "Override"}
        title={selected?.label ?? ""}
        stamp={selected?.overdue ? "Lewat SLA" : "Dalam SLA"}
        tone={selected?.overdue ? "danger" : "wait"}
        description={selected ? `${Math.floor(selected.ageMinutes / 60)} jam · pemilik ${selected.ownerName ?? "belum ada"}` : undefined}
      >
        {selected ? (
          <div className="space-y-5">
            <DetailGrid
              items={[
                { label: "Alur", value: selected.flowName },
                { label: "Keadaan", value: selected.stateLabel },
                { label: "Langkah berikut", value: selected.nextAction },
                { label: "Pemilik", value: selected.ownerName ?? "Belum ada" },
              ]}
            />
            <DrawerSection title="Override dengan alasan">
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="override-state">Keadaan tujuan</Label>
                  <select
                    id="override-state"
                    value={toState}
                    onChange={(event) => setToState(event.target.value)}
                    className="mt-1.5 flex h-11 w-full border border-ink/20 bg-paper-2 px-2 text-[12px]"
                  >
                    <option value="">Pilih transisi yang sah</option>
                    {overrideTransitions.map((transition) => (
                      <option key={transition.to} value={transition.to}>
                        {transition.to} — {transition.guard}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="override-reason">Alasan</Label>
                  <Textarea
                    id="override-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-1.5 min-h-24"
                    placeholder="Tulis alasan yang bisa diaudit, minimal 8 karakter."
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!toState || reason.trim().length < 8}
                  onClick={() => void runOverride()}
                >
                  Simpan override
                </Button>
              </div>
            </DrawerSection>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
