"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Check,
  FileAudio,
  FileText,
  RotateCcw,
  Send,
  Star,
  Upload,
} from "lucide-react"
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
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { submissions } from "@/lib/workspace/mock-data"
import type { Submission } from "@/lib/workspace/types"
import { formatWorkspaceDateTime } from "@/lib/workspace/format"

export function TaskBoard() {
  const { can } = useViewer()
  const [tab, setTab] = React.useState(
    can("submissions.grade") ? "queue" : "mine",
  )
  const [selected, setSelected] = React.useState<Submission | null>(null)

  const tabs = [
    can("submissions.submit") && { id: "mine", label: "Tugas saya", count: 2 },
    (can("submissions.grade") || can("submissions.escalate")) && {
      id: "queue",
      label: can("submissions.grade") ? "Antrean penilaian" : "Semua tugas",
      count: submissions.filter((item) => item.status !== "approved").length,
    },
    can("submissions.escalate") && {
      id: "escalation",
      label: "Eskalasi",
      count: 4,
    },
  ].filter(Boolean) as { id: string; label: string; count?: number }[]

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id

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
            ? "Periksa bukti, beri skor per rubrik, lalu putuskan lanjut atau revisi. Setiap keputusan tercatat."
            : can("submissions.escalate")
              ? "Pantau SLA lintas pengajar, reassign, dan buka sengketa tanpa menilai sendiri."
              : "Unggah foto, rekaman, atau catatan proses. Pengajar menilai dalam 3 hari kerja."
        }
        actions={
          can("submissions.submit") ? (
            <Button asChild variant="outline">
              <Link href="/ruang/belajar">Lihat rubrik jalur</Link>
            </Button>
          ) : (
            <Button
              onClick={() =>
                toast("Ekspor antrean", {
                  description: "CSV antrean penilaian disiapkan dengan tanda tangan unduhan.",
                })
              }
              variant="outline"
            >
              Ekspor antrean
            </Button>
          )
        }
      />

      <SegmentedTabs
        tabs={tabs}
        value={active ?? "mine"}
        onChange={setTab}
        ariaLabel="Pilih tampilan tugas"
      />

      {active === "mine" ? <StudentTasks onSelect={setSelected} /> : null}
      {active === "queue" ? (
        <GradingQueue onSelect={setSelected} />
      ) : null}
      {active === "escalation" ? (
        <EscalationQueue onSelect={setSelected} />
      ) : null}

      <TaskDrawer
        key={selected?.id ?? "empty"}
        submission={selected}
        onClose={() => setSelected(null)}
        canGrade={can("submissions.grade")}
        canSubmit={can("submissions.submit")}
        canEscalate={can("submissions.escalate")}
      />
    </div>
  )
}

function StudentTasks({ onSelect }: { onSelect: (row: Submission) => void }) {
  const mine = submissions.filter((item) => item.student === "Anisa Rahmawati")

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-7">
        {mine.map((item) => (
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
              Batas {formatWorkspaceDateTime(item.dueAt)} · {item.evidence.length} bukti
              terunggah
            </p>
            {item.score ? (
              <div className="mt-3 flex items-center gap-2 border-y border-ink/15 py-2.5">
                <Star className="size-4 text-copper-dark" aria-hidden="true" />
                <span className="font-heading text-2xl leading-none text-ink">
                  {item.score}
                </span>
                <span className="text-[10px] text-ink-muted">/ 100 · dinilai pengajar</span>
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
              {item.status === "revision" ? (
                <Button size="sm" variant="outline">
                  Unggah revisi
                </Button>
              ) : null}
              {item.status === "approved" ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href="/ruang/kredensial">Lihat kredensial</Link>
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-4 lg:col-span-5">
        <Panel eyebrow="Rubrik" title="Yang dinilai">
          <ol className="divide-y divide-ink/10">
            {[
              ["Ketepatan proses", "40%", "Urutan langkah, bahan, dan keselamatan"],
              ["Kualitas garis canting", "30%", "Tekanan, kerapatan, dan kebersihan tepi"],
              ["Catatan proses", "30%", "Foto bertanggal dan alasan teknis"],
            ].map(([label, weight, note]) => (
              <li key={label} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11.5px] font-semibold text-ink">{label}</p>
                  <span className="text-[10px] font-bold tabular-nums text-copper-dark">
                    {weight}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">{note}</p>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel eyebrow="Umpan balik" title="Dari pengajar">
          <blockquote className="border-l-2 border-copper pl-3 text-[11.5px] leading-relaxed text-ink-soft">
            “Garis tepi sudah rata. Jangan buru-buru masuk pewarnaan; pastikan malam
            benar-benar kering.”
            <footer className="mt-2 text-[9px] font-bold uppercase tracking-[0.07em] text-ink-muted">
              Bambang Hardjono · 9 Nov
            </footer>
          </blockquote>
          <div className="mt-3 flex items-center gap-2 border-t border-ink/15 pt-3">
            <FileAudio className="size-4 text-copper-dark" aria-hidden="true" />
            <span className="text-[10.5px] text-ink-muted">
              Catatan suara 1.18 · transkrip tersedia
            </span>
          </div>
        </Panel>
      </div>
    </div>
  )
}

const queueFilters = [
  {
    id: "status",
    label: "Status",
    options: [
      { value: "all", label: "Semua" },
      { value: "submitted", label: "Menunggu" },
      { value: "under_review", label: "Dinilai" },
      { value: "revision", label: "Revisi" },
    ],
  },
  {
    id: "sla",
    label: "SLA",
    options: [
      { value: "all", label: "Semua" },
      { value: "late", label: "Lewat SLA" },
    ],
  },
]

function GradingQueue({ onSelect }: { onSelect: (row: Submission) => void }) {
  const { can } = useViewer()
  const rows = can("operate")
    ? submissions
    : submissions.filter((item) => item.teacher === "Bambang Hardjono")

  return (
    <Panel eyebrow="Antrean" title="Tugas menunggu keputusan" bodyClassName="p-0">
      <DataTable
        rows={rows}
        columns={queueColumns(onSelect)}
        caption="Antrean tugas dengan siswa, jalur, umur, SLA, dan status"
        searchPlaceholder="Cari siswa, kode, atau jalur"
        getSearchText={(row) =>
          `${row.student} ${row.code} ${row.pathTitle} ${row.statusLabel}`
        }
        filters={queueFilters}
        filterRow={(row, values) => {
          const statusOk =
            !values.status || values.status === "all" || row.status === values.status
          const slaOk =
            values.sla !== "late" || row.ageHours > row.slaHours
          return statusOk && slaOk
        }}
        minWidth={820}
      />
    </Panel>
  )
}

function queueColumns(onSelect: (row: Submission) => void): Column<Submission>[] {
  return [
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
          <p className="text-[11.5px] font-medium">{row.student}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.cohort}</p>
        </div>
      ),
    },
    {
      id: "teacher",
      header: "Pengajar",
      cell: (row) => <span className="text-[11px] text-ink-soft">{row.teacher}</span>,
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
          Nilai
        </Button>
      ),
    },
  ]
}

function EscalationQueue({ onSelect }: { onSelect: (row: Submission) => void }) {
  const rows = submissions.filter((item) => item.ageHours > item.slaHours)

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel
        className="lg:col-span-8"
        eyebrow="Eskalasi"
        title="Melewati SLA"
        bodyClassName="p-0"
      >
        <DataTable
          rows={rows}
          columns={queueColumns(onSelect)}
          caption="Tugas yang melewati SLA"
          searchPlaceholder="Cari tugas atau pengajar"
          getSearchText={(row) => `${row.student} ${row.teacher} ${row.code}`}
          filters={[
            {
              id: "path",
              label: "Jalur",
              options: [
                { value: "all", label: "Semua" },
                { value: "Batik Tulis Soga", label: "Batik" },
                { value: "Seni Pembawa Acara Tradisi Jawa", label: "Pranatacara" },
              ],
            },
          ]}
          filterRow={(row, values) =>
            !values.path || values.path === "all" || row.pathTitle === values.path
          }
          minWidth={780}
        />
      </Panel>
      <Panel className="lg:col-span-4" eyebrow="Pedoman" title="Urutan tindakan">
        <ol className="space-y-3">
          {[
            ["01", "Kirim pengingat", "Satu pengingat otomatis setiap 24 jam."],
            ["02", "Reassign", "Pindahkan ke pengajar lain dengan alasan."],
            ["03", "Eskalasi", "Buka catatan untuk pengelola, tanpa menilai sendiri."],
            ["04", "Sengketa", "Jika peserta meminta peninjauan, buka alur sengketa."],
          ].map(([code, title, note]) => (
            <li key={code} className="flex gap-2.5">
              <span className="font-heading text-sm text-copper-dark">{code}</span>
              <div>
                <p className="text-[11.5px] font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-ink-muted">{note}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 border-t border-ink/15 pt-3 text-[10px] leading-relaxed text-ink-muted">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-copper-dark" aria-hidden="true" />
          Pengelola tidak menilai. Perubahan skor memerlukan alasan dan peninjau kedua.
        </p>
      </Panel>
    </div>
  )
}

function TaskDrawer({
  submission,
  onClose,
  canGrade,
  canSubmit,
  canEscalate,
}: {
  submission: Submission | null
  onClose: () => void
  canGrade: boolean
  canSubmit: boolean
  canEscalate: boolean
}) {
  const [score, setScore] = React.useState(
    submission?.score ? String(submission.score) : "",
  )
  const [feedback, setFeedback] = React.useState(submission?.feedback ?? "")
  const [draft, setDraft] = React.useState("")

  return (
    <DetailDrawer
      open={Boolean(submission)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      eyebrow="Tugas"
      title={submission?.code ?? ""}
      stamp={submission?.statusLabel}
      tone={submission?.tone}
      description={submission ? `${submission.student} · ${submission.taskTitle}` : undefined}
      footer={
        submission ? (
          <div className="flex flex-wrap gap-2">
            {canGrade ? (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    toast("Penilaian disimpan", {
                      description: `${submission.code} disetujui. Sertifikat akan terbit otomatis.`,
                    })
                    onClose()
                  }}
                >
                  <Check aria-hidden="true" />
                  Setujui
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast("Revisi diminta", {
                      description: "Catatan dikirim ke peserta. Tenggat baru 7 hari.",
                    })
                    onClose()
                  }}
                >
                  <RotateCcw aria-hidden="true" />
                  Minta revisi
                </Button>
              </>
            ) : null}
            {canSubmit ? (
              <Button
                size="sm"
                onClick={() =>
                  toast("Tugas dikirim", {
                    description: "Draf tersimpan dan masuk antrean pengajar.",
                  })
                }
              >
                <Send aria-hidden="true" />
                Kirim tugas
              </Button>
            ) : null}
            {canEscalate ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  toast("Eskalasi dibuat", {
                    description: "Pengelola menerima catatan tanpa akses menilai.",
                  })
                }
              >
                Eskalasi
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {submission ? (
        <>
          <DetailGrid
            items={[
              { label: "Peserta", value: submission.student },
              { label: "Kohort", value: submission.cohort },
              { label: "Jalur", value: submission.pathTitle },
              { label: "Pengajar", value: submission.teacher },
              { label: "Dikirim", value: formatWorkspaceDateTime(submission.submittedAt) },
              { label: "Batas", value: formatWorkspaceDateTime(submission.dueAt) },
              { label: "Umur", value: `${submission.ageHours} jam` },
              { label: "Revisi", value: `${submission.revisionCount} kali` },
            ]}
          />

          <DrawerSection title="Bukti">
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {submission.evidence.length ? (
                submission.evidence.map((file) => (
                  <li key={file} className="flex items-center gap-2.5 py-2.5">
                    {file.endsWith(".m4a") || file.endsWith(".mp4") ? (
                      <FileAudio className="size-3.5 shrink-0 text-copper-dark" aria-hidden="true" />
                    ) : (
                      <FileText className="size-3.5 shrink-0 text-copper-dark" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[11.5px]">{file}</span>
                    <Button size="sm" variant="ghost">
                      Lihat
                    </Button>
                  </li>
                ))
              ) : (
                <li className="py-3 text-[11.5px] text-ink-muted">
                  Belum ada bukti terunggah.
                </li>
              )}
            </ul>
            {canSubmit ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() =>
                  toast("Unggahan bukti", {
                    description: "Berkas dipilih dan diunggah dengan aman.",
                  })
                }
              >
                <Upload aria-hidden="true" />
                Tambah bukti
              </Button>
            ) : null}
          </DrawerSection>

          <DrawerSection title="Rubrik">
            <ul className="space-y-2.5">
              {submission.rubric.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11.5px] font-medium text-ink">{item.label}</p>
                    <p className="mt-0.5 text-[9.5px] text-ink-muted">Bobot {item.weight}%</p>
                  </div>
                  <span className="font-heading text-base text-ink">
                    {item.score ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </DrawerSection>

          {canGrade ? (
            <DrawerSection title="Keputusan pengajar">
              <div className="grid gap-3">
                <div className="grid grid-cols-[100px_1fr] items-end gap-3">
                  <div>
                    <Label htmlFor="score">Skor akhir</Label>
                    <Input
                      id="score"
                      value={score}
                      onChange={(event) => setScore(event.target.value)}
                      inputMode="numeric"
                      className="mt-1.5"
                      placeholder="0–100"
                    />
                  </div>
                  <p className="pb-2 text-[10px] leading-relaxed text-ink-muted">
                    Skor per rubrik dan catatan wajib sebelum menyetujui.
                  </p>
                </div>
                <div>
                  <Label htmlFor="feedback">Catatan untuk peserta</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    className="mt-1.5 min-h-24 text-[12px]"
                    placeholder="Tulis catatan spesifik pada bagian karya…"
                  />
                </div>
              </div>
            </DrawerSection>
          ) : canSubmit ? (
            <DrawerSection title="Catatan proses">
              <Label htmlFor="draft">Draf jawaban</Label>
              <Textarea
                id="draft"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="mt-1.5 min-h-28 text-[12px]"
                placeholder="Tuliskan langkah, bahan, dan hal yang ingin ditanyakan…"
              />
              <p className="mt-1.5 text-[9.5px] text-ink-muted">
                Draf tersimpan otomatis di perangkat ini.
              </p>
            </DrawerSection>
          ) : null}
        </>
      ) : null}
    </DetailDrawer>
  )
}
