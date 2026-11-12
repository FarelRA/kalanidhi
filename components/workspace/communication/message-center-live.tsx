"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  BellOff,
  Check,
  CheckCheck,
  FileText,
  Flag,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Mic,
  Pause,
  Pencil,
  Phone,
  Play,
  Search,
  Send,
  ShieldAlert,
  Trash2,
  Video,
  X,
} from "lucide-react"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import type { GenericId } from "convex/values"
import { useRouter } from "next/navigation"
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
import { EmptyState } from "@/components/workspace/data/empty-state"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  attachmentProblem,
  extensionForMime,
  MAX_TEXT_LENGTH,
  MAX_VOICE_DURATION_MS,
} from "@/lib/messaging/policy"
import type {
  ConversationSummary,
  MessageAssetView,
  MessagePage,
  MessageView,
  ModerationFlagView,
  NotificationView,
} from "@/lib/messaging/types"
import { cn } from "cn"

const PAGE_SIZE = 50
const EMPTY_CONVERSATIONS: ConversationSummary[] = []

type ModerationAction =
  | "warn"
  | "mute"
  | "suspend_messaging"
  | "close_conversation"
  | "remove_message"

type JoinMode = "audio" | "video"

type PendingVoice = {
  blob: Blob
  durationMs: number
  mimeType: string
  waveform: number[]
  conversationId: string
}

export function MessageCenterLive() {
  const { viewer, can } = useViewer()
  const router = useRouter()
  const viewerId = viewer?.userId ?? ""
  const moderator = can("messages.moderate")

  const conversations = useQuery(api.messaging.listConversations, {})
  const contacts = useQuery(
    api.messaging.listContacts,
    moderator ? "skip" : {},
  )
  const unreadNotifications = useQuery(api.notifications.unreadCount, {})
  const notifications = useQuery(api.notifications.list, { limit: 12 })

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [clock, setClock] = React.useState(0)
  const [listSearch, setListSearch] = React.useState("")
  const [directOpen, setDirectOpen] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [threadSearch, setThreadSearch] = React.useState("")
  const [replyTo, setReplyTo] = React.useState<MessageView | null>(null)
  const [editing, setEditing] = React.useState<{
    id: string
    body: string
  } | null>(null)
  const [breakGlass, setBreakGlass] = React.useState<MessagePage | null>(null)
  const [gateOpen, setGateOpen] = React.useState(false)
  const [gateReason, setGateReason] = React.useState("")
  const [reportMessage, setReportMessage] = React.useState<MessageView | null>(
    null,
  )
  const [reportReason, setReportReason] = React.useState("")
  const [pendingVoice, setPendingVoice] = React.useState<PendingVoice | null>(
    null,
  )
  const [transcript, setTranscript] = React.useState("")
  const [recording, setRecording] = React.useState(false)
  const [recordSeconds, setRecordSeconds] = React.useState(0)
  const [moderationTarget, setModerationTarget] = React.useState<{
    action: ModerationAction
    targetUserId?: string
    messageId?: string
  } | null>(null)
  const [moderationReason, setModerationReason] = React.useState("")
  const [flagTarget, setFlagTarget] = React.useState<ModerationFlagView | null>(
    null,
  )
  const [flagResolution, setFlagResolution] = React.useState("")
  const [flagRemoveMessage, setFlagRemoveMessage] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [callStarting, setCallStarting] = React.useState<JoinMode | null>(null)

  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const recordStartedRef = React.useRef(0)
  const recordConversationRef = React.useRef<string | null>(null)
  const typingSentRef = React.useRef(false)
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const activeConversations =
    conversations ?? EMPTY_CONVERSATIONS
  const activeId = selectedId ?? activeConversations[0]?.id ?? null
  const nowMs = clock

  const active =
    activeConversations.find((item) => item.id === activeId) ?? null
  const detail = useQuery(
    api.messaging.getConversation,
    activeId ? { conversationId: activeId as Id<"conversations"> } : "skip",
  )
  const readable =
    Boolean(detail?.canReadContent ?? active?.canReadContent) ||
    breakGlass !== null
  const memberOnly = Boolean(detail?.isMember)
  const grantExpiresAt = detail?.activeGrant?.expiresAt

  const memberPages = usePaginatedQuery(
    api.messaging.listMessagePage,
    activeId && readable && memberOnly
      ? { conversationId: activeId as Id<"conversations"> }
      : "skip",
    { initialNumItems: PAGE_SIZE },
  )
  const searchResults = useQuery(
    api.messaging.searchMessages,
    activeId && readable && memberOnly && threadSearch.trim().length >= 2
      ? {
          conversationId: activeId as Id<"conversations">,
          term: threadSearch.trim(),
        }
      : "skip",
  )
  const receipts = useQuery(
    api.messaging.listReceipts,
    activeId && memberOnly
      ? { conversationId: activeId as Id<"conversations"> }
      : "skip",
  )
  const presence = useQuery(
    api.messaging.listPresence,
    activeId && memberOnly
      ? { conversationId: activeId as Id<"conversations"> }
      : "skip",
  )
  const flags = useQuery(
    api.messaging.listFlags,
    moderator ? {} : "skip",
  )

  const startDirect = useMutation(api.messaging.startDirect)
  const startSupport = useMutation(api.messaging.startSupport)
  const startCall = useMutation(api.calls.startCall)
  const joinSupport = useMutation(api.messaging.joinSupport)
  const muteConversation = useMutation(api.messaging.muteConversation)
  const unmuteConversation = useMutation(api.messaging.unmuteConversation)
  const markRead = useMutation(api.messaging.markRead)
  const setTyping = useMutation(api.messaging.setTyping)
  const setPresence = useMutation(api.messaging.setPresence)
  const createUploadUrl = useMutation(api.messaging.createUploadUrl)
  const sendMessage = useMutation(api.messaging.sendMessage)
  const editMessage = useMutation(api.messaging.editMessage)
  const removeMessage = useMutation(api.messaging.removeMessage)
  const reportMessageMutation = useMutation(api.messaging.reportMessage)
  const blockUser = useMutation(api.messaging.blockUser)
  const unblockUser = useMutation(api.messaging.unblockUser)
  const grantBreakGlass = useMutation(api.messaging.grantBreakGlass)
  const readContent = useMutation(api.messaging.readContent)
  const resolveFlag = useMutation(api.messaging.resolveFlag)
  const moderateMessage = useMutation(api.messaging.moderateMessage)
  const markNotificationRead = useMutation(api.notifications.markRead)
  const markAllNotificationsRead = useMutation(api.notifications.markAllRead)

  React.useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 5_000)
    return () => clearInterval(timer)
  }, [])

  React.useEffect(() => {
    if (!activeId || !memberOnly) return
    void setPresence({ conversationId: activeId as Id<"conversations"> }).catch(
      () => undefined,
    )
  }, [activeId, memberOnly, setPresence])

  React.useEffect(() => {
    if (!grantExpiresAt) return
    const timer = setTimeout(
      () => {
        setBreakGlass(null)
        toast("Akses break-glass berakhir", {
          description: "Buka kembali dengan alasan bila masih diperlukan.",
        })
      },
      Math.max(0, grantExpiresAt - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [grantExpiresAt])

  React.useEffect(() => {
    if (!activeId || !readable || !memberOnly) return
    if (!detail || detail.unreadCount === 0) return
    void markRead({ conversationId: activeId as Id<"conversations"> }).catch(
      () => undefined,
    )
  }, [activeId, readable, memberOnly, detail, markRead])

  React.useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      setRecordSeconds(Math.floor((Date.now() - recordStartedRef.current) / 1000))
    }, 1_000)
    return () => clearInterval(timer)
  }, [recording])

  const messages = memberOnly
    ? [...memberPages.results].reverse()
    : (breakGlass?.messages ?? [])
  const hasMore = memberOnly
    ? memberPages.status === "CanLoadMore"
    : (breakGlass?.hasMore ?? false)

  const filteredConversations = activeConversations.filter((item) =>
    `${item.title} ${item.pathId ?? ""}`
      .toLowerCase()
      .includes(listSearch.trim().toLowerCase()),
  )

  const peer = detail?.members.find((item) => item.userId !== viewerId) ?? null
  const peerTyping = presence?.some(
    (item) =>
      item.userId !== viewerId &&
      item.typingUntil !== null &&
      item.typingUntil > nowMs,
  )
  const latestOwnMessage = [...messages]
    .reverse()
    .find((item) => item.senderId === viewerId && !item.deletedAt)
  const peerRead =
    latestOwnMessage && receipts
      ? receipts
          .filter((item) => item.userId !== viewerId)
          .some(
            (item) =>
              item.lastReadAt !== null &&
              item.lastReadAt >= latestOwnMessage.createdAt,
          )
      : false

  function selectConversation(id: string) {
    setSelectedId(id)
    setBreakGlass(null)
    setReplyTo(null)
    setEditing(null)
    setDraft("")
    setThreadSearch("")
    void setPresence({ conversationId: id as Id<"conversations"> }).catch(
      () => undefined,
    )
  }

  async function handleCreateSupport() {
    try {
      const id = await startSupport({})
      setSelectedId(id)
      setThreadSearch("")
      setBreakGlass(null)
      toast("Permintaan dukungan dibuat")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleCreateDirect(peerId: string) {
    try {
      const id = await startDirect({ peerUserId: peerId as Id<"users"> })
      setSelectedId(id)
      setThreadSearch("")
      setBreakGlass(null)
      setDirectOpen(false)
      toast("Percakapan langsung siap")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleStartCall(kind: JoinMode) {
    if (!activeId || callStarting) return
    setCallStarting(kind)
    try {
      const result = await startCall({
        conversationId: activeId as Id<"conversations">,
        kind,
      })
      router.push(`/ruang/panggilan?call=${result.callId}`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setCallStarting(null)
    }
  }

  async function handleSendText() {
    if (!activeId || !draft.trim()) return
    const body = draft.trim()
    setDraft("")
    try {
      await sendMessage({
        conversationId: activeId as Id<"conversations">,
        kind: "text",
        body,
        replyToId: replyTo?.id as Id<"messages"> | undefined,
      })
      setReplyTo(null)
      if (typingSentRef.current) {
        typingSentRef.current = false
        void setTyping({
          conversationId: activeId as Id<"conversations">,
          typing: false,
        }).catch(() => undefined)
      }
    } catch (error) {
      setDraft(body)
      toast.error(errorMessage(error))
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value)
    if (!activeId || typingSentRef.current) return
    typingSentRef.current = true
    void setTyping({
      conversationId: activeId as Id<"conversations">,
      typing: true,
    }).catch(() => undefined)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      typingSentRef.current = false
      if (!activeId) return
      void setTyping({
        conversationId: activeId as Id<"conversations">,
        typing: false,
      }).catch(() => undefined)
    }, 4_000)
  }

  async function handleSaveEdit() {
    if (!editing) return
    try {
      await editMessage({
        messageId: editing.id as Id<"messages">,
        body: editing.body,
      })
      setEditing(null)
      toast("Pesan diperbarui")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleDelete(message: MessageView) {
    try {
      await removeMessage({ messageId: message.id as Id<"messages"> })
      toast("Pesan dihapus", {
        description: "Riwayat tetap tersimpan untuk audit.",
      })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleReport() {
    if (!reportMessage) return
    try {
      await reportMessageMutation({
        messageId: reportMessage.id as Id<"messages">,
        reason: reportReason,
      })
      setReportMessage(null)
      setReportReason("")
      toast("Laporan dikirim", {
        description: "Tim moderasi menerima pesan dan konteksnya.",
      })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleBlock() {
    if (!peer) return
    try {
      await blockUser({ userId: peer.userId as Id<"users"> })
      toast("Akun diblokir", {
        description: "Pesan langsung baru antara kalian dihentikan.",
      })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleUnblock() {
    if (!peer) return
    try {
      await unblockUser({ userId: peer.userId as Id<"users"> })
      toast("Blokir dibuka")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleMute() {
    if (!activeId) return
    try {
      if (detail?.mutedUntil && detail.mutedUntil > Date.now()) {
        await unmuteConversation({
          conversationId: activeId as Id<"conversations">,
        })
        toast("Notifikasi percakapan dinyalakan")
      } else {
        await muteConversation({
          conversationId: activeId as Id<"conversations">,
          hours: 8,
        })
        toast("Percakapan disenyapkan delapan jam")
      }
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleJoinSupport() {
    if (!activeId) return
    try {
      const result = await joinSupport({
        conversationId: activeId as Id<"conversations">,
        reason: "Permintaan dukungan pengguna",
      })
      if (!result.joined) {
        toast.error(result.reason ?? "Persetujuan pengguna belum ada.")
        return
      }
      toast("Bergabung dengan percakapan dukungan")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleGrantBreakGlass() {
    if (!activeId) return
    try {
      const grant = await grantBreakGlass({
        conversationId: activeId as Id<"conversations">,
        reason: gateReason,
      })
      if (!grant.granted) {
        toast.error(grant.reason)
        return
      }
      const page = await readContent({
        conversationId: activeId as Id<"conversations">,
        limit: PAGE_SIZE,
      })
      if (page.access !== "granted") {
        toast.error(page.reason ?? "Konten belum dapat dibuka.")
        return
      }
      setBreakGlass(page)
      setGateOpen(false)
      setGateReason("")
      toast("Akses tercatat", {
        description: "Grant dan pembacaan tercatat di audit moderasi.",
      })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleLoadBreakGlass() {
    if (!activeId) return
    try {
      const page = await readContent({
        conversationId: activeId as Id<"conversations">,
        limit: PAGE_SIZE,
      })
      if (page.access !== "granted") {
        toast.error(page.reason ?? "Konten belum dapat dibuka.")
        return
      }
      setBreakGlass(page)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleLoadOlder() {
    if (!activeId) return
    const oldest = messages[0]?.createdAt
    if (!oldest) return
    if (memberOnly) {
      memberPages.loadMore(PAGE_SIZE)
      return
    }
    try {
      const page = await readContent({
        conversationId: activeId as Id<"conversations">,
        limit: PAGE_SIZE,
        before: oldest,
      })
      if (page.access !== "granted") {
        toast.error(page.reason ?? "Konten belum dapat dibuka.")
        return
      }
      const next: MessagePage = {
        messages: [...page.messages, ...messages],
        hasMore: page.hasMore,
      }
      setBreakGlass(next)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleModerationSubmit() {
    if (!activeId || !moderationTarget) return
    try {
      await moderateMessage({
        conversationId: activeId as Id<"conversations">,
        action: moderationTarget.action,
        targetUserId: moderationTarget.targetUserId as Id<"users"> | undefined,
        messageId: moderationTarget.messageId as Id<"messages"> | undefined,
        reason: moderationReason,
      })
      setModerationTarget(null)
      setModerationReason("")
      toast("Tindakan moderasi tercatat")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleResolveFlag() {
    if (!flagTarget) return
    try {
      await resolveFlag({
        flagId: flagTarget.id as Id<"messageFlags">,
        decision: "resolved",
        resolution: flagResolution,
        removeMessage: flagRemoveMessage,
      })
      setFlagTarget(null)
      setFlagResolution("")
      setFlagRemoveMessage(false)
      toast("Laporan ditindaklanjuti")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function uploadBlob(
    blob: Blob,
    filename: string,
    mimeType: string,
    conversationId: string | null = activeId,
  ): Promise<{
    storageId: GenericId<"_storage">
    uploadId: Id<"messageUploadIntents">
  } | null> {
    if (!conversationId) return null
    const intent = await createUploadUrl({
      conversationId: conversationId as Id<"conversations">,
    })
    const response = await fetch(intent.uploadUrl, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
    })
    if (!response.ok) {
      throw new Error("Unggahan berkas gagal.")
    }
    const payload = (await response.json()) as { storageId?: string }
    if (!payload.storageId) {
      throw new Error("Unggahan tidak mengembalikan berkas.")
    }
    return {
      storageId: payload.storageId as GenericId<"_storage">,
      uploadId: intent.uploadId,
    }
  }

  async function handleFile(file: File) {
    if (!activeId) return
    const kind = file.type.startsWith("image/") ? "image" : "file"
    const problem = attachmentProblem(kind, {
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    })
    if (problem) {
      toast.error(problem)
      return
    }
    setUploading(true)
    try {
      const asset = await uploadBlob(file, file.name, file.type)
      if (!asset) return
      await sendMessage({
        conversationId: activeId as Id<"conversations">,
        kind,
        attachment: {
          storageId: asset.storageId,
          uploadId: asset.uploadId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        },
      })
      toast(kind === "image" ? "Gambar terkirim" : "Berkas terkirim")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setUploading(false)
    }
  }

  async function startRecording() {
    if (!activeId || recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(
        stream,
        preferred ? { mimeType: preferred } : undefined,
      )
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const mimeType = recorder.mimeType || preferred || "audio/webm"
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const durationMs = Math.max(1, Date.now() - recordStartedRef.current)
        const waveform = await waveformFor(blob)
        setRecording(false)
        setRecordSeconds(0)
        if (durationMs > MAX_VOICE_DURATION_MS) {
          toast.error("Catatan suara maksimal 10 menit.")
          return
        }
        const conversationId = recordConversationRef.current
        if (!conversationId) return
        setPendingVoice({
          blob,
          durationMs,
          mimeType,
          waveform,
          conversationId,
        })
      }
      recordStartedRef.current = Date.now()
      recordConversationRef.current = activeId
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setRecordSeconds(0)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") return
    recorder.stop()
    recorderRef.current = null
  }

  async function sendVoice() {
    if (!pendingVoice) return
    setUploading(true)
    try {
      const filename = `catatan-${Date.now()}${extensionForMime(pendingVoice.mimeType)}`
      const asset = await uploadBlob(
        pendingVoice.blob,
        filename,
        pendingVoice.mimeType,
        pendingVoice.conversationId,
      )
      if (!asset) return
      await sendMessage({
        conversationId: pendingVoice.conversationId as Id<"conversations">,
        kind: "voice",
        attachment: {
          storageId: asset.storageId,
          uploadId: asset.uploadId,
          filename,
          mimeType: pendingVoice.mimeType,
          size: pendingVoice.blob.size,
          durationMs: pendingVoice.durationMs,
          waveform: pendingVoice.waveform,
          transcript: transcript.trim() || undefined,
        },
      })
      setPendingVoice(null)
      setTranscript("")
      recordConversationRef.current = null
      toast("Catatan suara terkirim")
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pesan"
        title={moderator ? "Percakapan dan moderasi." : "Percakapan di sekitar bangku."}
        description={
          moderator
            ? "Metadata percakapan terlihat untuk operasi. Konten pesan memerlukan break-glass dengan alasan dan tercatat di audit."
            : "Pesan dengan pengajar dan kohort, catatan suara, serta pemberitahuan dalam aplikasi. Tautan luar ditandai tanpa pratinjau."
        }
        actions={
          moderator ? (
            <div className="flex flex-wrap items-center gap-2">
              <StatusStamp
                label={`${unreadNotifications ?? 0} pemberitahuan`}
                tone={(unreadNotifications ?? 0) > 0 ? "wait" : "muted"}
              />
              <Button
                variant="outline"
                onClick={() => setGateOpen(true)}
                disabled={Boolean(detail?.activeGrant) || !activeId}
              >
                <LockKeyhole aria-hidden="true" />
                {breakGlass ? "Konten dicatat" : "Buka konten dengan alasan"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleCreateSupport}>
                <ShieldAlert aria-hidden="true" />
                Minta dukungan
              </Button>
              <Button onClick={() => setDirectOpen(true)}>
                <Send aria-hidden="true" />
                Percakapan baru
              </Button>
            </div>
          )
        }
      />

      {moderator ? (
        <div className="flex flex-wrap items-center gap-2 border border-brass/50 bg-brass/10 px-3 py-2 text-[10.5px] text-ink-soft">
          <ShieldAlert className="size-4 text-[#8a5a16]" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <strong className="text-ink">Mode pengelola.</strong> Metadata
            percakapan terlihat. Konten pesan dan lampiran dilindungi
            break-glass dengan alasan dan audit.
          </p>
          <StatusStamp
            label={breakGlass ? "Akses tercatat" : "Belum dibuka"}
            tone={breakGlass ? "wait" : "muted"}
          />
        </div>
      ) : null}

      <div className="xl:hidden">
        <NotificationPanel
          notifications={notifications ?? []}
          unread={unreadNotifications ?? 0}
          onOpen={(item) => {
            if (item.conversationId) selectConversation(item.conversationId)
            void markNotificationRead({
              notificationId: item.id as Id<"notificationOutbox">,
            }).catch(() => undefined)
          }}
          onMarkAll={() =>
            void markAllNotificationsRead({})
              .then(() => toast("Semua pemberitahuan ditandai dibaca"))
              .catch((error: unknown) => toast.error(errorMessage(error)))
          }
        />
      </div>

      {activeConversations.length === 0 ? (
        <EmptyState
          title="Belum ada percakapan."
          description={
            moderator
              ? "Percakapan akan muncul di sini ketika peserta, pengajar, atau dukungan membuka ruang."
              : "Mulai percakapan dengan pengajar kohort atau buat permintaan dukungan. Data lokal tidak dipakai di sesi nyata."
          }
          action={
            moderator ? null : (
              <Button onClick={handleCreateSupport}>Minta dukungan</Button>
            )
          }
        />
      ) : (
        <div className="grid min-h-[65vh] gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_280px]">
          <Panel eyebrow="Daftar" title="Percakapan" bodyClassName="p-0">
            <div className="border-b border-ink/15 p-2.5">
              <Input
                value={listSearch}
                onChange={(event) => setListSearch(event.target.value)}
                placeholder="Cari percakapan"
                aria-label="Cari percakapan"
                className="h-11 bg-paper text-[12px] sm:h-9"
              />
            </div>
            <ul className="max-h-[62vh] divide-y divide-ink/10 overflow-y-auto">
              {filteredConversations.map((conversation) => (
                <li key={conversation.id}>
                  <ConversationRow
                    conversation={conversation}
                    active={activeId === conversation.id}
                    onSelect={() => selectConversation(conversation.id)}
                  />
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
                  {initialsFor(active?.title ?? "Ruang")}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-[1.1rem] leading-tight text-ink">
                    {active?.title ?? "Pilih percakapan"}
                  </h2>
                  <p className="mt-0.5 truncate text-[9.5px] text-ink-muted">
                    {kindLabel(active?.kind)} ·{" "}
                    {active?.members.map((item) => item.name).join(" · ")}
                    {peerTyping ? " · sedang menulis" : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {can("calls.start") ? (
                  <>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Mulai panggilan suara"
                      disabled={callStarting !== null}
                      onClick={() => void handleStartCall("audio")}
                    >
                      {callStarting === "audio" ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Phone aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Mulai panggilan video"
                      disabled={callStarting !== null}
                      onClick={() => void handleStartCall("video")}
                    >
                      {callStarting === "video" ? (
                        <Loader2 className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Video aria-hidden="true" />
                      )}
                    </Button>
                  </>
                ) : (
                  <Button asChild size="icon-sm" variant="ghost">
                    <Link href="/ruang/panggilan" aria-label="Buka panggilan">
                      <Phone aria-hidden="true" />
                    </Link>
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={
                    detail?.mutedUntil && detail.mutedUntil > nowMs
                      ? "Nyalakan notifikasi percakapan"
                      : "Senyapkan percakapan"
                  }
                  onClick={handleMute}
                >
                  <BellOff aria-hidden="true" />
                </Button>
                {moderator && !detail?.isMember && active?.kind === "support" ? (
                  <Button size="sm" variant="outline" onClick={handleJoinSupport}>
                    Bergabung dengan persetujuan
                  </Button>
                ) : null}
              </div>
            </header>

            {memberOnly ? (
              <div className="flex items-center gap-2 border-b border-ink/15 bg-paper px-3 py-2">
                <Search className="size-3.5 text-ink-muted" aria-hidden="true" />
                <Input
                  value={threadSearch}
                  onChange={(event) => setThreadSearch(event.target.value)}
                  placeholder="Cari di percakapan ini"
                  aria-label="Cari di percakapan ini"
                  className="h-9 bg-paper-2 text-[11px]"
                />
                {threadSearch ? (
                  <button
                    type="button"
                    aria-label="Bersihkan pencarian pesan"
                    onClick={() => setThreadSearch("")}
                    className="text-ink-muted hover:text-ink"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                "relative flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4",
                !readable && "max-h-[46vh] overflow-hidden",
              )}
            >
              {readable ? (
                threadSearch.trim().length >= 2 ? (
                  <SearchResults
                    results={searchResults ?? []}
                    onClear={() => setThreadSearch("")}
                  />
                ) : messages.length === 0 ? (
                  <EmptyState
                    title="Belum ada pesan."
                    description="Pesan pertama membuka percakapan ini. Lampiran dan catatan suara mengikuti batas ukuran."
                    className="border-0 bg-transparent"
                  />
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      viewerId={viewerId}
                      onReply={() => setReplyTo(message)}
                      onReport={() => {
                        setReportMessage(message)
                        setReportReason("")
                      }}
                      onEdit={() =>
                        setEditing({ id: message.id, body: message.body ?? "" })
                      }
                      onDelete={() => void handleDelete(message)}
                      onModerateRemove={
                        moderator
                          ? () =>
                              setModerationTarget({
                                action: "remove_message",
                                messageId: message.id,
                              })
                          : undefined
                      }
                      editing={editing?.id === message.id ? editing : null}
                      onEditingChange={setEditing}
                      onSaveEdit={() => void handleSaveEdit()}
                      onCancelEdit={() => setEditing(null)}
                    />
                  ))
                )
              ) : (
                <LockedContent
                  canLoad={Boolean(detail?.activeGrant)}
                  onLoad={() => void handleLoadBreakGlass()}
                  onRequest={() => setGateOpen(true)}
                />
              )}

              {readable && hasMore ? (
                <div className="pt-2 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleLoadOlder()}
                  >
                    Muat pesan lama
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="border-t border-ink/15 bg-paper p-3">
              {detail?.status === "archived" ? (
                <p className="text-[11px] text-ink-muted">
                  Percakapan ini ditutup. Riwayat tetap dapat dibaca.
                </p>
              ) : memberOnly ? (
                <>
                  {replyTo ? (
                    <div className="mb-2 flex items-start gap-2 border border-ink/20 bg-panel/40 px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                          Membalas {replyTo.senderName}
                        </p>
                        <p className="truncate text-[10.5px] text-ink-soft">
                          {replyTo.body ?? "Lampiran"}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Batalkan balasan"
                        onClick={() => setReplyTo(null)}
                        className="text-ink-muted hover:text-ink"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <label
                      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center border border-ink/20 text-ink-soft hover:bg-panel/40"
                      aria-label="Lampirkan gambar atau berkas"
                    >
                      <ImagePlus className="size-4" aria-hidden="true" />
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,application/zip"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) void handleFile(file)
                          event.target.value = ""
                        }}
                      />
                    </label>
                    <textarea
                      value={draft}
                      onChange={(event) => handleDraftChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault()
                          void handleSendText()
                        }
                      }}
                      rows={2}
                      maxLength={MAX_TEXT_LENGTH}
                      placeholder="Tulis pesan. Enter mengirim, Shift+Enter baris baru."
                      aria-label="Tulis pesan"
                      className="min-h-11 flex-1 resize-none border border-ink/30 bg-paper-2 px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink-muted focus-visible:border-thread"
                    />
                    <Button
                      size="icon-sm"
                      variant={recording ? "default" : "ghost"}
                      aria-label={
                        recording ? "Hentikan rekaman" : "Rekam catatan suara"
                      }
                      onClick={() =>
                        recording ? stopRecording() : void startRecording()
                      }
                    >
                      {recording ? (
                        <span className="flex items-center gap-1 text-[9px] tabular-nums">
                          {recordSeconds}s
                        </span>
                      ) : (
                        <Mic aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      size="icon-sm"
                      aria-label="Kirim pesan"
                      onClick={() => void handleSendText()}
                      disabled={!draft.trim()}
                    >
                      <Send aria-hidden="true" />
                    </Button>
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-ink-muted">
                    <span>
                      Tautan luar ditandai tanpa pratinjau. Catatan suara maksimal
                      10 menit dan 25 MB.
                    </span>
                    {uploading ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                        Mengunggah
                      </span>
                    ) : null}
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-ink-muted">
                  Konten dilindungi break-glass. Buka dengan alasan untuk membaca.
                </p>
              )}
            </div>
          </section>

          <aside className="hidden space-y-4 xl:block">
            <NotificationPanel
              notifications={notifications ?? []}
              unread={unreadNotifications ?? 0}
              onOpen={(item) => {
                if (item.conversationId) selectConversation(item.conversationId)
                void markNotificationRead({
                  notificationId: item.id as Id<"notificationOutbox">,
                }).catch(() => undefined)
              }}
              onMarkAll={() =>
                void markAllNotificationsRead({})
                  .then(() => toast("Semua pemberitahuan ditandai dibaca"))
                  .catch((error: unknown) => toast.error(errorMessage(error)))
              }
            />

            <Panel eyebrow="Konteks" title="Ruang percakapan">
              <dl className="space-y-2.5">
                <div>
                  <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Jenis
                  </dt>
                  <dd className="mt-0.5 text-[11px] font-medium">
                    {kindLabel(active?.kind)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Cakupan
                  </dt>
                  <dd className="mt-0.5 text-[11px] leading-snug">
                    {active?.pathId ?? "Tanpa jalur"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Anggota
                  </dt>
                  <dd className="mt-0.5 text-[11px] leading-snug">
                    {active?.members.map((item) => item.name).join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    Status
                  </dt>
                  <dd className="mt-0.5">
                    <StatusStamp
                      label={statusLabel(active?.status ?? "open")}
                      tone={
                        active?.status === "flagged"
                          ? "danger"
                          : active?.status === "archived"
                            ? "muted"
                            : "open"
                      }
                    />
                  </dd>
                </div>
                {latestOwnMessage ? (
                  <div>
                    <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                      Terakhir dibaca
                    </dt>
                    <dd className="mt-0.5 text-[11px] text-ink-soft">
                      {peerRead ? (
                        <span className="inline-flex items-center gap-1 text-moss">
                          <CheckCheck className="size-3" aria-hidden="true" />
                          Dibaca
                        </span>
                      ) : (
                        "Belum dibaca"
                      )}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Panel>

            {moderator ? (
              <ModerationPanel
                flags={flags ?? []}
                onResolve={(flag) => {
                  setFlagTarget(flag)
                  setFlagResolution("")
                  setFlagRemoveMessage(false)
                }}
              />
            ) : (
              <Panel eyebrow="Keamanan" title="Kendali">
                <div className="grid gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    onClick={() => {
                      const latest = messages[messages.length - 1]
                      if (!latest) {
                        toast.error("Belum ada pesan untuk dilaporkan.")
                        return
                      }
                      setReportMessage(latest)
                      setReportReason("")
                    }}
                  >
                    <Flag aria-hidden="true" />
                    Laporkan pesan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    onClick={handleBlock}
                  >
                    <BellOff aria-hidden="true" />
                    Blokir pengguna
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={handleUnblock}
                  >
                    Buka blokir
                  </Button>
                </div>
              </Panel>
            )}

            {moderator && memberOnly ? (
              <Panel eyebrow="Moderasi" title="Tindakan">
                <div className="grid gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    onClick={() =>
                      peer &&
                      setModerationTarget({
                        action: "warn",
                        targetUserId: peer.userId,
                      })
                    }
                  >
                    <Flag aria-hidden="true" />
                    Kirim peringatan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    onClick={() =>
                      peer &&
                      setModerationTarget({
                        action: "mute",
                        targetUserId: peer.userId,
                      })
                    }
                  >
                    <BellOff aria-hidden="true" />
                    Bisukan anggota
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    onClick={() =>
                      peer &&
                      setModerationTarget({
                        action: "suspend_messaging",
                        targetUserId: peer.userId,
                      })
                    }
                  >
                    <ShieldAlert aria-hidden="true" />
                    Batasi pengiriman
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    onClick={() =>
                      setModerationTarget({ action: "close_conversation" })
                    }
                  >
                    <LockKeyhole aria-hidden="true" />
                    Tutup percakapan
                  </Button>
                  <Button size="sm" variant="ghost" className="justify-start" asChild>
                    <Link href="/ruang/log">Buka log moderasi</Link>
                  </Button>
                </div>
              </Panel>
            ) : null}
          </aside>
        </div>
      )}

      <Dialog open={directOpen} onOpenChange={setDirectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Percakapan langsung</DialogTitle>
            <DialogDescription>
              Pesan langsung hanya dengan pengajar atau peserta yang berbagi
              kohort. Blokir dan laporan berlaku untuk pasangan ini.
            </DialogDescription>
          </DialogHeader>
          {contacts === undefined ? (
            <p className="text-[11px] text-ink-muted">Memuat kontak…</p>
          ) : contacts.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-ink-muted">
              Belum ada pengajar atau peserta yang berbagi kohort dengan akun ini.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-ink/10 overflow-y-auto border border-ink/15">
              {contacts.map((contact) => (
                <li key={contact.userId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-panel/40"
                    onClick={() => void handleCreateDirect(contact.userId)}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center border border-ink/25 bg-teak font-heading text-[9px] font-semibold text-paper">
                      {contact.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-semibold text-ink">
                        {contact.name}
                      </span>
                      <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                        {contact.roleLabel}
                        {contact.pathId ? ` · ${contact.pathId}` : ""}
                      </span>
                    </span>
                    <ArrowRight className="size-3 shrink-0 text-ink-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDirectOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka konten percakapan</DialogTitle>
            <DialogDescription>
              Akses konten sensitif memerlukan alasan. Grant, pembacaan, dan
              penolakan tercatat di audit moderasi.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="live-breakglass-reason">Alasan akses</Label>
            <Textarea
              id="live-breakglass-reason"
              value={gateReason}
              onChange={(event) => setGateReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Alasan: meninjau laporan tautan luar pada percakapan ini."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGateOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={gateReason.trim().length < 8}
              onClick={() => void handleGrantBreakGlass()}
            >
              Buka dan catat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportMessage)}
        onOpenChange={(open) => {
          if (!open) {
            setReportMessage(null)
            setReportReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laporkan pesan</DialogTitle>
            <DialogDescription>
              Laporan membuat tanda moderasi dengan rujukan pesan. Konten tetap
              terlindungi sampai pengelola membuka dengan alasan.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="live-report-reason">Alasan laporan</Label>
            <Textarea
              id="live-report-reason"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Alasan: tautan luar tidak diminta dan berulang."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportMessage(null)}>
              Batal
            </Button>
            <Button
              disabled={reportReason.trim().length < 5}
              onClick={() => void handleReport()}
            >
              Kirim laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingVoice)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingVoice(null)
            setTranscript("")
            recordConversationRef.current = null
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catatan suara siap</DialogTitle>
            <DialogDescription>
              Durasi {Math.round((pendingVoice?.durationMs ?? 0) / 1000)} detik ·{" "}
              {formatBytes(pendingVoice?.blob.size ?? 0)}. Transkrip opsional
              membantu pencarian dan aksesibilitas.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="live-transcript">Transkrip</Label>
            <Textarea
              id="live-transcript"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Tulis ringkasan atau transkrip catatan suara."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingVoice(null)
                setTranscript("")
                recordConversationRef.current = null
              }}
            >
              Batal
            </Button>
            <Button onClick={() => void sendVoice()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              Kirim catatan suara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(moderationTarget)}
        onOpenChange={(open) => {
          if (!open) setModerationTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tindakan moderasi</DialogTitle>
            <DialogDescription>
              Setiap tindakan memerlukan alasan dan menulis entri audit. Tindakan
              ini tidak mengubah peran akun.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="live-moderation-reason">Alasan</Label>
            <Textarea
              id="live-moderation-reason"
              value={moderationReason}
              onChange={(event) => setModerationReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Alasan: pesan berulang setelah peringatan."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModerationTarget(null)}>
              Batal
            </Button>
            <Button
              disabled={moderationReason.trim().length < 8}
              onClick={() => void handleModerationSubmit()}
            >
              Catat tindakan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(flagTarget)}
        onOpenChange={(open) => {
          if (!open) setFlagTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tinjau laporan</DialogTitle>
            <DialogDescription>
              {flagTarget
                ? `${flagTarget.reporterName}: ${flagTarget.reason}`
                : "Laporan pesan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="live-flag-resolution">Keputusan dan alasan</Label>
              <Textarea
                id="live-flag-resolution"
                value={flagResolution}
                onChange={(event) => setFlagResolution(event.target.value)}
                className="mt-2 min-h-24"
                placeholder="Alasan: pesan dihapus karena tautan berulang."
              />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-ink-soft">
              <input
                type="checkbox"
                checked={flagRemoveMessage}
                onChange={(event) => setFlagRemoveMessage(event.target.checked)}
              />
              Hapus pesan dari percakapan
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagTarget(null)}>
              Batal
            </Button>
            <Button
              disabled={flagResolution.trim().length < 8}
              onClick={() => void handleResolveFlag()}
            >
              Simpan keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SearchResults({
  results,
  onClear,
}: {
  results: MessageView[]
  onClear: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          {results.length} hasil pencarian
        </p>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Tutup pencarian
        </Button>
      </div>
      {results.length === 0 ? (
        <p className="border border-dashed border-ink/25 bg-paper/40 px-3 py-6 text-center text-[11px] text-ink-muted">
          Tidak ada pesan yang cocok di percakapan ini.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/15 bg-paper/40">
          {results.map((message) => (
            <li key={message.id} className="px-3 py-2">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
                {message.senderName} · {timeLabel(message.createdAt)}
              </p>
              <p className="mt-0.5 line-clamp-3 text-[11px] leading-snug text-ink">
                {message.body ??
                  message.asset?.transcript ??
                  (message.kind === "voice"
                    ? "Catatan suara"
                    : message.kind === "image"
                      ? "Gambar"
                      : "Berkas")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: ConversationSummary
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors",
        active ? "bg-panel/60" : "hover:bg-panel/30",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center border border-ink/25 bg-teak font-heading text-[9px] font-semibold text-paper">
        {initialsFor(conversation.title)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[11.5px] font-semibold text-ink">
            {conversation.title}
          </span>
          {conversation.unreadCount > 0 ? (
            <span className="flex size-4 shrink-0 items-center justify-center bg-copper-dark text-[8px] font-bold text-paper">
              {conversation.unreadCount}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
          {kindLabel(conversation.kind)}
          {conversation.pathId ? ` · ${conversation.pathId}` : ""}
          {conversation.openFlagCount > 0 ? " · terlapor" : ""}
          {conversation.blockedPair ? " · diblokir" : ""}
        </span>
        <span className="mt-1 line-clamp-2 block text-[10px] leading-snug text-ink-muted">
          {conversation.contentLocked
            ? "Konten dilindungi break-glass"
            : (conversation.lastMessagePreview ?? "Belum ada pesan")}
        </span>
      </span>
    </button>
  )
}

function LockedContent({
  canLoad,
  onLoad,
  onRequest,
}: {
  canLoad: boolean
  onLoad: () => void
  onRequest: () => void
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cream/85 p-5 text-center backdrop-blur-[2px]">
      <LockKeyhole className="size-6 text-copper-dark" aria-hidden="true" />
      <p className="mt-3 font-heading text-lg text-ink">
        Konten dilindungi break-glass
      </p>
      <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-ink-muted">
        Buka dengan alasan untuk membaca pesan, memutar catatan suara, atau
        melihat lampiran. Akses tercatat di log moderasi.
      </p>
      <Button
        size="sm"
        className="mt-3"
        onClick={canLoad ? onLoad : onRequest}
      >
        {canLoad ? "Muat konten tercatat" : "Buka dengan alasan"}
      </Button>
    </div>
  )
}

function MessageBubble({
  message,
  viewerId,
  editing,
  onReply,
  onReport,
  onEdit,
  onDelete,
  onModerateRemove,
  onEditingChange,
  onSaveEdit,
  onCancelEdit,
}: {
  message: MessageView
  viewerId: string
  editing: { id: string; body: string } | null
  onReply: () => void
  onReport: () => void
  onEdit: () => void
  onDelete: () => void
  onModerateRemove?: () => void
  onEditingChange: (next: { id: string; body: string } | null) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
}) {
  const mine = message.senderId === viewerId

  if (message.kind === "system") {
    return (
      <div className="mx-auto flex max-w-md items-start gap-2 border border-ink/15 bg-panel/35 px-3 py-2 text-center text-[10px] leading-relaxed text-ink-muted">
        <span className="mt-1 size-1.5 shrink-0 bg-copper-dark" aria-hidden="true" />
        {message.body}
      </div>
    )
  }

  if (message.deletedAt) {
    return (
      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className="max-w-[86%] border border-dashed border-ink/25 bg-paper/50 px-3 py-2 text-[10.5px] text-ink-muted sm:max-w-[74%]">
          {message.removedBy
            ? `Pesan dihapus moderator${message.removalReason ? `: ${message.removalReason}` : "."}`
            : "Pesan dihapus."}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] border px-3 py-2 sm:max-w-[74%]",
          mine ? "border-copper-dark/40 bg-copper/10" : "border-ink/20 bg-paper",
        )}
      >
        {!mine ? (
          <p className="mb-1 text-[8.5px] font-bold uppercase tracking-[0.07em] text-ink-muted">
            {message.senderName}
          </p>
        ) : null}

        {message.replyTo ? (
          <div className="mb-1.5 border-l-2 border-copper-dark/50 pl-2">
            <p className="text-[8px] font-bold uppercase tracking-[0.06em] text-ink-muted">
              {message.replyTo.senderName}
            </p>
            <p className="line-clamp-2 text-[10px] text-ink-soft">
              {message.replyTo.body}
            </p>
          </div>
        ) : null}

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editing.body}
              onChange={(event) =>
                onEditingChange({ id: editing.id, body: event.target.value })
              }
              className="min-h-16 bg-paper-2 text-[12px]"
              aria-label="Sunting pesan"
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                Batal
              </Button>
              <Button size="sm" onClick={onSaveEdit}>
                Simpan
              </Button>
            </div>
          </div>
        ) : (
          <>
            {message.kind === "text" ? (
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink">
                {message.body}
              </p>
            ) : null}
            {message.kind === "voice" ? (
              <VoiceNote message={message} />
            ) : null}
            {message.kind === "image" && message.asset ? (
              <ImageAttachment asset={message.asset} />
            ) : null}
            {message.kind === "file" && message.asset ? (
              <FileAttachment asset={message.asset} />
            ) : null}
            {message.containsExternalLink ? (
              <p className="mt-1.5 flex items-center gap-1 text-[9px] text-[#8a5a16]">
                <AlertTriangle className="size-3" aria-hidden="true" />
                Tautan luar. Pratinjau dimatikan; periksa sebelum membuka.
              </p>
            ) : null}
          </>
        )}

        {message.edits.length > 0 ? (
          <details className="mt-1.5 border-t border-ink/10 pt-1.5">
            <summary className="cursor-pointer text-[8.5px] text-ink-muted">
              Riwayat suntingan ({message.edits.length})
            </summary>
            <ul className="mt-1 space-y-1">
              {message.edits.map((edit) => (
                <li
                  key={edit.id}
                  className="text-[9px] leading-snug text-ink-soft"
                >
                  <span className="font-semibold">{edit.editorName}</span>
                  <span className="text-ink-muted">
                    {" "}
                    · {timeLabel(edit.createdAt)}
                  </span>
                  <span className="block text-ink-muted line-through">
                    {edit.previousBody}
                  </span>
                  <span className="block">{edit.nextBody}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <div className="mt-1 flex items-center justify-end gap-2">
          {message.edits.length > 0 ? (
            <span className="text-[8px] text-ink-muted">Diedit</span>
          ) : null}
          <span className="text-[8px] text-ink-muted">
            {timeLabel(message.createdAt)}
          </span>
          {!editing ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Balas pesan"
                onClick={onReply}
                className="text-ink-muted hover:text-ink"
              >
                <ArrowRight className="size-3" aria-hidden="true" />
              </button>
              {mine && message.kind === "text" ? (
                <button
                  type="button"
                  aria-label="Sunting pesan"
                  onClick={onEdit}
                  className="text-ink-muted hover:text-ink"
                >
                  <Pencil className="size-3" aria-hidden="true" />
                </button>
              ) : null}
              {mine ? (
                <button
                  type="button"
                  aria-label="Hapus pesan"
                  onClick={onDelete}
                  className="text-ink-muted hover:text-[#9a3423]"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="Laporkan pesan"
                  onClick={onReport}
                  className="text-ink-muted hover:text-[#9a3423]"
                >
                  <Flag className="size-3" aria-hidden="true" />
                </button>
              )}
              {onModerateRemove ? (
                <button
                  type="button"
                  aria-label="Hapus pesan sebagai moderator"
                  onClick={onModerateRemove}
                  className="text-ink-muted hover:text-[#9a3423]"
                >
                  <ShieldAlert className="size-3" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function VoiceNote({ message }: { message: MessageView }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const asset = message.asset
  const assetUrl = asset?.url
  if (!asset || !assetUrl) {
    return (
      <p className="text-[10.5px] text-ink-muted">
        Catatan suara tidak tersedia.
      </p>
    )
  }

  const durationSeconds = Math.max(1, Math.round((asset.durationMs ?? 0) / 1000))

  return (
    <div>
      <audio
        ref={audioRef}
        src={assetUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setProgress(0)
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget
          setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
        }}
        className="sr-only"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={playing ? "Jeda catatan suara" : "Putar catatan suara"}
          onClick={() => {
            const audio = audioRef.current
            if (!audio) return
            if (audio.paused) void audio.play()
            else audio.pause()
          }}
          className="flex size-8 shrink-0 items-center justify-center border border-ink/30 bg-paper-2"
        >
          {playing ? (
            <Pause className="size-3" aria-hidden="true" />
          ) : (
            <Play className="size-3 fill-ink" aria-hidden="true" />
          )}
        </button>
        <span
          className="flex h-7 min-w-0 flex-1 items-center gap-[2px]"
          aria-hidden="true"
        >
          {(asset.waveform.length > 0
            ? asset.waveform
            : Array.from({ length: 32 }, () => 0.35)
          ).map((height, index) => {
            const peakCount = asset.waveform.length || 32
            return (
              <span
                key={index}
                className={cn(
                  "min-w-[1px] flex-1",
                  progress * 100 > (index / peakCount) * 100
                    ? "bg-copper-dark"
                    : "bg-ink/35",
                )}
              style={{ height: `${Math.max(3, height * 24)}px` }}
            />
            )
          })}
        </span>
        <span className="shrink-0 text-[9px] tabular-nums text-ink-muted">
          {durationSeconds} dtk
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={progress}
        aria-label="Posisi putar catatan suara"
        onChange={(event) => {
          const audio = audioRef.current
          if (!audio || !audio.duration) return
          audio.currentTime = Number(event.target.value) * audio.duration
        }}
        className="mt-1.5 w-full accent-[#8c4322]"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <select
          aria-label="Kecepatan putar"
          className="min-h-8 border border-ink/25 bg-paper-2 px-1 text-[9px] text-ink"
          defaultValue="1"
          onChange={(event) => {
            if (audioRef.current) {
              audioRef.current.playbackRate = Number(event.target.value)
            }
          }}
        >
          <option value="0.75">0,75×</option>
          <option value="1">1×</option>
          <option value="1.25">1,25×</option>
          <option value="1.5">1,5×</option>
        </select>
        {asset.transcript ? (
          <details className="min-w-0 flex-1">
            <summary className="cursor-pointer text-[9px] font-bold uppercase tracking-[0.05em] text-copper-dark">
              Transkrip
            </summary>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-soft">
              {asset.transcript}
            </p>
          </details>
        ) : (
          <span className="text-[9px] text-ink-muted">Tanpa transkrip</span>
        )}
      </div>
      <AssetMeta asset={asset} />
    </div>
  )
}

function ImageAttachment({ asset }: { asset: MessageAssetView }) {
  if (!asset.url) {
    return <p className="text-[10.5px] text-ink-muted">Gambar tidak tersedia.</p>
  }
  return (
    <a
      href={asset.url}
      target="_blank"
      rel="noreferrer"
      className="mt-1 block max-w-xs border border-ink/20"
    >
      <Image
        src={asset.url}
        alt={asset.filename}
        width={asset.width ?? 480}
        height={asset.height ?? 360}
        loader={({ src }) => src}
        unoptimized
        className="h-auto w-full"
      />
      <span className="block px-2 py-1 text-[9px] text-ink-muted">
        {asset.filename} · {formatBytes(asset.size)}
      </span>
      <AssetMeta asset={asset} />
    </a>
  )
}

function FileAttachment({ asset }: { asset: MessageAssetView }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center border border-ink/25 bg-paper-2">
        <FileText className="size-4 text-copper-dark" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        {asset.url ? (
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-[11px] font-semibold text-ink underline-offset-2 hover:underline"
          >
            {asset.filename}
          </a>
        ) : (
          <p className="truncate text-[11px] font-semibold text-ink">
            {asset.filename}
          </p>
        )}
        <p className="text-[9px] text-ink-muted">{formatBytes(asset.size)}</p>
        <AssetMeta asset={asset} />
      </div>
    </div>
  )
}

function AssetMeta({ asset }: { asset: MessageAssetView }) {
  return (
    <p className="mt-0.5 text-[8.5px] text-ink-muted">
      Diunggah oleh {asset.senderName ?? "Akun tidak ditemukan"} ·{" "}
      {timeLabel(asset.createdAt)}
    </p>
  )
}

function NotificationPanel({
  notifications,
  unread,
  onOpen,
  onMarkAll,
}: {
  notifications: NotificationView[]
  unread: number
  onOpen: (item: NotificationView) => void
  onMarkAll: () => void
}) {
  return (
    <Panel
      eyebrow="Pemberitahuan"
      title={unread > 0 ? `${unread} belum dibaca` : "Semua terbaca"}
      action={
        notifications.length > 0 ? (
          <Button size="sm" variant="ghost" onClick={onMarkAll}>
            <CheckCheck aria-hidden="true" />
            Tandai dibaca
          </Button>
        ) : null
      }
      bodyClassName="p-0"
    >
      {notifications.length === 0 ? (
        <p className="px-4 py-5 text-[11px] leading-relaxed text-ink-muted">
          Belum ada pemberitahuan. Pesan baru dan balasan dukungan muncul di sini
          tanpa saluran surel atau WhatsApp pada fase ini.
        </p>
      ) : (
        <ul className="max-h-72 divide-y divide-ink/10 overflow-y-auto">
          {notifications.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-panel/40"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-1.5 shrink-0 border border-ink/30",
                    item.readAt === null ? "bg-copper-dark" : "bg-transparent",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold leading-snug text-ink">
                    {item.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-ink-muted">
                    {item.body}
                  </span>
                  <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                    {timeLabel(item.createdAt)}
                  </span>
                </span>
                {item.readAt === null ? (
                  <Check className="ml-auto size-3 shrink-0 text-copper-dark" aria-hidden="true" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function ModerationPanel({
  flags,
  onResolve,
}: {
  flags: ModerationFlagView[]
  onResolve: (flag: ModerationFlagView) => void
}) {
  return (
    <Panel eyebrow="Moderasi" title="Laporan pesan">
      {flags.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-ink-muted">
          Belum ada laporan terbuka. Konten pesan tetap memerlukan break-glass.
        </p>
      ) : (
        <ul className="space-y-2">
          {flags.slice(0, 5).map((flag) => (
            <li key={flag.id} className="border border-ink/15 bg-paper/50 p-2">
              <p className="text-[10.5px] font-semibold leading-snug text-ink">
                {flag.reason}
              </p>
              <p className="mt-0.5 text-[9px] text-ink-muted">
                {flag.reporterName} · {timeLabel(flag.createdAt)}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full justify-start"
                onClick={() => onResolve(flag)}
              >
                Tinjau laporan
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function kindLabel(kind: ConversationSummary["kind"] | undefined): string {
  if (kind === "cohort") return "Kohort"
  if (kind === "support") return "Dukungan"
  if (kind === "system") return "Sistem"
  return "Langsung"
}

function statusLabel(status: "open" | "archived" | "flagged"): string {
  if (status === "archived") return "Ditutup"
  if (status === "flagged") return "Terlapor"
  return "Terbuka"
}

function initialsFor(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "KN"
}

function formatBytes(size: number): string {
  if (size < 1_024) return `${size} B`
  if (size < 1_024 * 1_024) return `${Math.round(size / 1_024)} KB`
  return `${(size / (1_024 * 1_024)).toFixed(1)} MB`
}

function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
    const message = (error as { message?: string }).message
    if (message) return message
  }
  return "Tindakan belum berhasil."
}

async function waveformFor(blob: Blob): Promise<number[]> {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextClass) return []
    const context = new AudioContextClass()
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    const data = buffer.getChannelData(0)
    const bars = 48
    const step = Math.max(1, Math.floor(data.length / bars))
    const peaks: number[] = []
    for (let bar = 0; bar < bars; bar += 1) {
      let peak = 0
      for (let offset = 0; offset < step; offset += 1) {
        peak = Math.max(peak, Math.abs(data[bar * step + offset] ?? 0))
      }
      peaks.push(Math.min(1, Number(peak.toFixed(3))))
    }
    await context.close()
    return peaks
  } catch {
    return []
  }
}
