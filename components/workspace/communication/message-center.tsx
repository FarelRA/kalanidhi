"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  BellOff,
  FileText,
  Flag,
  ImagePlus,
  LockKeyhole,
  Mic,
  Phone,
  Play,
  Send,
  ShieldAlert,
  Video,
} from "lucide-react"
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
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { chatMessages, conversations } from "@/lib/workspace/mock-data"
import type { ChatMessage } from "@/lib/workspace/types"
import { cn } from "cn"

export function MessageCenter() {
  const { can } = useViewer()
  const [activeId, setActiveId] = React.useState("conv-anisa-bambang")
  const [messages, setMessages] = React.useState<ChatMessage[]>(chatMessages)
  const [draft, setDraft] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [revealed, setRevealed] = React.useState(!can("messages.moderate"))
  const [gateOpen, setGateOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")

  const active =
    conversations.find((item) => item.id === activeId) ?? conversations[0]
  const visibleConversations = conversations.filter((item) =>
    `${item.title} ${item.pathTitle}`.toLowerCase().includes(search.toLowerCase()),
  )
  const thread = messages.filter((item) => item.conversationId === activeId)

  function sendMessage() {
    if (!draft.trim()) return
    setMessages((current) => [
      ...current,
      {
        id: `m-local-${current.length + 1}`,
        conversationId: activeId,
        from: "Anisa Rahmawati",
        fromId: "u-anisa",
        kind: "text",
        body: draft.trim(),
        time: "Baru saja",
        mine: true,
      },
    ])
    setDraft("")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pesan"
        title={
          can("messages.moderate")
            ? "Percakapan dan moderasi."
            : "Percakapan di sekitar bangku."
        }
        description={
          can("messages.moderate")
            ? "Metadata percakapan terlihat untuk operasi. Konten pesan memerlukan break-glass dengan alasan dan tercatat di audit."
            : "Pesan langsung dengan pengajar dan kohort, catatan suara, serta undangan panggilan pada jam yang disepakati."
        }
        actions={
          can("messages.moderate") ? (
            <Button
              variant="outline"
              onClick={() => setGateOpen(true)}
              disabled={revealed}
            >
              <LockKeyhole aria-hidden="true" />
              {revealed ? "Akses konten tercatat" : "Buka konten dengan alasan"}
            </Button>
          ) : (
            <Button asChild>
              <Link href="/ruang/panggilan">
                <Phone aria-hidden="true" />
                Mulai panggilan
              </Link>
            </Button>
          )
        }
      />

      {can("messages.moderate") ? (
        <div className="flex flex-wrap items-center gap-2 border border-brass/50 bg-brass/10 px-3 py-2 text-[10.5px] text-ink-soft">
          <ShieldAlert className="size-4 text-[#8a5a16]" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <strong className="text-ink">Mode pengelola.</strong> Metadata percakapan
            terlihat. Konten pesan, rekaman, dan lampiran dilindungi break-glass.
          </p>
          <StatusStamp label={revealed ? "Akses tercatat" : "Belum dibuka"} tone={revealed ? "wait" : "muted"} />
        </div>
      ) : null}

      <div className="grid min-h-[65vh] gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_260px]">
        <Panel eyebrow="Daftar" title="Percakapan" bodyClassName="p-0">
          <div className="border-b border-ink/15 p-2.5">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari percakapan"
              aria-label="Cari percakapan"
              className="h-11 bg-paper text-[12px] sm:h-9"
            />
          </div>
          <ul className="max-h-[62vh] divide-y divide-ink/10 overflow-y-auto">
            {visibleConversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(conversation.id)}
                  aria-pressed={activeId === conversation.id}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors",
                    activeId === conversation.id
                      ? "bg-panel/60"
                      : "hover:bg-panel/30",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center border border-ink/25 bg-teak font-heading text-[9px] font-semibold text-paper">
                    {conversation.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[11.5px] font-semibold text-ink">
                        {conversation.title}
                      </span>
                      {conversation.unread > 0 ? (
                        <span className="flex size-4 shrink-0 items-center justify-center bg-copper-dark text-[8px] font-bold text-paper">
                          {conversation.unread}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                      {conversation.kind === "cohort"
                        ? "Kohort"
                        : conversation.kind === "support"
                          ? "Dukungan"
                          : conversation.kind === "system"
                            ? "Sistem"
                            : "Langsung"}{" "}
                      · {conversation.pathTitle}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[10px] leading-snug text-ink-muted">
                      {conversation.lastMessage}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <section
          aria-label={`Percakapan dengan ${active?.title ?? ""}`}
          className="relative flex min-h-[65vh] flex-col border border-ink/20 bg-paper-2"
        >
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/15 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center border border-ink/25 bg-teak font-heading text-[10px] font-semibold text-paper">
                {active?.initials}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-heading text-[1.1rem] leading-tight text-ink">
                  {active?.title}
                </h2>
                <p className="mt-0.5 truncate text-[9.5px] text-ink-muted">
                  {active?.pathTitle} · {active?.participants.join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild size="icon-sm" variant="ghost">
                <Link href="/ruang/panggilan" aria-label="Panggilan suara">
                  <Phone aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="icon-sm" variant="ghost">
                <Link href="/ruang/panggilan" aria-label="Panggilan video">
                  <Video aria-hidden="true" />
                </Link>
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Senyapkan percakapan"
                onClick={() => toast("Percakapan disenyapkan", { description: "Notifikasi untuk percakapan ini dimatikan." })}
              >
                <BellOff aria-hidden="true" />
              </Button>
            </div>
          </header>

          <div
            className={cn(
              "relative flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4",
              !revealed && "max-h-[46vh] overflow-hidden",
            )}
          >
            {thread.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {!revealed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream/85 p-5 text-center backdrop-blur-[2px]">
                <LockKeyhole className="size-6 text-copper-dark" aria-hidden="true" />
                <p className="mt-3 font-heading text-lg text-ink">
                  Konten dilindungi break-glass
                </p>
                <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-ink-muted">
                  Buka dengan alasan untuk membaca pesan, mendengar catatan suara,
                  atau melihat lampiran. Akses tercatat di log moderasi.
                </p>
                <Button size="sm" className="mt-3" onClick={() => setGateOpen(true)}>
                  Buka dengan alasan
                </Button>
              </div>
            ) : null}
          </div>

          <div className="border-t border-ink/15 bg-paper p-3">
            <div className="flex items-end gap-2">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Lampirkan berkas"
                onClick={() =>
                  toast("Lampiran", {
                    description: "Pemilih berkas memakai unggahan bertanda tangan.",
                  })
                }
              >
                <ImagePlus aria-hidden="true" />
              </Button>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
                rows={2}
                placeholder="Tulis pesan. Enter mengirim, Shift+Enter baris baru."
                aria-label="Tulis pesan"
                className="min-h-11 flex-1 resize-none border border-ink/30 bg-paper-2 px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink-muted focus-visible:border-thread"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Rekam catatan suara"
                onClick={() =>
                  toast("Perekam suara", {
                    description: "MediaRecorder akan aktif setelah izin mikrofon.",
                  })
                }
              >
                <Mic aria-hidden="true" />
              </Button>
              <Button size="icon-sm" aria-label="Kirim pesan" onClick={sendMessage}>
                <Send aria-hidden="true" />
              </Button>
            </div>
            <p className="mt-1.5 text-[9px] text-ink-muted">
              Tautan luar diperiksa otomatis. Catatan suara maksimal 10 menit.
            </p>
          </div>
        </section>

        <aside className="hidden space-y-4 xl:block">
          <Panel eyebrow="Konteks" title="Ruang percakapan">
            <dl className="space-y-2.5">
              <div>
                <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Jenis
                </dt>
                <dd className="mt-0.5 text-[11px] font-medium">{active?.kind}</dd>
              </div>
              <div>
                <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Cakupan
                </dt>
                <dd className="mt-0.5 text-[11px] leading-snug">{active?.pathTitle}</dd>
              </div>
              <div>
                <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Anggota
                </dt>
                <dd className="mt-0.5 text-[11px] leading-snug">
                  {active?.participants.join(", ")}
                </dd>
              </div>
            </dl>
          </Panel>
          {can("messages.moderate") ? (
            <Panel eyebrow="Moderasi" title="Tindakan">
              <div className="grid gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast("Peringatan dikirim", { description: "Pengguna menerima peringatan dan tautan kebijakan." })}
                >
                  <Flag aria-hidden="true" />
                  Kirim peringatan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast("Percakapan dibisukan", { description: "Pesan baru ditahan sampai ditinjau." })}
                >
                  <BellOff aria-hidden="true" />
                  Bisukan percakapan
                </Button>
                <Button size="sm" variant="ghost" className="justify-start" asChild>
                  <Link href="/ruang/log">Buka log moderasi</Link>
                </Button>
              </div>
            </Panel>
          ) : (
            <Panel eyebrow="Keamanan" title="Kendali">
              <div className="grid gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast("Percakapan dilaporkan", { description: "Tim dukungan menerima laporan dengan konteks." })}
                >
                  <Flag aria-hidden="true" />
                  Laporkan percakapan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="justify-start"
                  onClick={() => toast("Pengguna diblokir", { description: "Blokir hanya berlaku pada percakapan langsung." })}
                >
                  Blokir pengguna
                </Button>
              </div>
            </Panel>
          )}
          <Panel eyebrow="Panggilan" title="Berikutnya">
            <p className="text-[11px] leading-relaxed text-ink-soft">
              Panggilan suara hari ini pukul 16.00, 15 menit. Rekaman mati secara
              default.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link href="/ruang/panggilan">
                Buka ruang panggilan
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Panel>
        </aside>
      </div>

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka konten percakapan</DialogTitle>
            <DialogDescription>
              Akses konten sensitif memerlukan alasan. Tindakan ini tercatat di
              audit moderasi dengan aktor, waktu, dan percakapan.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="breakglass-reason">Alasan akses</Label>
            <Textarea
              id="breakglass-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Contoh: meninjau laporan tautan luar pada percakapan ini."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGateOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={reason.trim().length < 8}
              onClick={() => {
                setRevealed(true)
                setGateOpen(false)
                toast("Akses tercatat", {
                  description: "Konten dibuka. Entri audit dibuat untuk sesi ini.",
                })
              }}
            >
              Buka dan catat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [playing, setPlaying] = React.useState(false)

  if (message.kind === "system") {
    return (
      <div className="mx-auto flex max-w-md items-start gap-2 border border-ink/15 bg-panel/35 px-3 py-2 text-center text-[10px] leading-relaxed text-ink-muted">
        <span className="mt-1 size-1.5 shrink-0 bg-copper-dark" aria-hidden="true" />
        {message.body}
      </div>
    )
  }

  return (
    <div className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] border px-3 py-2 sm:max-w-[74%]",
          message.mine
            ? "border-copper-dark/40 bg-copper/10"
            : "border-ink/20 bg-paper",
        )}
      >
        {!message.mine ? (
          <p className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
            {message.from}
          </p>
        ) : null}

        {message.kind === "text" ? (
          <p className="text-[12px] leading-relaxed text-ink">{message.body}</p>
        ) : null}

        {message.kind === "voice" ? (
          <div>
            <button
              type="button"
              onClick={() => setPlaying((current) => !current)}
              aria-label={`${playing ? "Jeda" : "Putar"} catatan suara ${message.duration}`}
              className="flex w-full items-center gap-2"
            >
              <span className="flex size-7 shrink-0 items-center justify-center border border-ink/30 bg-paper-2">
                {playing ? (
                  <span className="flex gap-0.5" aria-hidden="true">
                    <span className="h-3 w-0.5 bg-ink" />
                    <span className="h-3 w-0.5 bg-ink" />
                  </span>
                ) : (
                  <Play className="size-3 fill-ink" aria-hidden="true" />
                )}
              </span>
              <span className="flex h-7 min-w-0 flex-1 items-center gap-[2px]" aria-hidden="true">
                {(message.waveform ?? []).map((height, index) => (
                  <span
                    key={index}
                    className={cn(
                      "min-w-[1px] flex-1",
                      playing && index < 12 ? "bg-copper-dark" : "bg-ink/35",
                    )}
                    style={{ height: `${Math.max(3, height * 0.22)}px` }}
                  />
                ))}
              </span>
              <span className="shrink-0 text-[9px] tabular-nums text-ink-muted">
                {message.duration}
              </span>
            </button>
            <p className="mt-1 text-[9px] text-ink-muted">{message.body} · transkrip tersedia</p>
          </div>
        ) : null}

        {message.kind === "file" ? (
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center border border-ink/25 bg-paper-2">
              <FileText className="size-4 text-copper-dark" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-ink">{message.file?.name}</p>
              <p className="text-[9px] text-ink-muted">{message.file?.size}</p>
            </div>
          </div>
        ) : null}

        {message.kind === "call" ? (
          <div className="min-w-48">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-copper-dark">
              <Phone className="size-3" aria-hidden="true" />
              {message.body}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-ink">
              {message.call?.state}
            </p>
            <p className="mt-0.5 text-[9px] text-ink-muted">
              {message.call?.duration} · konsen kedua pihak
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2 w-full">
              <Link href="/ruang/panggilan">Buka panggilan</Link>
            </Button>
          </div>
        ) : null}

        <p className="mt-1 text-right text-[8px] text-ink-muted">{message.time}</p>
      </div>
    </div>
  )
}
