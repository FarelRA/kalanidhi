"use client"

import * as React from "react"
import { Copy, KeyRound, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/workspace/data/page-header"
import { Panel } from "@/components/workspace/data/panel"
import { SegmentedTabs } from "@/components/workspace/data/segmented-tabs"
import { StatusStamp } from "@/components/workspace/data/status-stamp"
import { useViewer } from "@/components/workspace/shell/viewer-provider"
import { people } from "@/lib/workspace/mock-data"
import { cn } from "cn"

const integrations = [
  { id: "gateway", name: "Gerbang pembayaran", detail: "GoPay + QRIS · merchantid", status: "Terhubung", tone: "done" as const },
  { id: "email", name: "Email transaksional", detail: "Resend · domain terverifikasi", status: "Terhubung", tone: "done" as const },
  { id: "whatsapp", name: "WhatsApp", detail: "Waha · nomor secretariat", status: "Terhubung", tone: "done" as const },
  { id: "livekit", name: "LiveKit", detail: "Cloud · wilayah Singapura", status: "Terhubung", tone: "done" as const },
  { id: "storage", name: "Penyimpanan media", detail: "Convex storage · 18,4 GB", status: "Sehat", tone: "done" as const },
]

export function SettingsPanel() {
  const { can, profile } = useViewer()
  const admin = can("settings.platform")
  const [tab, setTab] = React.useState("profile")
  const [flags, setFlags] = React.useState({
    seller: true,
    calls: true,
    recordings: false,
    newCatalog: false,
    maintenance: false,
  })

  const tabs = [
    { id: "profile", label: "Profil" },
    { id: "notifications", label: "Pemberitahuan" },
    { id: "sessions", label: "Sesi" },
    ...(admin
      ? [
          { id: "team", label: "Tim" },
          { id: "integrations", label: "Integrasi" },
          { id: "flags", label: "Flag" },
          { id: "slas", label: "SLA" },
          { id: "api", label: "API" },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pengaturan"
        title={admin ? "Ruang, tim, dan integrasi." : "Profil dan preferensi."}
        description={
          admin
            ? "Profil pengelola, undangan tim, integrasi, flag rilis, ambang SLA, dan kunci API. Bagian 70/15/15 hanya ditampilkan, bukan diatur di sini."
            : "Nama, kontak, preferensi pemberitahuan, sesi perangkat, dan permintaan data. Rekening payout hanya jika kamu penjual."
        }
        actions={
          <Button
            onClick={() =>
              toast("Pengaturan disimpan", {
                description: "Perubahan profil disimpan dan dicatat di audit.",
              })
            }
          >
            <Save aria-hidden="true" />
            Simpan
          </Button>
        }
      />

      <SegmentedTabs
        tabs={tabs}
        value={tabs.some((item) => item.id === tab) ? tab : "profile"}
        onChange={setTab}
        ariaLabel="Pilih pengaturan"
      />

      {tab === "profile" ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel className="lg:col-span-7" eyebrow="Profil" title="Identitas">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="profile-name">Nama</Label>
                <Input id="profile-name" defaultValue={profile.user.name} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" type="email" defaultValue={profile.user.email} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="profile-region">Wilayah</Label>
                <Input id="profile-region" defaultValue={profile.user.region} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="profile-phone">WhatsApp</Label>
                <Input id="profile-phone" defaultValue="+62 812-2740-1188" className="mt-1.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="profile-bio">Tentang</Label>
                <Textarea
                  id="profile-bio"
                  defaultValue="Pengrajin batik tulis di Giriloyo. Sedang mendalami pewarnaan soga dan menyiapkan karya untuk Kartu Karya."
                  className="mt-1.5 min-h-24"
                />
              </div>
            </div>
            {can("payouts.view.own") ? (
              <div className="mt-5 border-t border-ink/15 pt-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-copper-dark">
                  Rekening payout
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="border border-ink/20 bg-panel/30 px-2.5 py-1.5 text-[11px]">
                    BCA · 8820 1144 27 · Anisa Rahmawati
                  </span>
                  <StatusStamp label="Terverifikasi" tone="done" />
                </div>
                <p className="mt-1.5 text-[9.5px] text-ink-muted">
                  Perubahan rekening memerlukan verifikasi ulang dan audit.
                </p>
              </div>
            ) : null}
          </Panel>

          <div className="space-y-4 lg:col-span-5">
            <Panel eyebrow="Konsen" title="Izin yang kamu beri">
              <ul className="space-y-2.5">
                {[
                  ["Pemberitahuan transaksi", true],
                  ["Pengingat jadwal via WhatsApp", true],
                  ["Partisipasi dalam wawancara", false],
                  ["Rekaman panggilan untuk sengketa", false],
                ].map(([label, active]) => (
                  <li key={String(label)} className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] text-ink-soft">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(active)}
                      aria-label={String(label)}
                      onClick={() => toast("Preferensi diperbarui", { description: String(label) })}
                      className="relative flex h-11 w-11 items-center justify-center"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 border transition-colors",
                          active ? "border-moss bg-moss" : "border-ink/30 bg-panel",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 size-3.5 bg-paper-2 transition-[left]",
                            active ? "left-6" : "left-1",
                          )}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel eyebrow="Data" title="Hak privasi">
              <p className="text-[10.5px] leading-relaxed text-ink-soft">
                Minta salinan data, koreksi, atau penghapusan sesuai kebijakan
                retensi. Permintaan dijawab maksimal 14 hari kerja.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => toast("Permintaan data dicatat", { description: "Tautan unduhan dikirim setelah diverifikasi." })}>
                  Minta salinan data
                </Button>
                <Button size="sm" variant="ghost" className="text-[#8a2e1f]" onClick={() => toast("Permintaan dihapus", { description: "Penghapusan mengikuti retensi ledger dan audit." })}>
                  Hapus akun
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "notifications" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Tugas dan penilaian", "Setiap tugas dinilai atau dikembalikan", true],
            ["Pesan langsung", "Pesan dari pengajar dan kohort", true],
            ["Pengingat sesi", "10 menit sebelum sesi dimulai", true],
            ["Ringkasan mingguan", "Setiap Senin pagi", false],
            ["Promosi jalur baru", "Saat jalur dibuka", false],
          ].map(([label, note, active]) => (
            <Panel key={String(label)} eyebrow="Pemberitahuan" title={String(label)}>
              <p className="text-[10.5px] leading-relaxed text-ink-muted">{note}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <StatusStamp label={active ? "Aktif" : "Mati"} tone={active ? "done" : "muted"} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast("Preferensi diperbarui", { description: String(label) })}
                >
                  Ubah
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}

      {tab === "sessions" ? (
        <Panel eyebrow="Perangkat" title="Sesi aktif">
          <ul className="divide-y divide-ink/10">
            {[
              ["Chrome · Android", "Yogyakarta · sekarang", "Aktif"],
              ["Safari · iPhone", "Yogyakarta · 2 hari lalu", "Aktif"],
              ["Chrome · Linux", "Yogyakarta · 9 hari lalu", "Kedaluwarsa"],
            ].map(([device, location, status]) => (
              <li key={String(device)} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-[11.5px] font-semibold text-ink">{device}</p>
                  <p className="mt-0.5 text-[10px] text-ink-muted">{location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusStamp label={String(status)} tone={status === "Aktif" ? "done" : "muted"} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toast("Sesi dicabut", { description: String(device) })}
                  >
                    Cabut
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {tab === "team" && admin ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel className="lg:col-span-8" eyebrow="Tim" title="Pengelola" bodyClassName="p-0">
            <ul className="divide-y divide-ink/10">
              {people
                .filter((person) => person.roles.includes("pengelola"))
                .map((person) => (
                  <li key={person.id} className="flex items-center gap-2.5 px-4 py-3">
                    <span className="flex size-8 items-center justify-center border border-ink/20 bg-panel/40 font-heading text-[9px] font-semibold">
                      {person.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-semibold">{person.name}</span>
                      <span className="mt-0.5 block text-[10px] text-ink-muted">{person.email}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusStamp label={person.mfa ? "MFA aktif" : "MFA tertunda"} tone={person.mfa ? "done" : "wait"} />
                      <Button size="sm" variant="ghost" onClick={() => toast("Peran ditinjau", { description: person.name })}>
                        Kelola
                      </Button>
                    </span>
                  </li>
                ))}
            </ul>
          </Panel>
          <div className="space-y-4 lg:col-span-4">
            <Panel eyebrow="Undangan" title="Tambah pengelola">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" placeholder="nama@kalanidhi.site" className="mt-1.5" />
              <p className="mt-1.5 text-[9.5px] leading-relaxed text-ink-muted">
                Undangan berlaku 48 jam. Pengelola baru wajib mengaktifkan MFA.
              </p>
              <Button size="sm" className="mt-3 w-full" onClick={() => toast("Undangan dikirim", { description: "Email undangan pengelola dikirim." })}>
                <Plus aria-hidden="true" />
                Kirim undangan
              </Button>
            </Panel>
            <Panel eyebrow="Referensi" title="Peran dan kemampuan">
              <p className="text-[10px] leading-relaxed text-ink-muted">
                Pengelola tidak mewarisi kemampuan mengirim tugas atau menilai.
                Pemisahan tugas ini disengaja.
              </p>
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "integrations" && admin ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => (
            <Panel key={integration.id} eyebrow="Integrasi" title={integration.name}>
              <p className="text-[10.5px] leading-relaxed text-ink-muted">{integration.detail}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <StatusStamp label={integration.status} tone={integration.tone} />
                <Button size="sm" variant="ghost" onClick={() => toast("Uji koneksi", { description: `${integration.name} merespons normal.` })}>
                  <RefreshCw aria-hidden="true" />
                  Uji
                </Button>
              </div>
            </Panel>
          ))}
          <Panel eyebrow="Webhook" title="Endpoint keluar">
            <p className="text-[10.5px] leading-relaxed text-ink-muted">
              2 endpoint aktif · tanda tangan HMAC · 2.140 pengiriman berhasil dari 2.145.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => toast("Endpoint ditambahkan", { description: "Rahasia ditampilkan sekali setelah dibuat." })}>
              Tambah endpoint
            </Button>
          </Panel>
        </div>
      ) : null}

      {tab === "flags" && admin ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["seller", "Ruang penjual", "Karya, pesanan, payout untuk pemegang sertifikat."],
              ["calls", "Panggilan suara dan video", "LiveKit, konsen, dan antrean panggilan."],
              ["recordings", "Rekaman sengketa", "Rekaman 30 hari dengan persetujuan dua pihak."],
              ["newCatalog", "Rak bahan baru", "Bagian katalog eksperimental di landing."],
              ["maintenance", "Mode pemeliharaan", "Landing menampilkan banner, ruang tetap terbuka."],
            ] as const
          ).map(([key, label, note]) => (
            <Panel key={key} eyebrow="Flag" title={label}>
              <p className="text-[10.5px] leading-relaxed text-ink-muted">{note}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <StatusStamp label={flags[key] ? "Aktif" : "Mati"} tone={flags[key] ? "done" : "muted"} />
                <button
                  type="button"
                  role="switch"
                  aria-checked={flags[key]}
                  aria-label={label}
                  onClick={() => setFlags((current) => ({ ...current, [key]: !current[key] }))}
                  className="relative flex h-11 w-11 items-center justify-center"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 border transition-colors",
                      flags[key] ? "border-moss bg-moss" : "border-ink/30 bg-panel",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 size-3.5 bg-paper-2 transition-[left]",
                        flags[key] ? "left-6" : "left-1",
                      )}
                    />
                  </span>
                </button>
              </div>
            </Panel>
          ))}
        </div>
      ) : null}

      {tab === "slas" && admin ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel eyebrow="Ambang" title="SLA operasi">
            <div className="grid gap-3">
              {[
                ["Penilaian pertama", "72 jam"],
                ["Respons dukungan", "2 jam"],
                ["Pencairan payout", "3 hari kerja"],
                ["Rekonsiliasi pembayaran", "20 menit"],
                ["Tinjauan karya", "2 hari"],
              ].map(([label, value]) => (
                <div key={String(label)} className="grid grid-cols-[1fr_120px] items-center gap-3">
                  <Label htmlFor={`sla-${label}`}>{label}</Label>
                  <Input id={`sla-${label}`} defaultValue={value} className="h-11" />
                </div>
              ))}
              <Button size="sm" className="mt-1" onClick={() => toast("SLA disimpan", { description: "Ambang baru berlaku untuk catatan baru." })}>
                Simpan ambang
              </Button>
            </div>
          </Panel>
          <Panel eyebrow="Bagi hasil" title="70 / 15 / 15">
            <div className="flex h-7 border border-ink/25" aria-hidden="true">
              <span className="h-full bg-copper-dark" style={{ width: "70%" }} />
              <span className="h-full bg-ink" style={{ width: "15%" }} />
              <span className="h-full bg-moss" style={{ width: "15%" }} />
            </div>
            <div className="mt-2 grid grid-cols-3 text-center text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
              <span>Pengajar 70%</span>
              <span>Platform 15%</span>
              <span>Komunitas 15%</span>
            </div>
            <p className="mt-3 border-t border-ink/15 pt-2.5 text-[10px] leading-relaxed text-ink-muted">
              Dihitung sistem dari bruto. Tidak ada editor per transaksi. Biaya
              gerbang diserap dari bagian platform.
            </p>
          </Panel>
        </div>
      ) : null}

      {tab === "api" && admin ? (
        <Panel eyebrow="API" title="Kunci integrasi">
          <ul className="divide-y divide-ink/10">
            {[
              ["gateway-webhook", "payments:write", "Terakhir dipakai 42 detik lalu"],
              ["ops-export", "orders:read, payouts:read", "Terakhir dipakai 2 hari lalu"],
              ["livekit-token", "calls:token", "Terakhir dipakai 18 menit lalu"],
            ].map(([name, scope, note]) => (
              <li key={String(name)} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-[11.5px] font-semibold">{name}</p>
                  <p className="mt-0.5 text-[9.5px] text-ink-muted">
                    {scope} · {note}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => toast("Kunci disalin", { description: "Hanya awalan yang ditampilkan setelah dibuat." })}>
                    <Copy aria-hidden="true" />
                    Salin
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast("Kunci diputar", { description: "Kunci lama tetap berlaku 24 jam." })}>
                    <RefreshCw aria-hidden="true" />
                    Putar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/15 pt-3">
            <Button size="sm" onClick={() => toast("Kunci baru", { description: "Kunci hanya ditampilkan sekali." })}>
              <KeyRound aria-hidden="true" />
              Buat kunci
            </Button>
            <Button size="sm" variant="ghost" className="text-[#8a2e1f]" onClick={() => toast("Kunci dicabut", { description: "Pencabutan langsung berlaku." })}>
              <Trash2 aria-hidden="true" />
              Cabut kunci
            </Button>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[9.5px] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-moss" aria-hidden="true" />
            Rahasia tidak pernah ditampilkan penuh di antarmuka, tidak masuk log, dan
            disimpan terenkripsi di server.
          </p>
        </Panel>
      ) : null}
    </div>
  )
}
