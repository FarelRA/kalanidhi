"use client"

import * as React from "react"
import { ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type {
  BreakGlassView,
  CulturalSourceView,
  ImpersonationView,
  PrivacyRequestView,
  TakedownView,
} from "@/lib/governance/types"
import type { StatusTone } from "@/lib/workspace/types"

const takedownTone: Record<string, StatusTone> = {
  requested: "open",
  reviewing: "progress",
  approved: "wait",
  rejected: "muted",
  completed: "done",
  reversed: "muted",
}

const privacyTone: Record<string, StatusTone> = {
  open: "open",
  reviewing: "progress",
  completed: "done",
  rejected: "danger",
}

export function GovernanceBoardLive() {
  const { can } = useViewer()
  const allowed = can("governance.manage")
  const [tab, setTab] = React.useState("sources")
  const [reason, setReason] = React.useState("")
  const [community, setCommunity] = React.useState("")
  const [sourceName, setSourceName] = React.useState("")
  const [permissionRef, setPermissionRef] = React.useState("")
  const [attribution, setAttribution] = React.useState("")
  const [takedownTarget, setTakedownTarget] = React.useState("")
  const [takedownName, setTakedownName] = React.useState("")
  const [takedownContact, setTakedownContact] = React.useState("")
  const [correctionName, setCorrectionName] = React.useState("")
  const [correctionEmail, setCorrectionEmail] = React.useState("")
  const [correctionRegion, setCorrectionRegion] = React.useState("")
  const [privacyKind, setPrivacyKind] = React.useState("access")
  const [targetUser, setTargetUser] = React.useState("")
  const [breakEntity, setBreakEntity] = React.useState("call_recording")
  const [breakId, setBreakId] = React.useState("")

  const summary = useQuery(api.governance.summary, allowed ? {} : "skip")
  const sources = useQuery(
    api.governance.listCulturalSources,
    allowed ? {} : "skip",
  )
  const takedowns = useQuery(api.governance.listTakedowns, allowed ? {} : "skip")
  const privacy = useQuery(api.governance.listPrivacyRequests, allowed ? {} : "skip")
  const impersonations = useQuery(
    api.governance.listImpersonations,
    allowed ? {} : "skip",
  )
  const breakGlass = useQuery(api.governance.listBreakGlass, allowed ? {} : "skip")
  const people = useQuery(api.people.list, allowed ? {} : "skip")
  const works = useQuery(api.commerce.listWorks, allowed ? {} : "skip")

  const createSource = useMutation(api.governance.createCulturalSource)
  const withdrawSource = useMutation(api.governance.withdrawCulturalSource)
  const restoreSource = useMutation(api.governance.restoreCulturalSource)
  const createTakedown = useMutation(api.governance.createTakedown)
  const reviewTakedown = useMutation(api.governance.reviewTakedown)
  const executeTakedown = useMutation(api.governance.executeTakedown)
  const reverseTakedown = useMutation(api.governance.reverseTakedown)
  const createPrivacy = useMutation(api.governance.createPrivacyRequest)
  const reviewPrivacy = useMutation(api.governance.reviewPrivacyRequest)
  const startImpersonation = useMutation(api.governance.startImpersonation)
  const endImpersonation = useMutation(api.governance.endImpersonation)
  const grantBreakGlass = useMutation(api.governance.grantBreakGlass)
  const logBreakGlass = useMutation(api.governance.logBreakGlassAccess)

  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action()
      toast(message)
      setReason("")
    } catch (error) {
      toast("Tindakan gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  if (!allowed) {
    return (
      <EmptyState
        title="Ruang tata kelola terkunci"
        description="Tindakan ini memerlukan kemampuan governance.manage."
      />
    )
  }

  const sourceColumns: Column<CulturalSourceView>[] = [
    {
      id: "source",
      header: "Sumber",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.sourceName}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.community}</p>
        </div>
      ),
    },
    {
      id: "permission",
      header: "Izin",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">
          {row.permissionDocumentRef} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "short" }).format(new Date(row.permissionDate))}
        </span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "access",
      header: "Akses",
      cell: (row) => <StatusStamp label={row.accessLevel} tone={row.accessLevel === "public" ? "done" : row.accessLevel === "community" ? "wait" : "danger"} />,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={row.withdrawalStatus === "active" ? "Aktif" : row.withdrawalStatus === "withdrawn" ? "Ditarik" : "Diminta"}
          tone={row.withdrawalStatus === "active" ? "done" : row.withdrawalStatus === "withdrawn" ? "danger" : "wait"}
        />
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          {row.withdrawalStatus === "withdrawn" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={reason.trim().length < 8}
              onClick={() => void run(() => restoreSource({ sourceId: row.id as Id<"culturalSources">, reason }), "Sumber dipulihkan.")}
            >
              Pulihkan
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={reason.trim().length < 4}
              onClick={() => void run(() => withdrawSource({ sourceId: row.id as Id<"culturalSources">, reason }), "Sumber ditarik; karya terkait dijeda.")}
            >
              Tarik izin
            </Button>
          )}
        </div>
      ),
    },
  ]

  const takedownColumns: Column<TakedownView>[] = [
    {
      id: "target",
      header: "Target",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.targetLabel}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.code} · {row.targetType}</p>
        </div>
      ),
    },
    {
      id: "requester",
      header: "Pemohon",
      cell: (row) => <span className="text-[10.5px] text-ink-soft">{row.requesterName}</span>,
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.status} tone={takedownTone[row.status] ?? "wait"} />,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          {row.status === "requested" ? (
            <>
              <Button size="sm" variant="outline" disabled={reason.trim().length < 4} onClick={() => void run(() => reviewTakedown({ takedownId: row.id as Id<"takedownRequests">, decision: "approved", reason }), "Takedown disetujui.")}>
                Setujui
              </Button>
              <Button size="sm" variant="ghost" disabled={reason.trim().length < 4} onClick={() => void run(() => reviewTakedown({ takedownId: row.id as Id<"takedownRequests">, decision: "rejected", reason }), "Takedown ditolak.")}>
                Tolak
              </Button>
            </>
          ) : null}
          {row.status === "approved" ? (
            <Button size="sm" disabled={reason.trim().length < 4} onClick={() => void run(() => executeTakedown({ takedownId: row.id as Id<"takedownRequests">, reason }), "Takedown dijalankan.")}>
              Jalankan
            </Button>
          ) : null}
          {row.status === "completed" ? (
            <Button size="sm" variant="outline" disabled={reason.trim().length < 8} onClick={() => void run(() => reverseTakedown({ takedownId: row.id as Id<"takedownRequests">, reason }), "Takedown dibalik.")}>
              Balik
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  const privacyColumns: Column<PrivacyRequestView>[] = [
    {
      id: "subject",
      header: "Subjek",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.subjectName ?? row.requesterEmail}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.kind} · {row.requesterEmail}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.status} tone={privacyTone[row.status] ?? "wait"} />,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          {row.status === "open" || row.status === "reviewing" ? (
            <>
              <Button size="sm" variant="outline" disabled={reason.trim().length < 4} onClick={() => void run(() => reviewPrivacy({ requestId: row.id as Id<"privacyRequests">, decision: "completed", resolution: reason }), "Permintaan privasi diselesaikan.")}>
                Selesaikan
              </Button>
              <Button size="sm" variant="ghost" disabled={reason.trim().length < 4} onClick={() => void run(() => reviewPrivacy({ requestId: row.id as Id<"privacyRequests">, decision: "rejected", resolution: reason }), "Permintaan privasi ditolak.")}>
                Tolak
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  const impersonationColumns: Column<ImpersonationView>[] = [
    {
      id: "target",
      header: "Target",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.targetName ?? row.targetId}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">oleh {row.actorName ?? row.actorId} · {row.reason}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.active ? "Aktif" : row.endedAt ? "Selesai" : "Kedaluwarsa"} tone={row.active ? "wait" : "muted"} />,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) =>
        row.active ? (
          <Button size="sm" variant="outline" onClick={() => void run(() => endImpersonation({ sessionId: row.id as Id<"impersonationSessions">, reason: "Diakhiri dari tata kelola." }), "Sesi pratinjau diakhiri.")}>
            Akhiri
          </Button>
        ) : null,
    },
  ]

  const breakGlassColumns: Column<BreakGlassView>[] = [
    {
      id: "entity",
      header: "Catatan",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.entityType}</p>
          <p className="mt-0.5 break-all text-[10px] text-ink-muted">{row.entityId}</p>
        </div>
      ),
    },
    {
      id: "actor",
      header: "Aktor",
      cell: (row) => <span className="text-[10.5px] text-ink-soft">{row.actorName ?? row.actorId}</span>,
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.active ? "Aktif" : "Berakhir"} tone={row.active ? "wait" : "muted"} />,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tata kelola"
        title="Izin, penarikan, dan akses yang tercatat."
        description="Sumber budaya, takedown, permintaan privasi, pratinjau baca-saja, dan break-glass. Tidak ada penghapusan diam-diam; status dan pembalikan selalu tercatat."
        meta={
          summary ? (
            <span className="text-[10px] text-ink-muted">
              {summary.sources} sumber aktif · {summary.takedownsOpen} takedown terbuka · {summary.privacyOpen} privasi terbuka
            </span>
          ) : undefined
        }
      />

      <Panel eyebrow="Alasan tindakan" title="Wajib untuk tindakan yang diaudit">
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-16 text-[11px]"
          placeholder="Tulis alasan yang bisa diaudit. Tindakan tanpa alasan yang cukup akan ditolak."
        />
      </Panel>

      <SegmentedTabs
        tabs={[
          { id: "sources", label: "Sumber" },
          { id: "takedowns", label: "Takedown" },
          { id: "privacy", label: "Privasi" },
          { id: "impersonation", label: "Pratinjau" },
          { id: "breakglass", label: "Break-glass" },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih bagian tata kelola"
      />

      {tab === "sources" ? (
        <div className="space-y-4">
          <Panel eyebrow="Sumber baru" title="Catat izin komunitas">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <Label htmlFor="source-community">Komunitas</Label>
                <Input id="source-community" value={community} onChange={(event) => setCommunity(event.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="source-name">Nama sumber</Label>
                <Input id="source-name" value={sourceName} onChange={(event) => setSourceName(event.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="source-ref">Dokumen izin</Label>
                <Input id="source-ref" value={permissionRef} onChange={(event) => setPermissionRef(event.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="source-attribution">Atribusi</Label>
                <Input id="source-attribution" value={attribution} onChange={(event) => setAttribution(event.target.value)} className="mt-1.5" />
              </div>
            </div>
            <Button
              size="sm"
              className="mt-3"
              disabled={!community || !sourceName || !permissionRef || !attribution}
              onClick={() =>
                void run(async () => {
                  await createSource({
                    community,
                    sourceName,
                    permissionDocumentRef: permissionRef,
                    permissionDate: Date.now(),
                    accessLevel: "community",
                    attribution,
                  })
                  setCommunity("")
                  setSourceName("")
                  setPermissionRef("")
                  setAttribution("")
                }, "Sumber budaya dicatat.")
              }
            >
              Simpan sumber
            </Button>
          </Panel>
          <Panel eyebrow="Registry" title="Sumber budaya" bodyClassName="p-0">
            <DataTable
              rows={sources ?? []}
              columns={sourceColumns}
              caption="Sumber budaya dengan komunitas, izin, akses, dan status penarikan"
              searchPlaceholder="Cari komunitas atau sumber"
              getSearchText={(row) => `${row.community} ${row.sourceName} ${row.attribution}`}
              minWidth={760}
              emptyTitle="Belum ada sumber budaya"
              emptyDescription="Catat komunitas, dokumen izin, dan atribusi sebelum karya tayang."
            />
          </Panel>
        </div>
      ) : null}

      {tab === "takedowns" ? (
        <div className="space-y-4">
          <Panel eyebrow="Permintaan baru" title="Takedown">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label htmlFor="takedown-target">Target</Label>
                <select id="takedown-target" value={takedownTarget} onChange={(event) => setTakedownTarget(event.target.value)} className="mt-1.5 flex h-9 w-full border border-ink/20 bg-paper-2 px-2 text-[12px]">
                  <option value="">Pilih karya</option>
                  {(works ?? []).map((work) => (
                    <option key={work.id} value={work.id}>{work.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="takedown-name">Pemohon</Label>
                <Input id="takedown-name" value={takedownName} onChange={(event) => setTakedownName(event.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="takedown-contact">Kontak</Label>
                <Input id="takedown-contact" value={takedownContact} onChange={(event) => setTakedownContact(event.target.value)} className="mt-1.5" />
              </div>
            </div>
            <Button
              size="sm"
              className="mt-3"
              disabled={!takedownTarget || !takedownName || !takedownContact || reason.trim().length < 4}
              onClick={() =>
                void run(async () => {
                  const work = (works ?? []).find((item) => item.id === takedownTarget)
                  await createTakedown({
                    targetType: "work",
                    targetId: takedownTarget,
                    targetLabel: work?.title ?? takedownTarget,
                    requesterName: takedownName,
                    requesterContact: takedownContact,
                    reason,
                  })
                  setTakedownTarget("")
                  setTakedownName("")
                  setTakedownContact("")
                }, "Permintaan takedown dicatat.")
              }
            >
              Catat permintaan
            </Button>
          </Panel>
          <Panel eyebrow="Antrean" title="Permintaan takedown" bodyClassName="p-0">
            <DataTable
              rows={takedowns ?? []}
              columns={takedownColumns}
              caption="Permintaan takedown dengan target, pemohon, status, dan tindakan"
              searchPlaceholder="Cari target atau kode"
              getSearchText={(row) => `${row.code} ${row.targetLabel} ${row.requesterName}`}
              minWidth={760}
              emptyTitle="Belum ada permintaan takedown"
            />
          </Panel>
        </div>
      ) : null}

      {tab === "privacy" ? (
        <div className="space-y-4">
          <Panel eyebrow="Permintaan" title="Privasi saya">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="privacy-kind">Jenis</Label>
                <select id="privacy-kind" value={privacyKind} onChange={(event) => setPrivacyKind(event.target.value)} className="mt-1.5 flex h-9 border border-ink/20 bg-paper-2 px-2 text-[12px]">
                  <option value="access">Akses</option>
                  <option value="correction">Koreksi</option>
                  <option value="deletion">Penghapusan</option>
                  <option value="hold">Retensi</option>
                </select>
              </div>
              <Button
                size="sm"
                disabled={reason.trim().length < 4}
                onClick={() =>
                  void run(
                    () =>
                      createPrivacy({
                        kind: privacyKind as "access" | "correction" | "deletion" | "hold",
                        reason,
                        correction:
                          privacyKind === "correction"
                            ? {
                                name: correctionName || undefined,
                                email: correctionEmail || undefined,
                                region: correctionRegion || undefined,
                              }
                            : undefined,
                      }),
                    "Permintaan privasi dicatat.",
                  )
                }
              >
                Ajukan permintaan
              </Button>
            </div>
            {privacyKind === "correction" ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <div>
                  <Label htmlFor="correction-name">Nama baru</Label>
                  <Input id="correction-name" value={correctionName} onChange={(event) => setCorrectionName(event.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="correction-email">Email baru</Label>
                  <Input id="correction-email" value={correctionEmail} onChange={(event) => setCorrectionEmail(event.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="correction-region">Wilayah baru</Label>
                  <Input id="correction-region" value={correctionRegion} onChange={(event) => setCorrectionRegion(event.target.value)} className="mt-1.5" />
                </div>
              </div>
            ) : null}
          </Panel>
          <Panel eyebrow="Registry" title="Permintaan privasi" bodyClassName="p-0">
            <DataTable
              rows={privacy ?? []}
              columns={privacyColumns}
              caption="Permintaan akses, koreksi, penghapusan, dan retensi"
              searchPlaceholder="Cari subjek atau email"
              getSearchText={(row) => `${row.subjectName ?? ""} ${row.requesterEmail} ${row.kind}`}
              minWidth={720}
              emptyTitle="Belum ada permintaan privasi"
            />
          </Panel>
        </div>
      ) : null}

      {tab === "impersonation" ? (
        <div className="space-y-4">
          <Panel eyebrow="Pratinjau sebagai" title="Baca saja, berbatas waktu">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-56">
                <Label htmlFor="impersonation-target">Akun target</Label>
                <select id="impersonation-target" value={targetUser} onChange={(event) => setTargetUser(event.target.value)} className="mt-1.5 flex h-9 w-full border border-ink/20 bg-paper-2 px-2 text-[12px]">
                  <option value="">Pilih akun non-pengelola</option>
                  {(people ?? []).filter((person) => !person.roles.includes("admin")).map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                disabled={!targetUser || reason.trim().length < 8}
                onClick={() =>
                  void run(
                    () =>
                      startImpersonation({
                        targetId: targetUser as Id<"users">,
                        reason,
                        minutes: 15,
                      }),
                    "Sesi pratinjau baca-saja dibuat.",
                  )
                }
              >
                Mulai pratinjau
              </Button>
            </div>
          </Panel>
          <Panel eyebrow="Registry" title="Sesi pratinjau" bodyClassName="p-0">
            <DataTable
              rows={impersonations ?? []}
              columns={impersonationColumns}
              caption="Sesi pratinjau dengan aktor, target, alasan, dan status"
              minWidth={720}
              emptyTitle="Belum ada sesi pratinjau"
            />
          </Panel>
        </div>
      ) : null}

      {tab === "breakglass" ? (
        <div className="space-y-4">
          <Panel eyebrow="Izin akses" title="Break-glass">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor="break-entity">Jenis catatan</Label>
                <select id="break-entity" value={breakEntity} onChange={(event) => setBreakEntity(event.target.value)} className="mt-1.5 flex h-9 border border-ink/20 bg-paper-2 px-2 text-[12px]">
                  <option value="call_recording">Rekaman panggilan</option>
                  <option value="identity_document">Dokumen identitas</option>
                  <option value="submission_asset">Aset tugas</option>
                  <option value="message_asset">Aset pesan</option>
                </select>
              </div>
              <div className="min-w-56">
                <Label htmlFor="break-id">ID catatan</Label>
                <Input id="break-id" value={breakId} onChange={(event) => setBreakId(event.target.value)} className="mt-1.5" />
              </div>
              <Button
                size="sm"
                disabled={!breakId || reason.trim().length < 8}
                onClick={() =>
                  void run(
                    () =>
                      grantBreakGlass({
                        entityType: breakEntity as "call_recording" | "identity_document" | "submission_asset" | "message_asset",
                        entityId: breakId,
                        reason,
                        minutes: 10,
                      }),
                    "Izin break-glass dibuat.",
                  )
                }
              >
                Beri izin
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!breakId}
                onClick={async () => {
                  try {
                    const result = await logBreakGlass({
                      entityType: breakEntity as "call_recording" | "identity_document" | "submission_asset" | "message_asset",
                      entityId: breakId,
                    })
                    toast(
                      result.allowed ? "Akses tercatat." : "Akses ditolak",
                      {
                        description: result.allowed
                          ? undefined
                          : "Tidak ada izin aktif. Percobaan tetap dicatat di audit.",
                      },
                    )
                  } catch (error) {
                    toast("Gagal mencatat akses", {
                      description: error instanceof Error ? error.message : "Coba lagi.",
                    })
                  }
                }}
              >
                Catat akses
              </Button>
            </div>
          </Panel>
          <Panel eyebrow="Registry" title="Izin aktif dan riwayat" bodyClassName="p-0">
            <DataTable
              rows={breakGlass ?? []}
              columns={breakGlassColumns}
              caption="Registry break-glass untuk pesan, rekaman, dan dokumen"
              searchPlaceholder="Cari jenis atau aktor"
              getSearchText={(row) => `${row.entityType} ${row.entityId} ${row.actorName ?? ""}`}
              minWidth={720}
              emptyTitle="Belum ada izin break-glass"
            />
          </Panel>
          <Panel eyebrow="Kebijakan" title="Batas akses">
            <div className="flex gap-2.5 border border-ink/15 bg-paper/40 p-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-copper-dark" aria-hidden="true" />
              <p className="text-[9.5px] leading-relaxed text-ink-muted">
                Break-glass tidak memberi akses tulis, ekspor, atau unduhan. Setiap akses
                yang ditolak juga dicatat tanpa menampilkan isi. Untuk percakapan, izin
                dikelola oleh modul pesan dengan persetujuan pengguna.
              </p>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
