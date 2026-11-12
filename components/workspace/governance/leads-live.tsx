"use client"

import * as React from "react"
import { ArrowRight, Download, Mail, Phone, Sparkles } from "lucide-react"
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
import { api } from "@/convex/_generated/api"
import { downloadCsv } from "@/lib/admin/csv"
import type { Id } from "@/convex/_generated/dataModel"
import type { LeadStatus, LeadSummary } from "@/lib/admin/types"
import type { StatusTone } from "@/lib/workspace/types"
import { useMutation, useQuery } from "convex/react"

type View = "new" | "follow" | "institutions" | "done" | "spam" | "all"

const VIEWS: { id: View; label: string }[] = [
  { id: "new", label: "Baru" },
  { id: "follow", label: "Perlu dihubungi" },
  { id: "institutions", label: "Institusi" },
  { id: "done", label: "Selesai" },
  { id: "spam", label: "Spam" },
]

function statusTone(status: LeadStatus): StatusTone {
  if (status === "converted") return "done"
  if (status === "qualified") return "progress"
  if (status === "spam" || status === "lost") return "danger"
  if (status === "contacted") return "wait"
  return "open"
}

function intentLabel(intent: LeadSummary["intent"]): string {
  return intent === "student"
    ? "Peserta"
    : intent === "institution"
      ? "Institusi"
      : intent === "consultation"
        ? "Konsultasi"
        : "Kabar"
}

function dateTimeLabel(value: number | null): string {
  if (value === null) return "—"
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export function LeadsLive() {
  const [view, setView] = React.useState<View>("new")
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Id<"leads"> | null>(null)
  const [reasonAction, setReasonAction] = React.useState<{
    title: string
    description: string
    label: string
    run: (reason: string) => Promise<void>
  } | null>(null)
  const [reason, setReason] = React.useState("")

  const rows = useQuery(api.leads.list, {
    view,
    q: query || undefined,
  })
  const allRows = useQuery(api.leads.list, { view: "all" })
  const exportLeads = useMutation(api.leads.exportLeads)

  async function runAction() {
    if (!reasonAction) return
    if (reason.trim().length < 4) {
      toast("Alasan terlalu pendek")
      return
    }
    try {
      await reasonAction.run(reason.trim())
      toast(reasonAction.label)
      setReasonAction(null)
      setReason("")
    } catch (error) {
      toast("Tindakan gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  async function exportRows() {
    try {
      const result = await exportLeads({
        view,
        q: query || undefined,
        reason: "Ekspor dari halaman prospek",
      })
      downloadCsv("prospek-kalanidhi.csv", [
        ["email", "nama", "niat", "status", "minat", "pemilik", "masuk"],
        ...result.rows.map((row) => [
          row.email,
          row.name ?? "",
          row.intent,
          row.status,
          row.interest ?? "",
          row.owner?.name ?? "",
          new Date(row.createdAt).toISOString(),
        ]),
      ])
      toast("Ekspor tercatat", {
        description: `${result.rows.length} baris diunduh; ekspor masuk log audit.`,
      })
    } catch (error) {
      toast("Ekspor gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  const counts = React.useMemo(() => {
    const list = allRows ?? []
    const count = (statuses: LeadStatus[]) =>
      list.filter((row) => statuses.includes(row.status)).length
    return {
      new: count(["new"]),
      follow: count(["new", "contacted", "qualified"]),
      institutions: list.filter((row) => row.intent === "institution").length,
      done: count(["converted"]),
      spam: count(["spam"]),
      all: list.length,
    }
  }, [allRows])

  const columns: Column<LeadSummary>[] = [
    {
      id: "name",
      header: "Lead",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.name ?? row.email}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.email}</p>
        </div>
      ),
    },
    {
      id: "intent",
      header: "Niat",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">{intentLabel(row.intent)}</span>
      ),
    },
    {
      id: "interest",
      header: "Minat",
      cell: (row) => (
        <span className="block max-w-56 text-[11px] leading-snug text-ink-soft">
          {row.interest || row.institution || "—"}
          {row.participants ? ` · ${row.participants} peserta` : ""}
        </span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "age",
      header: "Umur",
      cell: (row) => (
        <span className="text-[11px] tabular-nums">{row.ageDays} hari</span>
      ),
    },
    {
      id: "owner",
      header: "Pemilik",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">
          {row.owner?.name ?? "Belum ada"}
        </span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp label={row.status} tone={statusTone(row.status)} />
      ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => setSelected(row.id as Id<"leads">)}>
          Buka
          <ArrowRight aria-hidden="true" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Prospek"
        title="Percakapan sebelum bangku."
        description="Lead dari landing dan kanal lain. Setiap pemilik, catatan, status, dan ekspor tercatat di log audit."
        meta={
          <span className="text-[10px] text-ink-muted">
            {rows?.length ?? 0} lead pada tampilan ini · {counts.all} total
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => void exportRows()}>
              <Download aria-hidden="true" />
              Ekspor CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-4">
        {[
          ["Lead baru", counts.new, "belum disentuh"],
          ["Perlu dihubungi", counts.follow, "dalam antrean"],
          ["Terkualifikasi", counts.done, "sudah dikonversi"],
          ["Institusi", counts.institutions, "niat institusi"],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="border border-ink/20 bg-paper-2 p-3.5">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {label}
            </p>
            <p className="mt-1.5 font-heading text-2xl leading-none text-ink tabular-nums">
              {value}
            </p>
            <p className="mt-1 text-[9.5px] text-ink-muted">{note}</p>
          </div>
        ))}
      </div>

      <SegmentedTabs
        tabs={[
          ...VIEWS.map((item) => ({
            id: item.id,
            label: item.label,
            count: counts[item.id],
          })),
          { id: "all", label: "Semua", count: counts.all },
        ]}
        value={view}
        onChange={(value) => setView(value as View)}
        ariaLabel="Pilih tampilan prospek"
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-9" eyebrow="CRM" title="Antrean lead" bodyClassName="p-0">
          <DataTable
            rows={rows ?? []}
            columns={columns}
            caption="Lead dengan niat, kontak, minat, umur, pemilik, dan status"
            searchPlaceholder="Cari nama, kontak, minat, atau wilayah"
            getSearchText={(row) =>
              `${row.name ?? ""} ${row.email} ${row.whatsapp ?? ""} ${row.interest ?? ""} ${row.owner?.name ?? ""} ${row.status}`
            }
            toolbar={
              <div className="flex items-center gap-2">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari lead"
                  className="h-8 w-44 text-[11px]"
                />
                {query ? (
                  <Button size="sm" variant="ghost" onClick={() => setQuery("")}>
                    Bersihkan
                  </Button>
                ) : null}
              </div>
            }
            emptyTitle="Tidak ada lead pada tampilan ini"
            emptyDescription="Lead baru muncul begitu formulir publik atau kanal lain masuk."
            minWidth={840}
            footer={
              <p>
                Ekspor dan perubahan status masuk log audit. Data pribadi
                mengikuti kebijakan retensi.
              </p>
            }
          />
        </Panel>

        <div className="space-y-4 xl:col-span-3">
          <Panel eyebrow="Tindak lanjut" title="Hari ini">
            <ul className="space-y-2.5">
              {(allRows ?? [])
                .filter((row) => ["new", "contacted"].includes(row.status))
                .slice(0, 4)
                .map((lead) => (
                  <li key={lead.id} className="border-b border-ink/10 pb-2.5 last:border-b-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => setSelected(lead.id as Id<"leads">)}
                      className="w-full text-left"
                    >
                      <p className="text-[11px] font-semibold text-ink hover:text-copper-dark">
                        {lead.name ?? lead.email}
                      </p>
                      <p className="mt-0.5 text-[9.5px] leading-snug text-ink-muted">
                        {lead.interest || lead.institution || "Belum ada minat"}
                      </p>
                      <p className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                        {lead.owner?.name ?? "Belum ada pemilik"} · {lead.ageDays} hari
                      </p>
                    </button>
                  </li>
                ))}
            </ul>
          </Panel>
          <Panel eyebrow="Panduan" title="Dari lead ke bangku">
            <ol className="space-y-2.5">
              {[
                ["01", "Hubungi dan catat kebutuhan"],
                ["02", "Tandai terkualifikasi"],
                ["03", "Konversi ke pendaftaran publik"],
                ["04", "Ekspor hanya dengan alasan"],
              ].map(([code, text]) => (
                <li key={code} className="flex gap-2 text-[10.5px] leading-relaxed text-ink-soft">
                  <span className="font-heading text-copper-dark">{code}</span>
                  {text}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <LeadDrawer
        leadId={selected}
        onClose={() => setSelected(null)}
        onReasonAction={(next) => {
          setReasonAction(next)
          setReason("")
        }}
      />

      <Dialog open={Boolean(reasonAction)} onOpenChange={(open) => !open && setReasonAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonAction?.title}</DialogTitle>
            <DialogDescription>{reasonAction?.description}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="lead-reason">Alasan</Label>
            <Textarea
              id="lead-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 min-h-24"
              placeholder="Tulis alasan yang bisa diaudit."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonAction(null)}>
              Batal
            </Button>
            <Button onClick={() => void runAction()}>{reasonAction?.label}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LeadDrawer({
  leadId,
  onClose,
  onReasonAction,
}: {
  leadId: Id<"leads"> | null
  onClose: () => void
  onReasonAction: (action: {
    title: string
    description: string
    label: string
    run: (reason: string) => Promise<void>
  }) => void
}) {
  const detail = useQuery(api.leads.get, leadId === null ? "skip" : { id: leadId })
  const owners = useQuery(api.leads.owners)
  const assign = useMutation(api.leads.assign)
  const addNote = useMutation(api.leads.addNote)
  const setStatus = useMutation(api.leads.setStatus)
  const convert = useMutation(api.leads.convert)
  const [ownerId, setOwnerId] = React.useState("")
  const [note, setNote] = React.useState("")
  const [followUp, setFollowUp] = React.useState("")

  if (leadId === null) return null

  const lead = detail?.lead
  const nextStatuses: Record<string, LeadStatus[]> = {
    new: ["contacted", "qualified", "lost", "spam"],
    contacted: ["qualified", "lost", "spam"],
    qualified: ["lost", "spam"],
    lost: ["qualified", "spam"],
    spam: ["new"],
  }

  return (
    <DetailDrawer
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow={lead ? `Lead · ${intentLabel(lead.intent)}` : "Lead"}
      title={
        lead?.name ?? (detail === null ? "Lead tidak ditemukan" : "Memuat lead")
      }
      stamp={lead?.status}
      tone={lead ? statusTone(lead.status) : "muted"}
      description={lead?.email}
      width="sm:max-w-[660px]"
      footer={
        lead ? (
          <div className="flex flex-wrap gap-2">
            {nextStatuses[lead.status]?.slice(0, 2).map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                onClick={() =>
                  onReasonAction({
                    title: `Ubah status ke ${status}`,
                    description: "Transisi status mengikuti state machine lead dan dicatat di audit.",
                    label: status,
                    run: async (reason) => {
                      await setStatus({ leadId, status, reason })
                    },
                  })
                }
              >
                {status}
              </Button>
            ))}
            {lead.status === "qualified" ? (
              <Button
                size="sm"
                onClick={() =>
                  onReasonAction({
                    title: "Konversi lead",
                    description: "Lead ditandai selesai. Pendaftaran peserta memakai tautan publik.",
                    label: "Konversi",
                    run: async (reason) => {
                      await convert({ leadId, reason })
                    },
                  })
                }
              >
                Konversi
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {lead ? (
        <div className="space-y-6">
          <DetailGrid
            items={[
              { label: "Status", value: <StatusStamp label={lead.status} tone={statusTone(lead.status)} /> },
              { label: "Niat", value: intentLabel(lead.intent) },
              { label: "Pemilik", value: lead.owner?.name ?? "Belum ada" },
              { label: "Umur", value: `${lead.ageDays} hari` },
              { label: "WhatsApp", value: lead.whatsapp ?? "—" },
              { label: "Sumber", value: lead.source ?? "—" },
              { label: "Institusi", value: lead.institution ?? "—" },
              { label: "Jenis institusi", value: lead.institutionType ?? "—" },
              {
                label: "Peserta",
                value: lead.participants ? `${lead.participants} orang` : "—",
              },
              { label: "Minat", value: lead.interest ?? "—" },
              { label: "Dikonversi", value: dateTimeLabel(lead.convertedAt) },
            ]}
          />

          <DrawerSection title="Pesan awal">
            <p className="border-l-2 border-copper/50 pl-3 text-[11.5px] leading-relaxed text-ink-soft">
              {lead.message || "Tidak ada pesan awal."}
            </p>
          </DrawerSection>

          <DrawerSection title="Penugasan">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1">
                <Label htmlFor="lead-owner">Pemilik</Label>
                <select
                  id="lead-owner"
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                  className="mt-1 flex h-9 w-full border border-ink/20 bg-paper-2 px-2 text-[12px]"
                >
                  <option value="">Pilih pengelola</option>
                  {(owners ?? []).map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!ownerId}
                onClick={() =>
                  onReasonAction({
                    title: "Tetapkan pemilik",
                    description: "Riwayat penugasan append-only dan masuk audit.",
                    label: "Tetapkan",
                    run: async (reason) => {
                      await assign({
                        leadId,
                        ownerId: ownerId as Id<"users">,
                        reason,
                      })
                    },
                  })
                }
              >
                Tetapkan
              </Button>
            </div>
            <ul className="mt-3 space-y-1.5">
              {(detail.assignments ?? []).map((assignment) => (
                <li key={assignment.id} className="text-[10px] text-ink-muted">
                  {assignment.ownerName} ·{" "}
                  {new Intl.DateTimeFormat("id-ID", {
                    timeZone: "Asia/Jakarta",
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(assignment.createdAt))}
                </li>
              ))}
            </ul>
          </DrawerSection>

          <DrawerSection title="Catatan dan tindak lanjut">
            <div className="grid gap-2.5">
              <div>
                <Label htmlFor="lead-follow">Tanggal tindak lanjut</Label>
                <Input
                  id="lead-follow"
                  type="date"
                  value={followUp}
                  onChange={(event) => setFollowUp(event.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="lead-note">Catatan</Label>
                <Textarea
                  id="lead-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="mt-1.5 min-h-20"
                  placeholder="Ringkas percakapan dan langkah berikutnya."
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!note.trim()}
                onClick={async () => {
                  try {
                    await addNote({
                      leadId,
                      kind: "note",
                      body: note,
                      followUpAt: followUp
                        ? new Date(`${followUp}T09:00:00+07:00`).getTime()
                        : undefined,
                    })
                    setNote("")
                    toast("Catatan ditambahkan")
                  } catch (error) {
                    toast("Catatan gagal", {
                      description: error instanceof Error ? error.message : "Coba lagi.",
                    })
                  }
                }}
              >
                <Sparkles aria-hidden="true" />
                Simpan catatan
              </Button>
            </div>
            <ul className="mt-4 space-y-2.5">
              {(detail.notes ?? []).map((item) => (
                <li key={item.id} className="border-l-2 border-copper/40 pl-2.5">
                  <p className="text-[11px] leading-relaxed text-ink-soft">{item.body}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                    {item.authorName} ·{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      timeZone: "Asia/Jakarta",
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </p>
                </li>
              ))}
            </ul>
          </DrawerSection>

          <DrawerSection title="Tindakan cepat">
            <div className="flex flex-wrap gap-1.5">
              {lead.whatsapp ? (
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}>
                    <Phone aria-hidden="true" />
                    WhatsApp
                  </a>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${lead.email}`}>
                  <Mail aria-hidden="true" />
                  Email
                </a>
              </Button>
            </div>
          </DrawerSection>
        </div>
      ) : detail === null ? (
        <p className="text-[12px] leading-relaxed text-ink-muted">
          Lead ini tidak tersedia untuk peranmu, atau sudah dihapus.
        </p>
      ) : (
        <p className="text-[12px] text-ink-muted">Memuat detail lead.</p>
      )}
    </DetailDrawer>
  )
}
