"use client"

import * as React from "react"
import { CheckCircle2, Clock3, LockKeyhole, Send, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useMutation, useQuery } from "convex/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type {
  SupportPriority,
  SupportStatus,
  SupportTicketSummary,
} from "@/lib/support/types"
import type { StatusTone } from "@/lib/workspace/types"
import { cn } from "cn"

const priorities: Record<SupportPriority, { label: string; tone: StatusTone }> = {
  low: { label: "Rendah", tone: "muted" },
  normal: { label: "Normal", tone: "progress" },
  high: { label: "Tinggi", tone: "wait" },
  urgent: { label: "Mendesak", tone: "danger" },
}

const statusTone: Record<SupportStatus, StatusTone> = {
  open: "open",
  pending: "wait",
  resolved: "done",
  closed: "muted",
}

const statusLabel: Record<SupportStatus, string> = {
  open: "Terbuka",
  pending: "Menunggu",
  resolved: "Selesai",
  closed: "Ditutup",
}

function ageLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam`
  return `${Math.floor(hours / 24)} hari`
}

function dateTimeLabel(value: number | null): string {
  if (value === null) return "—"
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export function SupportInboxLive() {
  const { can } = useViewer()
  const admin = can("support.manage")
  const [tab, setTab] = React.useState("open")
  const [selected, setSelected] = React.useState<Id<"supportTickets"> | null>(null)
  const [search, setSearch] = React.useState("")
  const [reply, setReply] = React.useState("")
  const [internal, setInternal] = React.useState(false)
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")
  const [assignee, setAssignee] = React.useState("")
  const [reason, setReason] = React.useState("")

  const tickets = useQuery(
    api.support.list,
    admin ? { view: "inbox" } : { view: "mine" },
  )
  const queue = useQuery(api.support.queueSummary, admin ? {} : "skip")
  const detail = useQuery(
    api.support.get,
    selected ? { ticketId: selected } : "skip",
  )
  const canned = useQuery(
    api.support.listCannedReplies,
    admin ? {} : "skip",
  )
  const team = useQuery(api.people.list, admin ? { role: "admin" } : "skip")
  const createTicket = useMutation(api.support.create)
  const sendReply = useMutation(api.support.reply)
  const assignTicket = useMutation(api.support.assign)
  const setPriority = useMutation(api.support.setPriority)
  const escalate = useMutation(api.support.escalate)
  const resolveTicket = useMutation(api.support.resolve)
  const closeTicket = useMutation(api.support.close)
  const reopenTicket = useMutation(api.support.reopen)

  const filtered = (tickets ?? []).filter((ticket) => {
    const statusOk =
      tab === "all"
        ? true
        : tab === "open"
          ? ticket.status === "open"
          : tab === "pending"
            ? ticket.status === "pending"
            : tab === "done"
              ? ["resolved", "closed"].includes(ticket.status)
              : true
    const searchOk = search
      ? `${ticket.subject} ${ticket.requesterName} ${ticket.code}`
          .toLowerCase()
          .includes(search.toLowerCase())
      : true
    return statusOk && searchOk
  })

  async function run(action: () => Promise<unknown>, message: string) {
    try {
      await action()
      toast(message)
    } catch (error) {
      toast("Tindakan gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dukungan"
        title={admin ? "Kotak masuk dukungan." : "Kami duduk di bangku yang sama."}
        description={
          admin
            ? "Tiket dengan prioritas, pemilik, SLA respons pertama, dan tautan ke akun, pesanan, pembayaran, atau sertifikat. Catatan internal terpisah dari balasan pengguna."
            : "Buat tiket untuk pembayaran, jadwal, sertifikat, atau panggilan. Balasan tim muncul di sini dan tidak menyalin isi percakapan."
        }
        meta={
          admin && queue ? (
            <span className="text-[10px] text-ink-muted">
              {queue.open} terbuka · {queue.breached} lewat SLA · {queue.unassigned} tanpa pemilik
            </span>
          ) : undefined
        }
      />

      {admin ? (
        <Panel eyebrow="Tiket baru" title="Buat tiket dari akun ini">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor="ticket-subject">Subjek</Label>
              <Input
                id="ticket-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ticket-body">Pesan pertama</Label>
              <Input
                id="ticket-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              className="mt-6"
              disabled={subject.trim().length < 4}
              onClick={() =>
                void run(async () => {
                  const result = await createTicket({
                    subject,
                    body: body || undefined,
                  })
                  setSelected(result.ticketId)
                  setSubject("")
                  setBody("")
                }, "Tiket dibuat")
              }
            >
              Buat tiket
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel eyebrow="Tiket baru" title="Ceritakan yang terjadi">
          <div className="grid gap-3">
            <div>
              <Label htmlFor="user-ticket-subject">Subjek</Label>
              <Input
                id="user-ticket-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="user-ticket-body">Pesan</Label>
              <Textarea
                id="user-ticket-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="mt-1.5 min-h-24"
              />
            </div>
            <Button
              size="sm"
              disabled={subject.trim().length < 4 || body.trim().length < 4}
              onClick={() =>
                void run(async () => {
                  const result = await createTicket({ subject, body })
                  setSelected(result.ticketId)
                  setSubject("")
                  setBody("")
                }, "Tiket dibuat")
              }
            >
              Kirim tiket
            </Button>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel eyebrow="Antrean" title="Tiket" bodyClassName="p-0">
          <div className="border-b border-ink/15 p-2.5">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari subjek, kode, pengguna"
              aria-label="Cari tiket"
              className="h-11 bg-paper text-[12px] sm:h-9"
            />
          </div>
          <div className="px-2.5 pt-2.5">
            <SegmentedTabs
              tabs={[
                { id: "open", label: "Terbuka" },
                { id: "pending", label: "Menunggu" },
                { id: "done", label: "Selesai" },
                { id: "all", label: "Semua" },
              ]}
              value={tab}
              onChange={setTab}
              ariaLabel="Saring status tiket"
            />
          </div>
          <ul className="max-h-[60vh] divide-y divide-ink/10 overflow-y-auto">
            {filtered.map((ticket: SupportTicketSummary) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => setSelected(ticket.id as Id<"supportTickets">)}
                  aria-pressed={selected === ticket.id}
                  className={cn(
                    "w-full px-3 py-3 text-left transition-colors",
                    selected === ticket.id ? "bg-panel/60" : "hover:bg-panel/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[11px] font-semibold leading-snug text-ink">
                      {ticket.subject}
                    </p>
                    <StatusStamp
                      label={priorities[ticket.priority].label}
                      tone={priorities[ticket.priority].tone}
                    />
                  </div>
                  <p className="mt-1 text-[9.5px] text-ink-muted">
                    {ticket.code} · {ticket.requesterName} · {ageLabel(ticket.ageMinutes)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-ink-muted">
                    {ticket.lastMessagePreview ?? "Belum ada pesan."}
                  </p>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-[11px] text-ink-muted">
                Tidak ada tiket pada tampilan ini.
              </li>
            ) : null}
          </ul>
        </Panel>

        {detail ? (
          <section
            aria-label={`Tiket ${detail.code}`}
            className="flex min-h-[65vh] flex-col border border-ink/20 bg-paper-2"
          >
            <header className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/15 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                    {detail.code} · {detail.channel}
                  </p>
                  <StatusStamp
                    label={statusLabel[detail.status]}
                    tone={statusTone[detail.status]}
                  />
                  <StatusStamp
                    label={priorities[detail.priority].label}
                    tone={priorities[detail.priority].tone}
                  />
                </div>
                <h2 className="mt-1 font-heading text-[1.25rem] leading-tight text-ink">
                  {detail.subject}
                </h2>
                <p className="mt-1 text-[10px] text-ink-muted">
                  {detail.requesterName} · pemilik {detail.assigneeName ?? "belum ada"}
                  {detail.escalatedTo ? ` · eskalasi ${detail.escalatedTo}` : ""}
                </p>
                <p className="mt-1 text-[10px] text-ink-muted">
                  Ditugaskan oleh {detail.assignedByName ?? "—"} · Diselesaikan oleh{" "}
                  {detail.resolvedByName ?? "—"} · Respons terakhir{" "}
                  {dateTimeLabel(detail.lastResponseAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detail.status === "resolved" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(
                        () =>
                          closeTicket({
                            ticketId: detail.id as Id<"supportTickets">,
                            reason: "Pengguna mengonfirmasi penyelesaian.",
                          }),
                        "Tiket ditutup",
                      )
                    }
                  >
                    Tutup
                  </Button>
                ) : null}
                {detail.status === "closed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(
                        () =>
                          reopenTicket({
                            ticketId: detail.id as Id<"supportTickets">,
                            reason: "Dibuka kembali dari kotak masuk.",
                          }),
                        "Tiket dibuka kembali",
                      )
                    }
                  >
                    Buka kembali
                  </Button>
                ) : null}
              </div>
            </header>

            <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-panel/25 px-4 py-2 text-[9.5px] text-ink-muted">
              <Clock3 className="size-3" aria-hidden="true" />
              {detail.firstResponseAt
                ? `Respons pertama ${detail.firstResponseMinutes} menit`
                : detail.slaBreached
                  ? "Lewat SLA respons pertama"
                  : `SLA ${detail.slaMinutes} menit`}
              {detail.links.length > 0 ? (
                <span className="ml-auto">
                  {detail.links.map((link) => `${link.type}:${link.id}`).join(" · ")}
                </span>
              ) : null}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {detail.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[88%] border px-3 py-2.5",
                    message.kind === "internal"
                      ? "border-brass/50 bg-brass/10"
                      : "border-ink/20 bg-paper",
                  )}
                >
                  <p className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    {message.kind === "internal" ? (
                      <LockKeyhole className="size-2.5" aria-hidden="true" />
                    ) : null}
                    {message.authorName} ·{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      timeZone: "Asia/Jakarta",
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(message.createdAt))}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                    {message.body}
                  </p>
                </div>
              ))}
            </div>

            {admin ? (
              <div className="border-t border-ink/15 bg-paper p-3">
                <div className="flex flex-wrap items-center gap-2 pb-2">
                  <button
                    type="button"
                    aria-pressed={!internal}
                    onClick={() => setInternal(false)}
                    className={cn(
                      "min-h-11 border px-2 text-[9px] font-bold uppercase tracking-[0.05em] sm:min-h-9",
                      !internal ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink-muted",
                    )}
                  >
                    Balasan pengguna
                  </button>
                  <button
                    type="button"
                    aria-pressed={internal}
                    onClick={() => setInternal(true)}
                    className={cn(
                      "min-h-11 border px-2 text-[9px] font-bold uppercase tracking-[0.05em] sm:min-h-9",
                      internal ? "border-brass bg-brass/20 text-ink" : "border-ink/20 text-ink-muted",
                    )}
                  >
                    Catatan internal
                  </button>
                  <select
                    aria-label="Balasan siap pakai"
                    onChange={(event) => {
                      if (event.target.value) setReply(event.target.value)
                    }}
                    className="ml-auto h-11 border border-ink/20 bg-paper-2 px-2 text-[10px] text-ink-soft sm:h-9"
                    defaultValue=""
                  >
                    <option value="">Balasan siap pakai</option>
                    {(canned ?? []).map((item) => (
                      <option key={item.id} value={item.body}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </div>
                <Textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  className="min-h-20 text-[12px]"
                  placeholder={
                    internal
                      ? "Tulis catatan yang hanya terlihat tim dukungan…"
                      : "Tulis balasan untuk pengguna…"
                  }
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[9px] text-ink-muted">
                    {internal
                      ? "Catatan internal tidak dikirim ke pengguna dan tidak menghitung respons pertama."
                      : "Balasan pengguna terlihat dan masuk notifikasi."}
                  </p>
                  <Button
                    size="sm"
                    disabled={reply.trim().length < 2 || detail.status === "closed"}
                    onClick={() =>
                      void run(async () => {
                        await sendReply({
                          ticketId: detail.id as Id<"supportTickets">,
                          body: reply,
                          internal,
                        })
                        setReply("")
                      }, internal ? "Catatan internal disimpan" : "Balasan terkirim")
                    }
                  >
                    <Send aria-hidden="true" />
                    {internal ? "Simpan catatan" : "Kirim balasan"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t border-ink/15 bg-paper p-3">
                <Textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  className="min-h-20 text-[12px]"
                  placeholder="Tulis balasan untuk tim dukungan…"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={reply.trim().length < 2 || detail.status === "closed"}
                  onClick={() =>
                    void run(async () => {
                      await sendReply({
                        ticketId: detail.id as Id<"supportTickets">,
                        body: reply,
                      })
                      setReply("")
                    }, "Balasan terkirim")
                  }
                >
                  <Send aria-hidden="true" />
                  Kirim balasan
                </Button>
                {detail.status === "closed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() =>
                      void run(
                        () =>
                          reopenTicket({
                            ticketId: detail.id as Id<"supportTickets">,
                            reason: "Masalah muncul kembali setelah tiket ditutup.",
                          }),
                        "Tiket dibuka kembali",
                      )
                    }
                  >
                    Buka kembali
                  </Button>
                ) : null}
              </div>
            )}

            {admin ? (
              <div className="grid gap-2 border-t border-ink/15 bg-panel/25 p-3 md:grid-cols-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1">
                    <Label htmlFor="ticket-assignee">Pemilik</Label>
                    <select
                      id="ticket-assignee"
                      value={assignee}
                      onChange={(event) => setAssignee(event.target.value)}
                      className="mt-1 flex h-9 w-full border border-ink/20 bg-paper-2 px-2 text-[12px]"
                    >
                      <option value="">Pilih pengelola</option>
                      {(team ?? []).map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!assignee}
                    onClick={() =>
                      void run(
                        () =>
                          assignTicket({
                            ticketId: detail.id as Id<"supportTickets">,
                            assigneeId: assignee as Id<"users">,
                            reason: "Penugasan dari kotak masuk dukungan.",
                          }),
                        "Tiket ditugaskan",
                      )
                    }
                  >
                    Tugaskan
                  </Button>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-32 flex-1">
                    <Label htmlFor="ticket-reason">Alasan tindakan</Label>
                    <Input
                      id="ticket-reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className="mt-1 h-9"
                      placeholder="Alasan untuk audit"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(
                        () =>
                          setPriority({
                            ticketId: detail.id as Id<"supportTickets">,
                            priority: detail.priority === "urgent" ? "high" : "urgent",
                            reason: reason || "Prioritas disesuaikan dari kotak masuk.",
                          }),
                        "Prioritas diperbarui",
                      )
                    }
                  >
                    Naikkan prioritas
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(
                        () =>
                          escalate({
                            ticketId: detail.id as Id<"supportTickets">,
                            to: "payment",
                            reason: reason || "Eskalasi ke tim pembayaran.",
                          }),
                        "Tiket dieskalasi",
                      )
                    }
                  >
                    Eskalasi
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      void run(
                        () =>
                          resolveTicket({
                            ticketId: detail.id as Id<"supportTickets">,
                            resolution:
                              reason || "Solusi sudah disampaikan kepada pengguna.",
                          }),
                        "Tiket diselesaikan",
                      )
                    }
                  >
                    <CheckCircle2 aria-hidden="true" />
                    Selesai
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : selected && detail === null ? (
          <EmptyState
            title="Tiket tidak ditemukan"
            description="Tiket ini tidak tersedia untuk akun ini, atau sudah dipindahkan."
            className="min-h-[40vh]"
          />
        ) : (
          <EmptyState
            title="Pilih tiket"
            description="Buka tiket untuk membaca pesan pengguna dan catatan internal."
            className="min-h-[40vh]"
          />
        )}
      </div>

      <Panel eyebrow="Kebijakan" title="Akses dan retensi">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Bergabung dengan persetujuan", "Dukungan hanya masuk percakapan atau panggilan setelah pengguna setuju."],
            ["Konten sensitif", "Membaca pesan atau rekaman memerlukan alasan dan tercatat."],
            ["Tanpa salinan ganda", "Tiket dari percakapan menautkan percakapan; isi pesan tidak disalin ke catatan."],
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
