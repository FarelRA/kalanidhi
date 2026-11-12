"use client"

import * as React from "react"
import Link from "next/link"
import {
  Camera,
  CameraOff,
  Check,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ShieldCheck,
  Signal,
  Volume2,
  VolumeX,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { calls } from "@/lib/workspace/mock-data"
import { cn } from "cn"

export function CallRoomPreview() {
  const { can } = useViewer()
  const [micOn, setMicOn] = React.useState(true)
  const [cameraOn, setCameraOn] = React.useState(true)
  const [sharing, setSharing] = React.useState(false)
  const [audioOnly, setAudioOnly] = React.useState(false)
  const [speakerOn, setSpeakerOn] = React.useState(true)
  const [ended, setEnded] = React.useState(false)

  const call = calls[1]

  if (ended) {
    return (
      <div className="mx-auto max-w-xl border border-ink/25 bg-paper-2 p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center border border-ink/25 text-copper-dark">
          <PhoneOff className="size-5" aria-hidden="true" />
        </span>
        <h1 className="heading-section mt-5 text-[2rem]">Panggilan selesai.</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
          Durasi 12 menit 18 detik. Tidak ada rekaman. Ringkasan dan catatan
          pengajar tersedia di percakapan.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/ruang/pesan">Buka percakapan</Link>
          </Button>
          <Button variant="outline" onClick={() => setEnded(false)}>
            Masuk lagi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Panggilan · LiveKit"
        title="Ruang panggilan."
        description="Panggilan 1:1 dengan pengajar selama jam kantor atau sesi yang disepakati. Kamera mati tetap bisa; suara adalah jalur utama."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusStamp label="Berlangsung" tone="progress" />
            <span className="text-[10px] text-ink-muted">
              {call.with} · {call.role}
            </span>
          </div>
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/ruang/pesan">Kembali ke pesan</Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-9">
          <div className="wood-deep relative overflow-hidden border-2 border-ink/70 p-2.5 sm:p-3">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="relative flex aspect-[4/3] min-h-[220px] items-center justify-center overflow-hidden border border-paper/20 bg-teak">
                {cameraOn && !audioOnly ? (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-teak to-deep">
                    <span className="flex size-20 items-center justify-center border border-paper/25 bg-paper/10 font-heading text-3xl text-paper">
                      BH
                    </span>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="mx-auto flex size-16 items-center justify-center border border-paper/25 bg-paper/10 font-heading text-2xl text-paper">
                      BH
                    </span>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-paper/60">
                      Kamera mati · suara aktif
                    </p>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 border border-paper/20 bg-ink/70 px-2 py-1 text-[9px] text-paper">
                  <Signal className="size-3 text-moss" aria-hidden="true" />
                  Bambang Hardjono · Pengajar
                </div>
                {micOn ? (
                  <span className="absolute top-2 right-2 flex items-center gap-1 border border-paper/20 bg-ink/70 px-1.5 py-1 text-[8px] text-paper">
                    <Volume2 className="size-3" aria-hidden="true" />
                    Berbicara
                  </span>
                ) : null}
              </div>

              <div className="relative flex aspect-[4/3] min-h-[180px] items-center justify-center overflow-hidden border border-paper/20 bg-ink">
                <div className="text-center">
                  <span className="mx-auto flex size-14 items-center justify-center border border-paper/25 bg-paper/10 font-heading text-xl text-paper">
                    AR
                  </span>
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-brass">
                    Kamu
                  </p>
                </div>
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  {!micOn ? (
                    <span className="flex size-6 items-center justify-center border border-paper/20 bg-ink/80">
                      <MicOff className="size-3 text-copper-light" aria-hidden="true" />
                    </span>
                  ) : null}
                  {!cameraOn || audioOnly ? (
                    <span className="flex size-6 items-center justify-center border border-paper/20 bg-ink/80">
                      <CameraOff className="size-3 text-copper-light" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {sharing ? (
              <div className="mt-2.5 border border-brass/40 bg-paper/10 p-3 text-paper">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-brass">
                  <MonitorUp className="size-3.5" aria-hidden="true" />
                  Layar dibagikan
                </p>
                <p className="mt-1 text-[11px] text-paper/70">
                  Layar peserta tampil di sini selama berbagi berlangsung.
                </p>
              </div>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 border-t border-paper/15 pt-2.5">
              <ControlButton
                active={micOn}
                onClick={() => setMicOn((current) => !current)}
                label={micOn ? "Matikan mikrofon" : "Nyalakan mikrofon"}
              >
                {micOn ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
              </ControlButton>
              <ControlButton
                active={cameraOn && !audioOnly}
                onClick={() => setCameraOn((current) => !current)}
                label={cameraOn ? "Matikan kamera" : "Nyalakan kamera"}
                disabled={audioOnly}
              >
                {cameraOn && !audioOnly ? <Camera aria-hidden="true" /> : <CameraOff aria-hidden="true" />}
              </ControlButton>
              <ControlButton
                active={sharing}
                onClick={() => setSharing((current) => !current)}
                label={sharing ? "Hentikan berbagi layar" : "Bagikan layar"}
              >
                <MonitorUp aria-hidden="true" />
              </ControlButton>
              <ControlButton
                active={speakerOn}
                onClick={() => setSpeakerOn((current) => !current)}
                label={speakerOn ? "Matikan speaker" : "Nyalakan speaker"}
              >
                {speakerOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              </ControlButton>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 border-copper-dark bg-copper-dark text-paper hover:bg-copper"
                onClick={() => setEnded(true)}
              >
                <PhoneOff aria-hidden="true" />
                Akhiri
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-ink/20 bg-paper-2 px-3 py-2.5">
            <p className="flex items-center gap-2 text-[10.5px] text-ink-soft">
              <ShieldCheck className="size-4 text-moss" aria-hidden="true" />
              Rekaman mati. Panggilan ini tidak direkam oleh siapa pun.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAudioOnly((current) => !current)
                setCameraOn(false)
                toast(audioOnly ? "Mode video aktif" : "Beralih ke suara saja", {
                  description: audioOnly
                    ? "Kamera dapat dinyalakan kembali."
                    : "Kamera dimatikan. Panggilan tetap berjalan dengan suara.",
                })
              }}
            >
              {audioOnly ? "Kembali ke video" : "Suara saja"}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 xl:col-span-3">
          <Panel eyebrow="Peserta" title="Di ruang ini">
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center border border-ink/20 bg-teak font-heading text-[9px] text-paper">
                  BH
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold">Bambang Hardjono</span>
                  <span className="block text-[9px] text-ink-muted">Pengajar · Giriloyo</span>
                </span>
                <StatusStamp label="Hadir" tone="done" />
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center border border-ink/20 bg-panel font-heading text-[9px]">
                  AR
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold">Anisa Rahmawati</span>
                  <span className="block text-[9px] text-ink-muted">Peserta · BTG-06</span>
                </span>
                <StatusStamp label="Hadir" tone="done" />
              </li>
            </ul>
            <div className="mt-3 border-t border-ink/15 pt-2.5">
              <p className="flex items-center justify-between gap-2 text-[10px]">
                <span className="text-ink-muted">Kualitas</span>
                <span className="font-semibold">Baik · 48 ms</span>
              </p>
              <p className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                <span className="text-ink-muted">Durasi</span>
                <span className="font-semibold tabular-nums">08.41</span>
              </p>
            </div>
          </Panel>

          <Panel eyebrow="Konsen" title="Sebelum merekam">
            <p className="text-[10.5px] leading-relaxed text-ink-soft">
              Rekaman hanya untuk sengketa penilaian, atas persetujuan kedua pihak,
              dan disimpan 30 hari. Kamu bisa menolak tanpa kehilangan hak belajar.
            </p>
            <div className="mt-3 flex items-center gap-2 border border-ink/15 bg-panel/30 px-2.5 py-2">
              <Check className="size-3.5 text-moss" aria-hidden="true" />
              <span className="text-[10px] text-ink-soft">Tidak merekam</span>
            </div>
          </Panel>

          {can("calls.monitor") ? (
            <Panel eyebrow="Pengelola" title="Pemantauan">
              <p className="text-[10.5px] leading-relaxed text-ink-soft">
                Anda dapat melihat metadata panggilan. Bergabung memerlukan
                persetujuan peserta dan alasan dukungan.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={() =>
                  toast("Permintaan bergabung dikirim", {
                    description: "Kedua peserta harus menyetujui sebelum pengelola masuk.",
                  })
                }
              >
                Minta bergabung
              </Button>
            </Panel>
          ) : (
            <Panel eyebrow="Bantuan" title="Jika media gagal">
              <ol className="space-y-2">
                {[
                  "Coba beralih ke suara saja.",
                  "Periksa izin mikrofon dan jaringan.",
                  "Lanjutkan lewat pesan dan jadwalkan ulang.",
                ].map((item, index) => (
                  <li key={item} className="flex gap-2 text-[10px] leading-relaxed text-ink-soft">
                    <span className="font-heading text-copper-dark">0{index + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </aside>
      </div>
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
