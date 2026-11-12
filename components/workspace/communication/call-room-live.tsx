"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Check,
  Flag,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ShieldCheck,
  Signal,
  Users,
  Video,
  Volume2,
} from "lucide-react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  type TrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react"
import { Track, RoomEvent, type Participant } from "livekit-client"
import { useMutation, useQuery } from "convex/react"
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
  CALL_KIND_LABELS,
  CALL_PARTICIPANT_ROLE_LABELS,
  CALL_RECORDING_CONSENT_LABELS,
  CALL_SCOPE_LABELS,
  CALL_STATUS_LABELS,
  CALL_STATUS_TONES,
} from "@/lib/calls/options"
import type {
  CallDetail,
  CallKind,
  CallRecordingConsent,
  CallStatus,
  CallSummary,
} from "@/lib/calls/types"
import type { StatusTone } from "@/lib/workspace/types"
import { cn } from "cn"

type JoinMode = "audio" | "video"

type Session = {
  token: string
  url: string
}

type TokenResponse = {
  token?: string
  url?: string
  code?: string
  message?: string
}

const EMPTY_CALLS: CallSummary[] = []

export function CallRoomLive({
  initialCallId,
  initialConversationId,
}: {
  initialCallId?: string
  initialConversationId?: string
}) {
  const { can } = useViewer()
  const router = useRouter()
  const [callId, setCallId] = React.useState<string | null>(
    initialCallId ?? null,
  )
  const [session, setSession] = React.useState<Session | null>(null)
  const [preferredMode, setPreferredMode] = React.useState<JoinMode>("video")
  const [joining, setJoining] = React.useState(false)
  const [waiting, setWaiting] = React.useState(false)
  const [left, setLeft] = React.useState(false)
  const leavingRef = React.useRef(false)
  const attemptedTokenRef = React.useRef<string | null>(null)

  const call = useQuery(
    api.calls.getCall,
    callId ? { callId: callId as Id<"callSessions"> } : "skip",
  )
  const upcoming =
    useQuery(api.calls.listUpcoming, {}) ?? EMPTY_CALLS
  const history = useQuery(api.calls.listHistory, {}) ?? EMPTY_CALLS
  const overview = useQuery(
    api.calls.callOverview,
    can("calls.monitor") ? {} : "skip",
  )

  const startCall = useMutation(api.calls.startCall)
  const ring = useMutation(api.calls.ring)
  const accept = useMutation(api.calls.accept)
  const decline = useMutation(api.calls.decline)
  const endCall = useMutation(api.calls.end)
  const recordParticipant = useMutation(api.calls.recordParticipant)

  const requestToken = React.useCallback(async (targetCallId: string) => {
    const response = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callId: targetCallId }),
    })
    const payload = (await response.json().catch(() => ({}))) as TokenResponse
    if (!response.ok) {
      if (payload.code === "WAITING_FOR_HOST") {
        setWaiting(true)
        return
      }
      throw new Error(payload.message ?? "Token panggilan tidak tersedia.")
    }
    if (!payload.token || !payload.url) {
      throw new Error("Token panggilan tidak lengkap.")
    }
    setSession({ token: payload.token, url: payload.url })
    setWaiting(false)
    setLeft(false)
  }, [])

  React.useEffect(() => {
    if (!waiting || session || !call) return
    if (call.status !== "active") return
    const key = `${call.id}:${call.status}`
    if (attemptedTokenRef.current === key) return
    attemptedTokenRef.current = key
    void requestToken(call.id).catch((error: unknown) => {
      toast.error(errorMessage(error))
    })
  }, [waiting, session, call, requestToken])

  async function beginJoin(nextMode: JoinMode) {
    if (joining) return
    setJoining(true)
    setPreferredMode(nextMode)
    try {
      let activeId = callId
      let status: CallStatus | null = call?.status ?? null
      let host = call?.isHost ?? false

      if (!activeId) {
        if (!initialConversationId) {
          toast.error("Pilih percakapan sebelum memulai panggilan.")
          return
        }
        const started = await startCall({
          conversationId: initialConversationId as Id<"conversations">,
          kind: nextMode,
        })
        activeId = started.callId
        status = started.status
        host = true
        setCallId(activeId)
        router.replace(`/ruang/panggilan?call=${activeId}`)
      }

      if (!activeId) return

      if (status === "scheduled") {
        if (!host) {
          setWaiting(true)
          toast("Menunggu tuan rumah memulai panggilan.")
          return
        }
        await ring({ callId: activeId as Id<"callSessions"> })
        status = "ringing"
      }

      if (status === "ringing" || status === "active") {
        const accepted = await accept({
          callId: activeId as Id<"callSessions">,
        })
        if (accepted.waiting) {
          setWaiting(true)
          toast("Menunggu tuan rumah masuk ke ruang panggilan.")
          return
        }
        status = accepted.status
      }

      if (status !== "active" && status !== "ringing") {
        toast.error("Panggilan ini belum dapat dimasuki.")
        return
      }
      await requestToken(activeId)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setJoining(false)
    }
  }

  async function handleDecline() {
    if (!callId) return
    try {
      await decline({
        callId: callId as Id<"callSessions">,
        reason: "Ditolak dari ruang panggilan",
      })
      setWaiting(false)
      toast("Panggilan ditolak")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleLeave() {
    if (!callId || leavingRef.current) return
    leavingRef.current = true
    try {
      if (call?.isHost) {
        await endCall({ callId: callId as Id<"callSessions"> })
      } else {
        await recordParticipant({
          callId: callId as Id<"callSessions">,
          event: "leave",
        })
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSession(null)
      setWaiting(false)
      setLeft(true)
    }
  }

  async function handleTransportEnded() {
    if (!callId || leavingRef.current) return
    leavingRef.current = true
    try {
      if (!call?.isHost) {
        await recordParticipant({
          callId: callId as Id<"callSessions">,
          event: "leave",
        })
      }
    } catch {
      // Transport teardown must never trap the user in the room.
    }
    setSession(null)
    setLeft(true)
  }

  if (callId && call === undefined) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Panggilan"
          title="Menyiapkan ruang panggilan."
          description="Memuat status panggilan dari Convex."
        />
        <div className="flex min-h-40 items-center justify-center border border-ink/20 bg-paper-2">
          <Loader2 className="size-5 animate-spin text-ink-muted" aria-hidden="true" />
        </div>
      </div>
    )
  }

  if (call?.monitorOnly) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Panggilan · pemantauan"
          title={call.title}
          description="Pengelola hanya melihat metadata panggilan. Media tidak pernah dibuka tanpa persetujuan peserta dan alasan dukungan."
          meta={<CallMeta call={call} />}
          actions={
            <Button asChild variant="outline">
              <Link href="/ruang/panggilan">Semua panggilan</Link>
            </Button>
          }
        />
        <CallMonitor call={call} />
        <CallRecordingsPanel call={call} />
      </div>
    )
  }

  if (call && (left || isTerminal(call.status))) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Panggilan"
          title={call.title}
          description={
            call.recordingEnabled
              ? "Panggilan berakhir. Rekaman tercatat aktif pada metadata panggilan."
              : "Panggilan berakhir. Tidak ada rekaman yang dibuat pada panggilan ini."
          }
          meta={<CallMeta call={call} />}
          actions={
            <Button asChild variant="outline">
              <Link href="/ruang/pesan">Buka percakapan</Link>
            </Button>
          }
        />
        <CallSummaryPanel call={call} left={left} />
        <CallRecordingsPanel call={call} />
      </div>
    )
  }

  if (call && session) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={`Panggilan · ${call.kind === "video" ? "video" : "suara"}`}
          title={call.title}
          description={
            call.recordingEnabled
              ? "Rekaman tercatat aktif. Persetujuan peserta tetap ditampilkan."
              : "Rekaman mati. Panggilan ini tidak direkam oleh siapa pun."
          }
          meta={<CallMeta call={call} />}
          actions={
            <Button asChild variant="outline">
              <Link href="/ruang/pesan">Percakapan</Link>
            </Button>
          }
        />
        <CallRoomConnected
          call={call}
          session={session}
          initialAudioOnly={preferredMode === "audio" || call.kind === "audio"}
          onLeave={() => void handleLeave()}
          onTransportEnded={() => void handleTransportEnded()}
        />
      </div>
    )
  }

  if (call) {
    const accessBlocked =
      call.joinBlockedReason === "BLOCKED" ||
      call.joinBlockedReason === "MESSAGING_SUSPENDED"
    const canEnter =
      !accessBlocked &&
      (call.status === "active" ||
        call.status === "ringing" ||
        (call.status === "scheduled" && call.isHost))
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Panggilan"
          title={call.title}
          description="Pemeriksaan perangkat sebelum masuk. Suara adalah jalur utama; video dapat dimatikan kapan saja."
          meta={<CallMeta call={call} />}
          actions={
            <Button asChild variant="outline">
              <Link href="/ruang/pesan">Kembali ke pesan</Link>
            </Button>
          }
        />
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            {waiting ? (
              <Panel eyebrow="Lobi" title="Menunggu tuan rumah">
                <p className="text-[12px] leading-relaxed text-ink-soft">
                  Kamu sudah diterima sebagai peserta. Ruang terbuka setelah tuan
                  rumah masuk. Kamu dapat menutup panggilan tanpa kehilangan akses
                  ke percakapan.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setWaiting(false)
                      if (callId) void requestToken(callId)
                    }}
                  >
                    Coba masuk lagi
                  </Button>
                  <Button variant="destructive" onClick={() => void handleDecline()}>
                    Tolak panggilan
                  </Button>
                </div>
              </Panel>
            ) : canEnter ? (
              <CallPrejoin
                call={call}
                joining={joining}
                onJoin={(nextMode) => void beginJoin(nextMode)}
                onDecline={() => void handleDecline()}
              />
            ) : (
              <Panel eyebrow="Status" title={statusLabel(call.status)}>
                <p className="text-[12px] leading-relaxed text-ink-soft">
                  {accessBlocked
                    ? call.joinBlockedReason === "BLOCKED"
                      ? "Panggilan ini diblokir. Buka blokir lewat percakapan bila situasi sudah aman."
                      : "Panggilan dibatasi oleh pengelola. Hubungi dukungan bila perlu."
                    : call.status === "scheduled"
                      ? "Panggilan terjadwal. Tuan rumah akan memulai dering pada waktunya."
                      : "Panggilan ini belum dapat dimasuki. Coba lagi dari percakapan."}
                </p>
                <Button asChild variant="outline" className="mt-3">
                  <Link href="/ruang/pesan">Buka percakapan</Link>
                </Button>
              </Panel>
            )}
          </div>
          <div className="space-y-4 xl:col-span-4">
            <CallSafetyPanel call={call} />
            <CallConsentPanel call={call} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Panggilan · LiveKit"
        title="Ruang panggilan."
        description="Panggilan suara atau video dari percakapan dan sesi kohort. Panggilan selalu berasal dari percakapan atau jadwal yang diizinkan; tidak ada panggilan tanpa asal."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp
              label={`${upcoming.length} akan datang`}
              tone={upcoming.length > 0 ? "wait" : "muted"}
            />
            <span className="text-[10px] text-ink-muted">
              Maksimal 25 peserta untuk panggilan kohort.
            </span>
          </div>
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/ruang/pesan">Buka percakapan</Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          {initialConversationId ? (
            <Panel eyebrow="Mulai" title="Panggilan dari percakapan ini">
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                Panggilan dibuat untuk percakapan yang sedang dibuka. Pemeriksaan
                perangkat muncul sebelum masuk.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => void beginJoin("audio")}
                  disabled={joining}
                >
                  <Mic aria-hidden="true" />
                  Panggilan suara
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void beginJoin("video")}
                  disabled={joining}
                >
                  <Video aria-hidden="true" />
                  Panggilan video
                </Button>
              </div>
            </Panel>
          ) : null}
          <Panel eyebrow="Akan datang" title="Panggilan terjadwal">
            {upcoming.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent"
                title="Belum ada panggilan terjadwal."
                description="Panggilan dimulai dari percakapan atau sesi kohort yang dijadwalkan. Kamu juga dapat membuka percakapan untuk memulai panggilan langsung."
              />
            ) : (
              <ul className="divide-y divide-ink/10">
                {upcoming.map((item) => (
                  <li key={item.id}>
                    <CallRow item={item} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel eyebrow="Riwayat" title="Panggilan selesai">
            {history.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent"
                title="Belum ada riwayat panggilan."
                description="Metadata durasi, peserta, dan ringkasan kualitas akan muncul setelah panggilan berakhir."
              />
            ) : (
              <ul className="divide-y divide-ink/10">
                {history.slice(0, 12).map((item) => (
                  <li key={item.id}>
                    <CallRow item={item} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <CallLandingSafety />
          {overview ? <CallOverviewPanel overview={overview} /> : null}
          <Panel eyebrow="Mulai" title="Dari percakapan">
            <p className="text-[11.5px] leading-relaxed text-ink-soft">
              Tombol panggilan muncul di percakapan yang mengizinkan panggilan.
              Panggilan 1:1 memakai percakapan pengajar–peserta; panggilan kohort
              dimulai pengajar dari percakapan kohort atau sesi terjadwal.
            </p>
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link href="/ruang/pesan">Pilih percakapan</Link>
            </Button>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function CallPrejoin({
  call,
  joining,
  onJoin,
  onDecline,
}: {
  call: CallDetail
  joining: boolean
  onJoin: (mode: JoinMode) => void
  onDecline: () => void
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [micOn, setMicOn] = React.useState(true)
  const [cameraOn, setCameraOn] = React.useState(call.kind === "video")
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([])
  const [deviceError, setDeviceError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: call.kind === "video",
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true
        })
        stream.getVideoTracks().forEach((track) => {
          track.enabled = call.kind === "video"
        })
        if (videoRef.current) videoRef.current.srcObject = stream
        const all = await navigator.mediaDevices.enumerateDevices()
        if (!cancelled) {
          setDevices(
            all.filter(
              (device) =>
                device.kind === "audioinput" || device.kind === "videoinput",
            ),
          )
        }
      } catch {
        if (!cancelled) {
          setDeviceError(
            "Izin kamera atau mikrofon belum diberikan. Kamu tetap dapat masuk dengan suara atau memakai ponsel.",
          )
        }
      }
    }
    void setup()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [call.kind])

  function toggleMic() {
    const next = !micOn
    setMicOn(next)
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next
    })
  }

  function toggleCamera() {
    const next = !cameraOn
    setCameraOn(next)
    streamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next
    })
  }

  function join(mode: JoinMode) {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    onJoin(mode)
  }

  return (
    <div className="border border-ink/20 bg-paper-2">
      <div className="flex items-center justify-between gap-3 border-b border-ink/15 px-4 py-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Pemeriksaan perangkat
          </p>
          <h2 className="mt-1 font-heading text-[1.3rem] text-ink">
            {call.kind === "video" ? "Kamera dan mikrofon" : "Mikrofon"}
          </h2>
        </div>
        <StatusStamp
          label={deviceError ? "Perlu izin" : "Siap"}
          tone={deviceError ? "wait" : "done"}
        />
      </div>
      <div className="relative flex aspect-video min-h-56 items-center justify-center overflow-hidden border-b border-ink/15 bg-teak">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Pratinjau kamera"
          className={cn(
            "h-full w-full object-cover",
            (!cameraOn || call.kind !== "video") && "hidden",
          )}
        />
        {!cameraOn || call.kind !== "video" ? (
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center border border-paper/25 bg-paper/10 font-heading text-2xl text-paper">
              {initialsFor(call.title)}
            </span>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-paper/60">
              Kamera mati · suara tetap aktif
            </p>
          </div>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        {deviceError ? (
          <p className="flex gap-2 border border-brass/60 bg-brass/10 px-2.5 py-2 text-[10.5px] leading-relaxed text-ink-soft">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#8a5a16]" aria-hidden="true" />
            {deviceError}
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-ink-muted">
            <span>
              Mikrofon:{" "}
              {devices.filter((device) => device.kind === "audioinput").length}
            </span>
            {call.kind === "video" ? (
              <span>
                Kamera:{" "}
                {devices.filter((device) => device.kind === "videoinput").length}
              </span>
            ) : null}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMic}
            aria-label={micOn ? "Matikan mikrofon" : "Nyalakan mikrofon"}
            aria-pressed={micOn}
            className="flex size-11 items-center justify-center border border-ink/25 bg-paper text-ink hover:bg-panel/50"
          >
            {micOn ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
          </button>
          {call.kind === "video" ? (
            <button
              type="button"
              onClick={toggleCamera}
              aria-label={cameraOn ? "Matikan kamera" : "Nyalakan kamera"}
              aria-pressed={cameraOn}
              className="flex size-11 items-center justify-center border border-ink/25 bg-paper text-ink hover:bg-panel/50"
            >
              {cameraOn ? <Camera className="size-4" aria-hidden="true" /> : <CameraOff className="size-4" aria-hidden="true" />}
            </button>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            {call.status === "ringing" && !call.isHost ? (
              <Button variant="outline" onClick={onDecline}>
                Tolak
              </Button>
            ) : null}
            <Button onClick={() => join(call.kind)} disabled={joining}>
              {joining ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Video aria-hidden="true" />
              )}
              {call.status === "scheduled"
                ? "Mulai sekarang"
                : call.status === "ringing" && !call.isHost
                  ? "Terima panggilan"
                  : "Masuk"}
            </Button>
            {call.kind === "video" ? (
              <Button
                variant="outline"
                onClick={() => join("audio")}
                disabled={joining}
              >
                <Mic aria-hidden="true" />
                Suara saja
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-[9.5px] leading-relaxed text-ink-muted">
          Rekaman mati secara bawaan. Persetujuan rekaman hanya dicatat sebagai
          metadata pada fase ini; tidak ada egress atau berkas rekaman.
        </p>
      </div>
    </div>
  )
}

function CallRoomConnected({
  call,
  session,
  initialAudioOnly,
  onLeave,
  onTransportEnded,
}: {
  call: CallDetail
  session: Session
  initialAudioOnly: boolean
  onLeave: () => void
  onTransportEnded: () => void
}) {
  const [audioOnly, setAudioOnly] = React.useState(initialAudioOnly)

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.url}
      connect
      audio
      video={call.kind === "video" && !audioOnly}
      onDisconnected={onTransportEnded}
      onError={() => {
        setAudioOnly(true)
        toast.error("Media video gagal. Beralih ke suara saja.", {
          description: "Kamu masih dapat melanjutkan lewat suara atau pesan.",
        })
      }}
      onMediaDeviceFailure={() => {
        setAudioOnly(true)
        toast("Perangkat video tidak tersedia", {
          description: "Panggilan berlanjut dengan suara saja.",
        })
      }}
      className="min-h-[60vh] border border-ink/25 bg-deep"
    >
      <CallRoomStage
        call={call}
        audioOnly={audioOnly}
        onAudioOnlyChange={setAudioOnly}
        onLeave={onLeave}
      />
    </LiveKitRoom>
  )
}

function CallRoomStage({
  call,
  audioOnly,
  onAudioOnlyChange,
  onLeave,
}: {
  call: CallDetail
  audioOnly: boolean
  onAudioOnlyChange: (value: boolean) => void
  onLeave: () => void
}) {
  const { viewer } = useViewer()
  const room = useRoomContext()
  const participants = useParticipants()
  const local = useLocalParticipant()
  const [connectionState, setConnectionState] = React.useState<string>(room.state)
  const [elapsed, setElapsed] = React.useState(0)

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: true },
  )
  const screenTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  })

  React.useEffect(() => {
    const onState = (state: string) => setConnectionState(state)
    room.on(RoomEvent.ConnectionStateChanged, onState)
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onState)
    }
  }, [room])

  React.useEffect(() => {
    const startedAt = call.startedAt ?? call.createdAt
    const tick = () => setElapsed(Math.max(0, Date.now() - startedAt))
    tick()
    const timer = setInterval(tick, 1_000)
    return () => clearInterval(timer)
  }, [call.startedAt, call.createdAt])

  async function toggleMic() {
    await local.localParticipant.setMicrophoneEnabled(
      !local.isMicrophoneEnabled,
    )
  }

  async function toggleCamera() {
    if (audioOnly) {
      toast("Mode suara saja aktif", {
        description: "Nyalakan video untuk memakai kamera lagi.",
      })
      return
    }
    await local.localParticipant.setCameraEnabled(!local.isCameraEnabled)
  }

  async function toggleScreenShare() {
    await local.localParticipant.setScreenShareEnabled(
      !local.isScreenShareEnabled,
    )
  }

  async function toggleAudioOnly() {
    if (audioOnly) {
      onAudioOnlyChange(false)
      if (call.kind === "video") {
        await local.localParticipant.setCameraEnabled(true)
      }
      return
    }
    await local.localParticipant.setCameraEnabled(false)
    onAudioOnlyChange(true)
    toast("Beralih ke suara saja", {
      description: "Kamera dimatikan; panggilan tetap berjalan.",
    })
  }

  return (
    <div className="flex min-h-[60vh] flex-col text-paper">
      <RoomAudioRenderer />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-paper/15 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-brass">
            {call.scope === "cohort" ? "Panggilan kohort" : "Panggilan langsung"}
          </p>
          <h2 className="truncate font-heading text-[1.1rem] leading-tight">
            {call.title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[9.5px] text-paper/70">
          <span className="inline-flex items-center gap-1 border border-paper/20 px-1.5 py-1">
            <Signal className="size-3 text-moss" aria-hidden="true" />
            {connectionLabel(connectionState)}
          </span>
          <span className="tabular-nums">{formatDuration(elapsed)}</span>
          <span className="inline-flex items-center gap-1 border border-paper/20 px-1.5 py-1">
            <Users className="size-3" aria-hidden="true" />
            {participants.length}
          </span>
        </div>
      </header>

      <div className="flex-1 p-2.5 sm:p-3">
        {screenTracks.length > 0 ? (
          <div className="mb-2.5">
            {screenTracks.map((track) => (
              <div
                key={`${track.participant.identity}-screen`}
                className="relative overflow-hidden border border-brass/40 bg-ink"
              >
                <VideoTrack
                  trackRef={track}
                  className="aspect-video w-full object-contain"
                />
                <span className="absolute bottom-2 left-2 border border-paper/20 bg-ink/80 px-1.5 py-1 text-[9px] text-paper">
                  Layar · {track.participant.name || track.participant.identity}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {audioOnly ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {participants.map((participant) => (
              <div
                key={participant.identity}
                className="flex aspect-video min-h-40 items-center justify-center border border-paper/20 bg-teak"
              >
                <div className="text-center">
                  <span className="mx-auto flex size-14 items-center justify-center border border-paper/25 bg-paper/10 font-heading text-xl text-paper">
                    {initialsFor(participant.name || participant.identity)}
                  </span>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-brass">
                    {participant.identity === viewer?.userId
                      ? "Kamu · suara saja"
                      : participant.name || participant.identity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {cameraTracks.map((track) => (
              <CameraTile
                key={`${track.participant.identity}-${track.source}`}
                track={track}
                isLocal={track.participant.identity === viewer?.userId}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-paper/15 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <ControlButton
            active={local.isMicrophoneEnabled}
            onClick={() => void toggleMic()}
            label={local.isMicrophoneEnabled ? "Matikan mikrofon" : "Nyalakan mikrofon"}
          >
            {local.isMicrophoneEnabled ? (
              <Mic aria-hidden="true" />
            ) : (
              <MicOff aria-hidden="true" />
            )}
          </ControlButton>
          <ControlButton
            active={local.isCameraEnabled && !audioOnly}
            onClick={() => void toggleCamera()}
            label={local.isCameraEnabled && !audioOnly ? "Matikan kamera" : "Nyalakan kamera"}
            disabled={audioOnly || call.kind !== "video"}
          >
            {local.isCameraEnabled && !audioOnly ? (
              <Camera aria-hidden="true" />
            ) : (
              <CameraOff aria-hidden="true" />
            )}
          </ControlButton>
          <ControlButton
            active={local.isScreenShareEnabled}
            onClick={() => void toggleScreenShare()}
            label={local.isScreenShareEnabled ? "Hentikan berbagi layar" : "Bagikan layar"}
          >
            <MonitorUp aria-hidden="true" />
          </ControlButton>
          <ControlButton
            active={!audioOnly}
            onClick={() => void toggleAudioOnly()}
            label={audioOnly ? "Nyalakan video" : "Beralih ke suara saja"}
          >
            {audioOnly ? <Volume2 aria-hidden="true" /> : <Video aria-hidden="true" />}
          </ControlButton>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 border-copper-dark bg-copper-dark text-paper hover:bg-copper"
            onClick={onLeave}
          >
            <PhoneOff aria-hidden="true" />
            {call.isHost ? "Akhiri" : "Keluar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 border-t border-paper/15 p-2.5 sm:grid-cols-2 sm:p-3">
        <div>
          <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-paper/50">
            Peserta
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {participants.map((participant) => (
              <li
                key={participant.identity}
                className="flex items-center gap-2 text-[10px] text-paper/80"
              >
                <span className="flex size-6 items-center justify-center border border-paper/20 bg-paper/10 font-heading text-[8px]">
                  {initialsFor(participant.name || participant.identity)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {participant.identity === viewer?.userId
                    ? "Kamu"
                    : participant.name || participant.identity}
                </span>
                <span className="text-[8.5px] text-paper/50">
                  {qualityLabel(participant)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-[9.5px] leading-relaxed text-paper/60">
          <p className="flex items-center gap-1.5 text-brass">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {call.recordingEnabled ? "Rekaman aktif" : "Rekaman mati"}
          </p>
          <p className="mt-1">
            {call.recordingEnabled
              ? "Panggilan ini tercatat aktif. Persetujuan hanya metadata dan berlaku bila semua pihak menyetujui."
              : "Tidak ada rekaman pada panggilan ini. Persetujuan hanya metadata, dan berlaku bila semua pihak menyetujui."}
          </p>
        </div>
      </div>
    </div>
  )
}

function CameraTile({
  track,
  isLocal,
}: {
  track: TrackReferenceOrPlaceholder
  isLocal: boolean
}) {
  const publication =
    "publication" in track ? track.publication : undefined
  const renderable = Boolean(publication && !publication.isMuted)
  const participant = track.participant
  return (
    <div className="relative flex aspect-video min-h-40 items-center justify-center overflow-hidden border border-paper/20 bg-teak">
      {renderable ? (
        <VideoTrack
          trackRef={track as TrackReference}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center border border-paper/25 bg-paper/10 font-heading text-xl text-paper">
            {initialsFor(participant.name || participant.identity)}
          </span>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-brass">
            {isLocal ? "Kamu · kamera mati" : "Kamera mati"}
          </p>
        </div>
      )}
      <span className="absolute bottom-2 left-2 max-w-[85%] truncate border border-paper/20 bg-ink/70 px-1.5 py-1 text-[9px] text-paper">
        {isLocal ? "Kamu" : participant.name || participant.identity}
      </span>
      {participant.isSpeaking ? (
        <span className="absolute top-2 right-2 flex items-center gap-1 border border-paper/20 bg-ink/70 px-1.5 py-1 text-[8px] text-paper">
          <Volume2 className="size-3 text-moss" aria-hidden="true" />
          Berbicara
        </span>
      ) : null}
    </div>
  )
}

function CallConsentPanel({
  call,
  readOnly = false,
}: {
  call: CallDetail
  readOnly?: boolean
}) {
  const { viewer } = useViewer()
  const setConsent = useMutation(api.calls.setRecordingConsent)
  const [busy, setBusy] = React.useState(false)
  const consented = viewer
    ? call.recordingConsentUserIds.includes(viewer.userId)
    : false
  const terminal = isTerminal(call.status)

  async function change(consent: boolean) {
    setBusy(true)
    try {
      await setConsent({
        callId: call.id as Id<"callSessions">,
        consent,
      })
      toast(consent ? "Persetujuan rekaman dicatat" : "Rekaman ditolak", {
        description: "Rekaman tetap mati pada fase ini; tidak ada egress.",
      })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel eyebrow="Konsen" title="Sebelum merekam">
      <p className="text-[10.5px] leading-relaxed text-ink-soft">
        Rekaman hanya untuk sengketa penilaian, atas persetujuan semua pihak, dan
        disimpan 30 hari. Fase ini hanya mencatat persetujuan; tidak ada rekaman
        yang dibuat.
      </p>
      <div className="mt-3 space-y-1.5">
        <p className="flex items-center justify-between gap-2 text-[10px]">
          <span className="text-ink-muted">Status</span>
          <span className="font-semibold">{consentLabel(call.recordingConsent)}</span>
        </p>
        <p className="flex items-center justify-between gap-2 text-[10px]">
          <span className="text-ink-muted">Rekaman</span>
          <span className="font-semibold">
            {call.recordingEnabled ? "Aktif" : "Mati"}
          </span>
        </p>
        <p className="flex items-center justify-between gap-2 text-[10px]">
          <span className="text-ink-muted">Persetujuan</span>
          <span className="font-semibold tabular-nums">
            {call.recordingConsentUserIds.length}/{call.recordingConsentRequired}
          </span>
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {readOnly ? (
          <p className="text-[10px] text-ink-muted">
            Pengelola hanya membaca metadata persetujuan.
          </p>
        ) : (
          <>
            <Button
              size="sm"
              variant={consented ? "outline" : "default"}
              disabled={busy || terminal || consented || call.recordingConsent === "declined"}
              onClick={() => void change(true)}
            >
              <Check aria-hidden="true" />
              {consented ? "Sudah setuju" : "Setujui"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || terminal || call.recordingConsent === "declined"}
              onClick={() => void change(false)}
            >
              Tolak
            </Button>
          </>
        )}
      </div>
      {call.recordingConsent === "both" ? (
        <p className="mt-2 text-[9.5px] text-moss">
          Semua pihak setuju. Status rekaman mengikuti catatan panggilan.
        </p>
      ) : null}
    </Panel>
  )
}

function CallSafetyPanel({ call }: { call: CallDetail }) {
  const { viewer } = useViewer()
  const blockUser = useMutation(api.messaging.blockUser)
  const reportCall = useMutation(api.calls.reportCall)
  const [reportOpen, setReportOpen] = React.useState(false)
  const [reportReason, setReportReason] = React.useState("")
  const peer = call.participants.find((item) => item.userId !== viewer?.userId)
  const direct = call.scope === "direct"

  async function handleBlock() {
    if (!peer) return
    try {
      await blockUser({ userId: peer.userId as Id<"users"> })
      toast("Peserta diblokir", {
        description: "Panggilan dan pesan langsung baru dihentikan.",
      })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function handleReport() {
    try {
      await reportCall({
        callId: call.id as Id<"callSessions">,
        reason: reportReason,
      })
      setReportOpen(false)
      setReportReason("")
      toast("Laporan panggilan dikirim", {
        description: "Pengelola meninjau metadata. Rekaman tetap mati.",
      })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Panel eyebrow="Keamanan" title="Peserta dan laporan">
      <p className="text-[10.5px] leading-relaxed text-ink-soft">
        {direct
          ? "Panggilan 1:1 dengan peserta di bawah umur memerlukan pendampingan wali. Sistem belum menyimpan data usia/wali, jadi panggilan tetap dibatasi pada percakapan ini. Kohort lebih disarankan untuk peserta di bawah umur."
          : "Panggilan kohort lebih disarankan untuk peserta di bawah umur. Pengelola hanya melihat metadata; tidak ada yang bergabung diam-diam ke media."}
      </p>
      <div className="mt-3 grid gap-1.5">
        <Button size="sm" variant="outline" className="justify-start" onClick={() => void handleBlock()} disabled={!direct || !peer}>
          <ShieldCheck aria-hidden="true" />
          Blokir peserta
        </Button>
        <Button size="sm" variant="outline" className="justify-start" onClick={() => setReportOpen(true)}>
          <Flag aria-hidden="true" />
          Laporkan panggilan
        </Button>
        <Button size="sm" variant="ghost" className="justify-start" asChild>
          <Link href="/ruang/pesan">Buka percakapan</Link>
        </Button>
      </div>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laporkan panggilan</DialogTitle>
            <DialogDescription>
              Laporan membuat catatan moderasi dari metadata panggilan. Rekaman
              tidak dinyalakan dan tidak ada media yang dibuka.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="call-report-reason">Alasan laporan</Label>
            <Textarea
              id="call-report-reason"
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
              className="mt-2 min-h-24"
              placeholder="Alasan: peserta meminta data pribadi di luar konteks belajar."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
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
    </Panel>
  )
}

function CallMonitor({ call }: { call: CallDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-8">
        <Panel eyebrow="Metadata" title="Peserta dan status">
          <div className="grid gap-3 sm:grid-cols-2">
            <Fact label="Status" value={statusLabel(call.status)} />
            <Fact label="Jenis" value={kindLabel(call.kind)} />
            <Fact label="Cakupan" value={scopeLabel(call.scope)} />
            <Fact
              label="Mulai"
              value={call.startedAt ? formatDateTime(call.startedAt) : "Belum mulai"}
            />
            <Fact label="Durasi" value={formatDuration(call.durationMs ?? 0)} />
            <Fact
              label="Rekaman"
              value={call.recordingEnabled ? "Aktif" : "Mati"}
            />
            <Fact
              label="Diakhiri oleh"
              value={call.endedByName ?? "Belum diisi"}
            />
            <Fact
              label="Alasan berakhir"
              value={call.endReason ?? "Belum diisi"}
            />
            <Fact
              label="Dibatalkan"
              value={
                call.cancelledAt ? formatDateTime(call.cancelledAt) : "Belum diisi"
              }
            />
            <Fact
              label="Konsen rekaman"
              value={`${consentLabel(call.recordingConsent)} · ${call.recordingConsentUserIds.length}/${call.recordingConsentRequired}`}
            />
          </div>
          <ul className="mt-4 divide-y divide-ink/10 border border-ink/15">
            {call.participants.map((participant) => (
              <li key={participant.userId} className="flex items-center gap-2 px-2.5 py-2">
                <span className="flex size-7 items-center justify-center border border-ink/20 bg-panel font-heading text-[9px]">
                  {participant.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold">
                    {participant.name}
                  </span>
                  <span className="block text-[9px] text-ink-muted">
                    {roleLabel(participant.role)} · {participant.status}
                  </span>
                </span>
                <span className="text-[9px] text-ink-muted">
                  {participant.quality ?? "Belum diisi"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel eyebrow="Kualitas" title="Ringkasan media">
          <p className="text-[11px] leading-relaxed text-ink-soft">
            {call.qualitySummary ??
              "Belum ada ringkasan kualitas. Metadata peserta dan durasi tetap tercatat."}
          </p>
        </Panel>
      </div>
      <div className="space-y-4 xl:col-span-4">
        <Panel eyebrow="Pengelola" title="Tanpa bergabung ke media">
          <p className="text-[10.5px] leading-relaxed text-ink-soft">
            Pemantauan hanya membaca metadata panggilan. Tidak ada token media
            yang diterbitkan untuk akun pengelola pada fase ini.
          </p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href="/ruang/log">Buka log panggilan</Link>
          </Button>
        </Panel>
        <CallConsentPanel call={call} readOnly />
      </div>
    </div>
  )
}

function CallSummaryPanel({ call, left }: { call: CallDetail; left: boolean }) {
  return (
    <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 text-center">
      <span className="mx-auto flex size-12 items-center justify-center border border-ink/25 text-copper-dark">
        <PhoneOff className="size-5" aria-hidden="true" />
      </span>
      <h2 className="heading-section mt-5 text-[2rem]">
        {left && !isTerminal(call.status) ? "Kamu sudah keluar." : "Panggilan selesai."}
      </h2>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
        {left && !isTerminal(call.status)
          ? "Panggilan masih berjalan untuk peserta lain. Kembali lewat percakapan bila diperlukan."
          : `Durasi ${formatDuration(call.durationMs ?? 0)}. Tidak ada rekaman pada fase ini.`}
      </p>
      <dl className="mx-auto mt-5 grid max-w-sm gap-2 text-left">
        <Fact label="Jenis" value={kindLabel(call.kind)} />
        <Fact label="Peserta" value={String(call.participants.length)} />
        <Fact label="Rekaman" value={call.recordingEnabled ? "Aktif" : "Mati"} />
        <Fact label="Konsen rekaman" value={consentLabel(call.recordingConsent)} />
        <Fact label="Kualitas" value={call.qualitySummary ?? "Belum ada ringkasan"} />
        <Fact label="Diakhiri oleh" value={call.endedByName ?? "Belum diisi"} />
        <Fact label="Alasan berakhir" value={call.endReason ?? "Belum diisi"} />
        <Fact
          label="Dibatalkan"
          value={call.cancelledAt ? formatDateTime(call.cancelledAt) : "Belum diisi"}
        />
      </dl>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/ruang/pesan">Buka percakapan</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ruang/panggilan">Daftar panggilan</Link>
        </Button>
      </div>
    </div>
  )
}

function CallRecordingsPanel({ call }: { call: CallDetail }) {
  if (call.recordings.length === 0) return null
  return (
    <Panel eyebrow="Rekaman" title="Metadata rekaman">
      <p className="text-[10.5px] leading-relaxed text-ink-soft">
        Rekaman tersimpan sebagai metadata. Pemutaran dan unduhan tidak tersedia
        pada fase ini.
      </p>
      <ul className="mt-3 divide-y divide-ink/10 border border-ink/15">
        {call.recordings.map((recording) => (
          <li key={recording.id} className="px-2.5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-ink">
                {formatDateTime(recording.createdAt)}
              </span>
              <StatusStamp
                label={`${recording.accessLogCount} akses`}
                tone="muted"
              />
            </div>
            <p className="mt-1 text-[9.5px] text-ink-muted">
              Disimpan hingga {formatDateTime(recording.retentionUntil)}
            </p>
            <p className="mt-0.5 text-[9.5px] text-ink-soft">
              Persetujuan:{" "}
              {recording.consentedBy.map((item) => item.name).join(", ") ||
                "Belum diisi"}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function CallRow({ item }: { item: CallSummary }) {
  return (
    <Link
      href={`/ruang/panggilan?call=${item.id}`}
      className="flex items-center gap-3 px-1 py-2.5 hover:bg-panel/30"
    >
      <span className="flex size-9 shrink-0 items-center justify-center border border-ink/20 bg-teak font-heading text-[9px] text-paper">
        {initialsFor(item.title)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-semibold text-ink">
          {item.title}
        </span>
        <span className="mt-0.5 block truncate text-[9px] text-ink-muted">
          {kindLabel(item.kind)} · {scopeLabel(item.scope)} · {item.hostName}
        </span>
      </span>
      <span className="text-right">
        <StatusStamp label={statusLabel(item.status)} tone={statusTone(item.status)} />
        <span className="mt-1 block text-[8.5px] text-ink-muted">
          {item.scheduledAt
            ? formatDateTime(item.scheduledAt)
            : item.durationMs
              ? formatDuration(item.durationMs)
              : "Belum diisi"}
        </span>
      </span>
    </Link>
  )
}

function CallOverviewPanel({
  overview,
}: {
  overview: {
    counts: Record<CallStatus, number>
    activeParticipants: number
    scheduledNext24h: number
    recordingPending: number
    recent: CallSummary[]
  }
}) {
  return (
    <Panel eyebrow="Pengelola" title="Operasional panggilan">
      <dl className="grid grid-cols-2 gap-2">
        <Fact label="Berlangsung" value={String(overview.counts.active)} />
        <Fact label="Berdering" value={String(overview.counts.ringing)} />
        <Fact label="Terjadwal" value={String(overview.counts.scheduled)} />
        <Fact label="Peserta aktif" value={String(overview.activeParticipants)} />
        <Fact label="24 jam" value={String(overview.scheduledNext24h)} />
        <Fact label="Konsen tertunda" value={String(overview.recordingPending)} />
      </dl>
      <p className="mt-3 text-[9.5px] leading-relaxed text-ink-muted">
        Angka berasal dari catatan panggilan. Pengelola tidak bergabung ke media.
      </p>
      {overview.recent.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-ink/15 pt-3">
          {overview.recent.slice(0, 4).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="min-w-0 truncate">{item.title}</span>
              <StatusStamp label={statusLabel(item.status)} tone={statusTone(item.status)} />
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  )
}

function CallLandingSafety() {
  return (
    <Panel eyebrow="Keamanan" title="Sebelum memanggil">
      <ul className="space-y-2 text-[10.5px] leading-relaxed text-ink-soft">
        <li>Panggilan hanya dari percakapan atau jadwal yang diizinkan.</li>
        <li>Rekaman mati secara bawaan; tidak ada egress pada fase ini.</li>
        <li>Panggilan kohort maksimal 25 peserta.</li>
        <li>
          Peserta di bawah umur: panggilan 1:1 memerlukan pendampingan wali;
          kohort lebih disarankan. Sistem belum menyimpan data usia/wali.
        </li>
        <li>Blokir dan laporan tetap tersedia dari percakapan dan ruang panggilan.</li>
      </ul>
    </Panel>
  )
}

function CallMeta({ call }: { call: CallDetail }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusStamp label={statusLabel(call.status)} tone={statusTone(call.status)} />
      <span className="text-[10px] text-ink-muted">
        {kindLabel(call.kind)} · {scopeLabel(call.scope)} · {call.participants.length}{" "}
        peserta
      </span>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[8px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-[11px] leading-snug text-ink">{value}</dd>
    </div>
  )
}

function ControlButton({
  active,
  onClick,
  label,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-11 items-center justify-center border transition-colors disabled:opacity-40",
        active
          ? "border-paper/30 bg-paper/10 text-paper hover:bg-paper/20"
          : "border-copper-light/40 bg-copper/20 text-copper-light hover:bg-copper/30",
      )}
    >
      {children}
    </button>
  )
}

function isTerminal(status: CallStatus): boolean {
  return ["ended", "missed", "declined", "cancelled"].includes(status)
}

function statusLabel(status: CallStatus): string {
  return CALL_STATUS_LABELS[status]
}

function statusTone(status: CallStatus): StatusTone {
  return CALL_STATUS_TONES[status]
}

function kindLabel(kind: CallKind): string {
  return CALL_KIND_LABELS[kind]
}

function scopeLabel(scope: CallDetail["scope"]): string {
  return CALL_SCOPE_LABELS[scope]
}

function consentLabel(consent: CallRecordingConsent): string {
  return CALL_RECORDING_CONSENT_LABELS[consent]
}

function roleLabel(role: CallDetail["participants"][number]["role"]): string {
  return CALL_PARTICIPANT_ROLE_LABELS[role]
}

function initialsFor(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function formatDateTime(value: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))
}

function connectionLabel(state: string): string {
  if (state === "connected") return "Tersambung"
  if (state === "connecting") return "Menyambung"
  if (state === "reconnecting") return "Menyambung ulang"
  if (state === "disconnected") return "Terputus"
  return "Menunggu"
}

function qualityLabel(participant: Participant): string {
  const quality = String(participant.connectionQuality)
  if (quality === "excellent") return "Sangat baik"
  if (quality === "good") return "Baik"
  if (quality === "poor") return "Buruk"
  return "Belum diisi"
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error && "data" in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  if (error instanceof Error) return error.message
  return "Panggilan belum dapat diproses."
}
