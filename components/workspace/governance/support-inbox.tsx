"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, Send, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import {
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_PRIORITY_TONES,
} from "@/lib/support/options"
import { supportCannedReplies, supportTickets } from "@/lib/workspace/mock-data"
import type { StatusTone, SupportTicket } from "@/lib/workspace/types"
import { cn } from "cn"

const priorities: Record<
  SupportTicket["priority"],
  { label: string; tone: StatusTone }
> = {
  low: {
    label: SUPPORT_PRIORITY_LABELS.low,
    tone: SUPPORT_PRIORITY_TONES.low,
  },
  normal: {
    label: SUPPORT_PRIORITY_LABELS.normal,
    tone: SUPPORT_PRIORITY_TONES.normal,
  },
  high: {
    label: SUPPORT_PRIORITY_LABELS.high,
    tone: SUPPORT_PRIORITY_TONES.high,
  },
  urgent: {
    label: SUPPORT_PRIORITY_LABELS.urgent,
    tone: SUPPORT_PRIORITY_TONES.urgent,
  },
}

export function SupportInbox() {
  const { can, profile } = useViewer()
  const [tickets, setTickets] = React.useState(supportTickets)
  const [tab, setTab] = React.useState("open")
  const [activeId, setActiveId] = React.useState(supportTickets[0]?.id ?? "")
  const [reply, setReply] = React.useState("")
  const [internal, setInternal] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const active = tickets.find((ticket) => ticket.id === activeId) ?? tickets[0]
  const filtered = tickets.filter((ticket) => {
    const statusOk =
      tab === "all"
        ? true
        : tab === "open"
          ? ticket.status === "open"
          : tab === "pending"
            ? ticket.status === "pending"
            : ["resolved", "closed"].includes(ticket.status)
    const searchOk = `${ticket.subject} ${ticket.requester} ${ticket.linked}`
      .toLowerCase()
      .includes(search.toLowerCase())
    return statusOk && searchOk
  })

  function sendReply() {
    if (!reply.trim() || !active) return
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === active.id
          ? {
              ...ticket,
              status: internal ? ticket.status : "pending",
              messages: [
                ...ticket.messages,
                {
                  id: `tm-local-${ticket.messages.length + 1}`,
                  from: internal ? "Catatan internal" : profile.user.name,
                  internal,
                  time: "Baru saja",
                  body: reply.trim(),
                },
              ],
            }
          : ticket,
      ),
    )
    setReply("")
    toast(internal ? "Catatan internal disimpan" : "Balasan terkirim", {
      description: internal
        ? "Catatan hanya terlihat oleh tim dukungan."
        : "Pengguna menerima balasan di dalam aplikasi dan email.",
    })
  }

  if (!can("support.manage")) {
    return <UserSupport />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dukungan"
        title="Kotak masuk dukungan."
        description="Tiket dengan prioritas, pemilik, SLA, dan tautan ke akun, pesanan, pembayaran, atau sertifikat. Balasan pengguna dan catatan internal dipisahkan."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast("Ringkasan antrean", {
                  description: "3 tiket perlu respons, 1 melewati SLA.",
                })
              }
            >
              Cek SLA
            </Button>
            <Button
              onClick={() =>
                toast("Tiket baru", {
                  description: "Formulir tiket memerlukan akun atau kontak tamu.",
                })
              }
            >
              Buat tiket
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel eyebrow="Antrean" title="Tiket" bodyClassName="p-0">
          <div className="border-b border-ink/15 p-2.5">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari subjek, pengguna, pesanan"
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
            {filtered.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(ticket.id)}
                  aria-pressed={activeId === ticket.id}
                  className={cn(
                    "w-full px-3 py-3 text-left transition-colors",
                    activeId === ticket.id ? "bg-panel/60" : "hover:bg-panel/30",
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
                    {ticket.requester} · {ticket.age}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-ink-muted">
                    {ticket.excerpt}
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

        {active ? (
          <section
            aria-label={`Tiket ${active.id}`}
            className="flex min-h-[65vh] flex-col border border-ink/20 bg-paper-2"
          >
            <header className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/15 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                    {active.id} · {active.channel}
                  </p>
                  <StatusStamp label={active.statusLabel} tone={active.tone} />
                </div>
                <h2 className="mt-1 font-heading text-[1.25rem] leading-tight text-ink">
                  {active.subject}
                </h2>
                <p className="mt-1 text-[10px] text-ink-muted">
                  {active.requester} · {active.requesterRole} · pemilik {active.assignee}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast("Tiket dieskalasi", {
                      description: "Tim pembayaran menerima tiket dengan konteks lengkap.",
                    })
                  }
                >
                  Eskalasi
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    toast("Tiket ditandai selesai", {
                      description: "Pengguna diminta mengonfirmasi sebelum ditutup.",
                    })
                  }
                >
                  <CheckCircle2 aria-hidden="true" />
                  Selesai
                </Button>
              </div>
            </header>

            <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-panel/25 px-4 py-2 text-[9.5px] text-ink-muted">
              <Clock3 className="size-3" aria-hidden="true" />
              Respons pertama 22 menit
              <Link href="/ruang/pesanan" className="ml-auto inline-flex min-h-11 items-center gap-1 text-copper-dark hover:text-ink sm:min-h-8">
                {active.linked}
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {active.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[88%] border px-3 py-2.5",
                    message.internal
                      ? "border-brass/50 bg-brass/10"
                      : "border-ink/20 bg-paper",
                  )}
                >
                  <p className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                    {message.internal ? (
                      <LockKeyhole className="size-2.5" aria-hidden="true" />
                    ) : null}
                    {message.from} · {message.time}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                    {message.body}
                  </p>
                </div>
              ))}
            </div>

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
                  {supportCannedReplies.map((item) => (
                    <option key={item.id} value={item.body}>
                      {item.label}
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
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[9px] text-ink-muted">
                  {internal
                    ? "Catatan internal tidak dikirim ke pengguna."
                    : "Balasan masuk ke email dan notifikasi dalam aplikasi."}
                </p>
                <Button size="sm" onClick={sendReply} disabled={!reply.trim()}>
                  <Send aria-hidden="true" />
                  {internal ? "Simpan catatan" : "Kirim balasan"}
                </Button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <Panel eyebrow="Kebijakan" title="Akses dan retensi">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Bergabung dengan persetujuan", "Dukungan hanya masuk percakapan atau panggilan setelah pengguna setuju."],
            ["Konten sensitif", "Membaca pesan atau rekaman memerlukan alasan dan tercatat."],
            ["Retensi", "Tiket ditutup setelah 14 hari tanpa balasan; audit tetap tersimpan."],
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

function UserSupport() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dukungan"
        title="Kami duduk di bangku yang sama."
        description="Tanyakan soal pembayaran, jadwal, sertifikat, atau panggilan. Tim dukungan menjawab pada jam kerja, 08.00–20.00 WIB."
        actions={
          <Button
            onClick={() =>
              toast("Tiket dibuat", {
                description: "Tim dukungan menerima tiket dan membalas lewat email.",
              })
            }
          >
            Buat tiket
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Tiket saya" title="Belum ada tiket terbuka" className="lg:col-span-2">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            Tidak ada masalah yang sedang ditangani. Jika ada pembayaran yang belum
            cocok, sertifikat yang belum terbit, atau panggilan yang gagal, buat
            tiket dan sertakan kode pesanan.
          </p>
          <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href="/ruang/pesanan">Cek pesanan</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href="/ruang/kredensial">Cek sertifikat</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href="/ruang/pesan">Buka percakapan</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="justify-start">
              <Link href="/ruang/pengaturan">Preferensi bantuan</Link>
            </Button>
          </div>
        </Panel>
        <Panel eyebrow="Jam kerja" title="Kapan kami siap">
          <dl className="space-y-2.5 text-[11px]">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Senin–Jumat</dt>
              <dd className="font-semibold">08.00–20.00</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Sabtu</dt>
              <dd className="font-semibold">09.00–15.00</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-muted">Minggu</dt>
              <dd className="text-ink-muted">Tutup</dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-ink/15 pt-2.5 text-[9.5px] leading-relaxed text-ink-muted">
            Rata-rata balasan pertama 22 menit pada jam kerja.
          </p>
        </Panel>
      </div>
    </div>
  )
}
