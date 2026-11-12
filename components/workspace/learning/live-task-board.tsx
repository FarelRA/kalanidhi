"use client"

import * as React from "react"
import { FileAudio, FileText } from "lucide-react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type Column } from "@/components/workspace/data/data-table"
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
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"
import type {
  RubricInput,
  SubmissionDetail,
  SubmissionOverview,
} from "@/lib/workspace/phase2-types"
import { formatWorkspaceDateTime } from "@/lib/workspace/format"

function iso(ms: number) {
  return new Date(ms).toISOString()
}

export function LiveTaskBoard() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState(
    can("submissions.grade") ? "queue" : "mine",
  )
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const mine = useQuery(
    api.assessments.listMine,
    can("submissions.submit") ? {} : "skip",
  )
  const queue = useQuery(
    api.assessments.listQueue,
    can("submissions.grade") || can("submissions.escalate") ? {} : "skip",
  )
  const escalations = useQuery(
    api.assessments.listEscalations,
    can("submissions.escalate") ? {} : "skip",
  )

  const tabs = [
    can("submissions.submit") && {
      id: "mine",
      label: "Tugas saya",
      count: mine?.length ?? 0,
    },
    (can("submissions.grade") || can("submissions.escalate")) && {
      id: "queue",
      label: can("submissions.grade") ? "Antrean penilaian" : "Semua tugas",
      count: queue?.length ?? 0,
    },
    can("submissions.escalate") && {
      id: "escalation",
      label: "Eskalasi",
      count: escalations?.length ?? 0,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id

  if (tabs.length === 0) {
    return (
      <EmptyState
        title="Belum ada tugas"
        description="Akun ini belum memiliki akses tugas atau penilaian."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tugas & penilaian"
        title={
          can("submissions.grade")
            ? "Beri catatan, bukan hanya nilai."
            : can("submissions.escalate")
              ? "Antrean tugas dan eskalasi."
              : "Kirim proses kerjamu."
        }
        description={
          can("submissions.grade")
            ? "Periksa bukti, isi skor per rubrik, lalu putuskan. Persetujuan menerbitkan sertifikat platform."
            : can("submissions.escalate")
              ? "Pantau SLA lintas pengajar dan eskalasi tanpa menilai sendiri."
              : "Unggah catatan proses. Pengajar menilai dengan rubrik jalur."
        }
      />

      <SegmentedTabs
        tabs={tabs}
        value={active ?? "mine"}
        onChange={setTab}
        ariaLabel="Pilih tampilan tugas"
      />

      {active === "mine" ? (
        <StudentTaskList
          submissions={mine ?? []}
          onSelect={(row) => setSelectedId(row.id)}
        />
      ) : null}
      {active === "queue" ? (
        <SubmissionTable
          submissions={queue ?? []}
          caption="Antrean tugas dengan peserta, jalur, umur, dan status"
          onSelect={(row) => setSelectedId(row.id)}
        />
      ) : null}
      {active === "escalation" ? (
        <SubmissionTable
          submissions={escalations ?? []}
          caption="Tugas yang melewati SLA atau dieskalasi"
          onSelect={(row) => setSelectedId(row.id)}
        />
      ) : null}

      <SubmissionDrawer
        submissionId={selectedId}
        onClose={() => setSelectedId(null)}
        canGrade={can("submissions.grade")}
        canSubmit={can("submissions.submit")}
        canEscalate={can("submissions.escalate")}
      />
    </div>
  )
}

function StudentTaskList({
  submissions,
  onSelect,
}: {
  submissions: SubmissionOverview[]
  onSelect: (row: SubmissionOverview) => void
}) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        title="Belum ada tugas"
        description="Tugas akan muncul setelah pendaftaran aktif dan pengajar membuka tugas."
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {submissions.map((item) => (
        <article
          key={item.id}
          className="border border-ink/20 bg-paper-2 p-4 shadow-[3px_3px_0_rgba(32,19,13,0.05)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                {item.code} · {item.pathTitle}
              </p>
              <h2 className="mt-1 font-heading text-[1.35rem] leading-tight text-ink">
                {item.taskTitle}
              </h2>
            </div>
            <StatusStamp label={item.statusLabel} tone={item.tone} />
          </div>
          <p className="mt-2 text-[11px] text-ink-muted">
            Batas {formatWorkspaceDateTime(iso(item.dueAt))} ·{" "}
            {item.evidence.length} bukti terunggah
          </p>
          {item.score !== null ? (
            <div className="mt-3 border-y border-ink/15 py-2.5">
              <span className="font-heading text-2xl leading-none text-ink">
                {item.score}
              </span>
              <span className="ml-1 text-[10px] text-ink-muted">
                / 100 · dinilai pengajar
              </span>
            </div>
          ) : null}
          {item.feedback ? (
            <p className="mt-3 border-l-2 border-copper/50 pl-3 text-[11.5px] leading-relaxed text-ink-soft">
              {item.feedback}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onSelect(item)}>
              Buka tugas
            </Button>
          </div>
        </article>
      ))}
    </div>
  )
}

function SubmissionTable({
  submissions,
  caption,
  onSelect,
}: {
  submissions: SubmissionOverview[]
  caption: string
  onSelect: (row: SubmissionOverview) => void
}) {
  const columns: Column<SubmissionOverview>[] = [
    {
      id: "code",
      header: "Tugas",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.code}</p>
          <p className="mt-0.5 max-w-56 truncate text-[10px] text-ink-muted">
            {row.taskTitle}
          </p>
        </div>
      ),
    },
    {
      id: "student",
      header: "Peserta",
      cell: (row) => (
        <div>
          <p className="text-[11.5px] font-medium">{row.studentName}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.cohort}</p>
        </div>
      ),
    },
    {
      id: "teacher",
      header: "Pengajar",
      cell: (row) => (
        <span className="text-[11px] text-ink-soft">{row.teacher}</span>
      ),
      className: "hidden md:table-cell",
      headClassName: "hidden md:table-cell",
    },
    {
      id: "age",
      header: "Umur",
      cell: (row) => (
        <span
          className={
            row.ageHours > row.slaHours
              ? "text-[11px] font-semibold text-[#9a3423]"
              : "text-[11px] tabular-nums text-ink-soft"
          }
        >
          {row.ageHours} jam
        </span>
      ),
    },
    {
      id: "sla",
      header: "SLA",
      cell: (row) =>
        row.ageHours > row.slaHours ? (
          <StatusStamp label="Lewat SLA" tone="danger" />
        ) : row.ageHours > row.slaHours * 0.7 ? (
          <StatusStamp label="Hampir" tone="wait" />
        ) : (
          <StatusStamp label="Dalam SLA" tone="progress" />
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusStamp label={row.statusLabel} tone={row.tone} />,
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
          Buka
        </Button>
      ),
    },
  ]

  return (
    <Panel eyebrow="Antrean" title="Tugas" bodyClassName="p-0">
      <DataTable
        rows={submissions}
        columns={columns}
        caption={caption}
        searchPlaceholder="Cari peserta, kode, atau jalur"
        getSearchText={(row) =>
          `${row.studentName} ${row.code} ${row.pathTitle} ${row.statusLabel}`
        }
        emptyTitle="Antrean kosong"
        emptyDescription="Tidak ada tugas yang menunggu keputusan saat ini."
        minWidth={820}
      />
    </Panel>
  )
}

function SubmissionDrawer({
  submissionId,
  onClose,
  canGrade,
  canSubmit,
  canEscalate,
}: {
  submissionId: string | null
  onClose: () => void
  canGrade: boolean
  canSubmit: boolean
  canEscalate: boolean
}) {
  const detail = useQuery(
    api.assessments.getSubmission,
    submissionId ? { submissionId: submissionId as never } : "skip",
  )

  if (submissionId === null) return null

  if (detail === undefined) {
    return (
      <DetailDrawer
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        eyebrow="Tugas"
        title="Memuat tugas"
      >
        {null}
      </DetailDrawer>
    )
  }

  if (detail === null) {
    return (
      <DetailDrawer
        open
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        eyebrow="Tugas"
        title="Tugas tidak ditemukan"
      >
        <p className="text-[12px] leading-relaxed text-ink-muted">
          Tugas ini tidak tersedia untuk akun ini, atau sudah dipindahkan.
        </p>
      </DetailDrawer>
    )
  }

  return (
    <SubmissionDrawerContent
      key={detail.id}
      detail={detail}
      onClose={onClose}
      canGrade={canGrade}
      canSubmit={canSubmit}
      canEscalate={canEscalate}
    />
  )
}

function SubmissionDrawerContent({
  detail,
  onClose,
  canGrade,
  canSubmit,
  canEscalate,
}: {
  detail: SubmissionDetail
  onClose: () => void
  canGrade: boolean
  canSubmit: boolean
  canEscalate: boolean
}) {
  const saveDraft = useMutation(api.assessments.saveDraft)
  const submit = useMutation(api.assessments.submit)
  const grade = useMutation(api.assessments.grade)
  const escalate = useMutation(api.assessments.escalateSubmission)

  const [draft, setDraft] = React.useState(detail.evidenceText ?? "")
  const [rubric, setRubric] = React.useState<RubricInput[]>(
    detail.rubric.map((item) => ({
      criterion: item.criterion,
      weight: item.weight,
      score: item.score ?? 75,
      comment: item.comment ?? undefined,
    })),
  )
  const [feedback, setFeedback] = React.useState(detail.feedback ?? "")
  const [escalationReason, setEscalationReason] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  function updateScore(index: number, raw: string) {
    const parsed = Number.parseInt(raw, 10)
    setRubric((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, score: Number.isNaN(parsed) ? 0 : parsed }
          : item,
      ),
    )
  }

  async function onSave() {
    setSaving(true)
    try {
      await saveDraft({
        submissionId: detail.id,
        evidenceText: draft,
      })
      toast("Draf disimpan", { description: "Draf hanya terlihat olehmu." })
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit() {
    setSaving(true)
    try {
      await submit({ submissionId: detail.id })
      toast("Tugas dikirim", {
        description: "Tugas masuk antrean pengajar.",
      })
      onClose()
    } catch (error) {
      toast.error("Tugas belum dapat dikirim", {
        description: error instanceof Error ? error.message : "Periksa bukti.",
      })
    } finally {
      setSaving(false)
    }
  }

  async function onDecision(decision: "approve" | "reject" | "revision") {
    setSaving(true)
    try {
      const result = await grade({
        submissionId: detail.id,
        decision,
        rubric,
        feedback,
      })
      toast(
        decision === "approve"
          ? "Penilaian disetujui"
          : decision === "reject"
            ? "Tugas ditolak"
            : "Revisi diminta",
        {
          description:
            decision === "approve"
              ? "Sertifikat platform diterbitkan otomatis."
              : decision === "revision"
                ? "Peserta menerima catatan revisi."
                : "Keputusan tercatat pada riwayat penilaian.",
        },
      )
      void result
      onClose()
    } catch (error) {
      toast.error("Penilaian gagal disimpan", {
        description:
          error instanceof Error ? error.message : "Periksa rubrik dan catatan.",
      })
    } finally {
      setSaving(false)
    }
  }

  async function onEscalate() {
    setSaving(true)
    try {
      await escalate({
        submissionId: detail.id,
        reason: escalationReason,
      })
      toast("Eskalasi dicatat", {
        description: "Pengelola menerima catatan tanpa hak menilai.",
      })
      setEscalationReason("")
    } catch (error) {
      toast.error("Eskalasi gagal", {
        description:
          error instanceof Error ? error.message : "Alasan minimal 8 karakter.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DetailDrawer
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      eyebrow="Tugas"
      title={detail?.code ?? "Tugas"}
      stamp={detail?.statusLabel}
      tone={detail?.tone}
      description={
        detail ? `${detail.studentName} · ${detail.taskTitle}` : undefined
      }
    >
      {detail ? (
        <>
          <DetailGrid
            items={[
              { label: "Peserta", value: detail.studentName },
              { label: "Kohort", value: detail.cohort },
              { label: "Jalur", value: detail.pathTitle },
              { label: "Pengajar", value: detail.teacher },
              {
                label: "Dikirim",
                value: detail.submittedAt
                  ? formatWorkspaceDateTime(iso(detail.submittedAt))
                  : "Belum dikirim",
              },
              { label: "Batas", value: formatWorkspaceDateTime(iso(detail.dueAt)) },
              { label: "Umur", value: `${detail.ageHours} jam` },
              { label: "Revisi", value: `${detail.revisionCount} kali` },
              ...(detail.escalatedAt
                ? [
                    {
                      label: "Dieskalasi oleh",
                      value:
                        detail.escalatedByName ??
                        detail.escalatedBy ??
                        "Belum diisi",
                    },
                    {
                      label: "Alasan eskalasi",
                      value: detail.escalationReason ?? "Belum diisi",
                    },
                  ]
                : []),
            ]}
          />

          <DrawerSection title="Bukti">
            {detail.evidence.length === 0 && !detail.evidenceText ? (
              <p className="text-[11.5px] text-ink-muted">
                Belum ada bukti terunggah.
              </p>
            ) : (
              <div className="space-y-2">
                {detail.evidenceText ? (
                  <p className="border-l-2 border-copper/50 pl-3 text-[11.5px] leading-relaxed text-ink-soft">
                    {detail.evidenceText}
                  </p>
                ) : null}
                <ul className="divide-y divide-ink/10 border-y border-ink/10">
                  {detail.evidence.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center gap-2.5 py-2.5"
                    >
                      {file.kind === "audio" || file.kind === "video" ? (
                        <FileAudio
                          className="size-3.5 shrink-0 text-copper-dark"
                          aria-hidden="true"
                        />
                      ) : (
                        <FileText
                          className="size-3.5 shrink-0 text-copper-dark"
                          aria-hidden="true"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[11.5px]">
                        {file.filename}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DrawerSection>

          <DrawerSection title="Rubrik">
            <ul className="space-y-2.5">
              {detail.rubric.map((item, index) => (
                <li
                  key={item.criterion}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-[11.5px] font-medium text-ink">
                      {item.criterion}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-ink-muted">
                      Bobot {item.weight}%
                    </p>
                  </div>
                  {canGrade ? (
                    <Input
                      value={String(rubric[index]?.score ?? "")}
                      onChange={(event) => updateScore(index, event.target.value)}
                      inputMode="numeric"
                      aria-label={`Skor ${item.criterion}`}
                      className="h-9 w-20 text-right text-[12px]"
                    />
                  ) : (
                    <span className="font-heading text-base text-ink">
                      {item.score ?? "Belum dinilai"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </DrawerSection>

          {detail.history.length || detail.overrideReason ? (
            <DrawerSection title="Riwayat penilaian">
              {detail.overrideReason ? (
                <div className="mb-3 border border-ink/15 bg-panel/30 p-3">
                  <p className="text-[11px] font-semibold text-ink">
                    Override: {detail.overrideReason}
                  </p>
                  <p className="mt-1 text-[9.5px] text-ink-muted">
                    Peninjau kedua:{" "}
                    {detail.secondReviewerName ?? "Belum diisi"}
                  </p>
                </div>
              ) : null}
              <ul className="divide-y divide-ink/10 border-y border-ink/10">
                {detail.history.map((event) => (
                  <li key={event.id} className="py-2.5">
                    <p className="text-[11px] font-semibold text-ink">
                      {event.kind} · {event.scoreBefore ?? "Belum ada"} →{" "}
                      {event.scoreAfter ?? "Belum ada"}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-ink-muted">
                      {formatWorkspaceDateTime(iso(event.createdAt))}
                      {event.reason ? ` · ${event.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </DrawerSection>
          ) : null}

          {canGrade ? (
            <DrawerSection title="Keputusan pengajar">
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="task-feedback">Catatan untuk peserta</Label>
                  <Textarea
                    id="task-feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    className="mt-1.5 min-h-24 text-[12px]"
                    placeholder="Tulis catatan spesifik pada bagian karya…"
                  />
                </div>
                <p className="text-[10px] leading-relaxed text-ink-muted">
                  Setiap kriteria rubrik wajib diisi. Persetujuan menerbitkan
                  satu sertifikat platform.
                </p>
              </div>
            </DrawerSection>
          ) : canSubmit ? (
            <DrawerSection title="Catatan proses">
              <Label htmlFor="task-draft">Draf jawaban</Label>
              <Textarea
                id="task-draft"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="mt-1.5 min-h-28 text-[12px]"
                placeholder="Tuliskan langkah, bahan, dan hal yang ingin ditanyakan…"
              />
              <p className="mt-1.5 text-[9.5px] text-ink-muted">
                Draf disimpan ke Convex dan hanya terlihat olehmu.
              </p>
            </DrawerSection>
          ) : null}

          {canEscalate ? (
            <DrawerSection title="Eskalasi pengelola">
              <Label htmlFor="escalation-reason">Alasan eskalasi</Label>
              <Textarea
                id="escalation-reason"
                value={escalationReason}
                onChange={(event) => setEscalationReason(event.target.value)}
                className="mt-1.5 min-h-20 text-[12px]"
                placeholder="Alasan yang dapat ditinjau pengelola."
              />
            </DrawerSection>
          ) : null}
        </>
      ) : null}
      {detail ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/15 pt-4">
          {canGrade ? (
            <>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => onDecision("approve")}
              >
                Setujui
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => onDecision("revision")}
              >
                Minta revisi
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => onDecision("reject")}
              >
                Tolak
              </Button>
            </>
          ) : null}
          {canSubmit ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={onSave}
              >
                Simpan draf
              </Button>
              <Button size="sm" disabled={saving} onClick={onSubmit}>
                Kirim tugas
              </Button>
            </>
          ) : null}
          {canEscalate ? (
            <Button
              size="sm"
              variant="outline"
              disabled={saving || escalationReason.trim().length < 8}
              onClick={onEscalate}
            >
              Eskalasi
            </Button>
          ) : null}
        </div>
      ) : null}
    </DetailDrawer>
  )
}
