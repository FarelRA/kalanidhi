"use client"

import * as React from "react"
import { Copy, KeyRound, Plus, RefreshCw, Save, ShieldCheck } from "lucide-react"
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
import {
  API_KEY_STATUS_LABELS,
  CONSENT_KINDS,
  CONSENT_KIND_LABELS,
  INTEGRATION_LABELS,
  INTEGRATION_STATUS_LABELS,
  INTEGRATION_STATUS_TONES,
  NOTIFICATION_KEYS,
  NOTIFICATION_LABELS,
  WEBHOOK_DELIVERY_STATUS_LABELS,
  WEBHOOK_DELIVERY_STATUS_TONES,
  WEBHOOK_STATUS_LABELS,
} from "@/lib/settings/options"
import type { AdminSettingsState } from "@/lib/settings/types"
import { SPLIT_PERCENTAGES } from "@/lib/commerce/money"

const tabs = [
  { id: "profile", label: "Profil" },
  { id: "notifications", label: "Pemberitahuan" },
  { id: "sessions", label: "Sesi" },
]

const adminTabs = [
  { id: "team", label: "Tim" },
  { id: "integrations", label: "Integrasi" },
  { id: "flags", label: "Flag" },
  { id: "slas", label: "SLA" },
  { id: "api", label: "API" },
  { id: "webhooks", label: "Webhook" },
  { id: "templates", label: "Template" },
  { id: "platform", label: "Platform" },
]

function integrationLabel(key: string): string {
  return INTEGRATION_LABELS[key as keyof typeof INTEGRATION_LABELS] ?? key
}

function deliveryTone(
  status: keyof typeof WEBHOOK_DELIVERY_STATUS_TONES,
) {
  return WEBHOOK_DELIVERY_STATUS_TONES[status]
}

export function SettingsPanelLive() {
  const { can } = useViewer()
  const admin = can("settings.platform")
  const profile = useQuery(api.settings.profile)
  const adminState = useQuery(api.settings.adminState, admin ? {} : "skip")
  const deliveries = useQuery(
    api.notifications.listDeliveries,
    admin ? { limit: 20 } : "skip",
  )
  const updateProfile = useMutation(api.settings.updateProfile)
  const updatePreferences = useMutation(api.settings.updatePreferences)
  const setConsent = useMutation(api.settings.setConsent)
  const revokeSession = useMutation(api.settings.revokeSession)
  const updateSetting = useMutation(api.settings.updateSetting)
  const setFeatureFlag = useMutation(api.settings.setFeatureFlag)
  const createApiKey = useMutation(api.settings.createApiKey)
  const rotateApiKey = useMutation(api.settings.rotateApiKey)
  const revokeApiKey = useMutation(api.settings.revokeApiKey)
  const createWebhook = useMutation(api.settings.createWebhookEndpoint)
  const setWebhookStatus = useMutation(api.settings.setWebhookStatus)
  const saveTemplate = useMutation(api.settings.saveNotificationTemplate)
  const saveSla = useMutation(api.flows.saveSlaPolicy)
  const invite = useMutation(api.users.invite)

  const [tab, setTab] = React.useState("profile")
  const [profileDraft, setProfileDraft] = React.useState<{
    name: string
    region: string
    whatsapp: string
    bio: string
  } | null>(null)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteToken, setInviteToken] = React.useState("")
  const [newKeyName, setNewKeyName] = React.useState("")
  const [newKeyScopes, setNewKeyScopes] = React.useState("orders:read")
  const [issuedKey, setIssuedKey] = React.useState("")
  const [webhookName, setWebhookName] = React.useState("")
  const [webhookUrl, setWebhookUrl] = React.useState("")
  const [webhookEvents, setWebhookEvents] = React.useState("order.paid")
  const [issuedSecret, setIssuedSecret] = React.useState("")
  const [templateKey, setTemplateKey] = React.useState("support.reply")
  const [templateBody, setTemplateBody] = React.useState("")
  const [platformDraft, setPlatformDraft] = React.useState<{
    maintenance: string
    banner: string
  } | null>(null)

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

  if (!profile) {
    return <EmptyState title="Memuat pengaturan" description="Membaca profil dari Convex." />
  }

  const draft = profileDraft ?? {
    name: profile.name,
    region: profile.region,
    whatsapp: profile.preferences.whatsapp ?? "",
    bio: profile.preferences.bio ?? "",
  }
  const platformMessages = platformDraft ?? {
    maintenance: adminState?.maintenance.message ?? "",
    banner: adminState?.banner.message ?? "",
  }

  const availableTabs = admin ? [...tabs, ...adminTabs] : tabs
  const activeTab = availableTabs.some((item) => item.id === tab) ? tab : "profile"

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pengaturan"
        title={admin ? "Ruang, tim, dan integrasi." : "Profil dan preferensi."}
        description={
          admin
            ? `Profil, undangan tim, integrasi, flag rilis, ambang SLA, kunci API, webhook, dan template. Rahasia hanya ditampilkan sekali. ${SPLIT_PERCENTAGES.teacher}/${SPLIT_PERCENTAGES.platform}/${SPLIT_PERCENTAGES.community} hanya ditampilkan.`
            : "Nama, kontak, preferensi pemberitahuan, sesi perangkat, dan permintaan data."
        }
        actions={
          <Button
            onClick={() =>
              void run(
                () => updateProfile({ name: draft.name, region: draft.region }),
                "Profil disimpan dan dicatat di audit.",
              )
            }
          >
            <Save aria-hidden="true" />
            Simpan profil
          </Button>
        }
      />

      <SegmentedTabs
        tabs={availableTabs}
        value={activeTab}
        onChange={setTab}
        ariaLabel="Pilih pengaturan"
      />

      {activeTab === "profile" ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel className="lg:col-span-7" eyebrow="Profil" title="Identitas">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="profile-name">Nama</Label>
                <Input
                  id="profile-name"
                  value={draft.name}
                  onChange={(event) =>
                    setProfileDraft({ ...draft, name: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={profile.email} readOnly className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="profile-region">Wilayah</Label>
                <Input
                  id="profile-region"
                  value={draft.region}
                  onChange={(event) =>
                    setProfileDraft({ ...draft, region: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="profile-phone">WhatsApp</Label>
                <Input
                  id="profile-phone"
                  value={draft.whatsapp}
                  onChange={(event) =>
                    setProfileDraft({ ...draft, whatsapp: event.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="profile-bio">Tentang</Label>
                <Textarea
                  id="profile-bio"
                  value={draft.bio}
                  onChange={(event) =>
                    setProfileDraft({ ...draft, bio: event.target.value })
                  }
                  className="mt-1.5 min-h-24"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="mt-3"
              onClick={() =>
                void run(
                  () =>
                    updatePreferences({
                      whatsapp: draft.whatsapp,
                      bio: draft.bio,
                      locale: profile.preferences.locale,
                      timezone: profile.preferences.timezone,
                      dataSaver: profile.preferences.dataSaver,
                      notifications: profile.preferences.notifications,
                    }),
                  "Preferensi disimpan.",
                )
              }
            >
              Simpan preferensi
            </Button>
          </Panel>

          <div className="space-y-4 lg:col-span-5">
            <Panel eyebrow="Konsen" title="Izin yang kamu beri">
              <ul className="space-y-2.5">
                {CONSENT_KINDS.map((kind) => {
                  const latest = profile.consents.find((consent) => consent.kind === kind)
                  const active = latest?.granted ?? false
                  return (
                    <li key={kind} className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-ink-soft">
                        {CONSENT_KIND_LABELS[kind]}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void run(
                            () => setConsent({ kind, granted: !active }),
                            "Konsen diperbarui.",
                          )
                        }
                      >
                        {active ? "Cabut" : "Beri"}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </Panel>
            <Panel eyebrow="Data" title="Hak privasi">
              <p className="text-[10.5px] leading-relaxed text-ink-soft">
                Minta salinan, koreksi, penghapusan, atau retensi lewat tata kelola.
                Penghapusan mempertahankan catatan keuangan dan audit sesuai retensi.
              </p>
              <Button size="sm" variant="outline" className="mt-3" asChild>
                <a href="/ruang/tata-kelola">Buka tata kelola</a>
              </Button>
            </Panel>
          </div>
        </div>
      ) : null}

      {activeTab === "notifications" ? (
        <Panel eyebrow="Pemberitahuan" title="Preferensi kanal">
          <div className="grid gap-3 md:grid-cols-2">
            {NOTIFICATION_KEYS.map((key) => {
              const active = profile.preferences.notifications[key]
              return (
                <div key={key} className="flex items-center justify-between gap-2 border border-ink/15 bg-paper/40 p-3">
                  <div>
                    <p className="text-[11px] font-semibold text-ink">{NOTIFICATION_LABELS[key]}</p>
                    <StatusStamp className="mt-1" label={active ? "Aktif" : "Mati"} tone={active ? "done" : "muted"} />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(
                        () =>
                          updatePreferences({
                            whatsapp: profile.preferences.whatsapp ?? undefined,
                            bio: profile.preferences.bio ?? undefined,
                            locale: profile.preferences.locale,
                            timezone: profile.preferences.timezone,
                            dataSaver: profile.preferences.dataSaver,
                            notifications: {
                              ...profile.preferences.notifications,
                              [key]: !active,
                            },
                          }),
                        "Preferensi pemberitahuan disimpan.",
                      )
                    }
                  >
                    Ubah
                  </Button>
                </div>
              )
            })}
          </div>
        </Panel>
      ) : null}

      {activeTab === "sessions" ? (
        <Panel eyebrow="Perangkat" title="Sesi aktif">
          <ul className="divide-y divide-ink/10">
            {profile.sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-[11.5px] font-semibold text-ink">{session.deviceName}</p>
                  <p className="mt-0.5 text-[10px] text-ink-muted">
                    {session.revokedAt
                      ? "Dicabut"
                      : new Intl.DateTimeFormat("id-ID", {
                          timeZone: "Asia/Jakarta",
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(session.lastSeenAt))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusStamp label={session.revokedAt ? "Dicabut" : "Aktif"} tone={session.revokedAt ? "muted" : "done"} />
                  {!session.revokedAt ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void run(
                          () =>
                            revokeSession({
                              sessionId: session.id as Id<"sessions">,
                              reason: "Dicabut dari halaman pengaturan.",
                            }),
                          "Sesi dicabut.",
                        )
                      }
                    >
                      Cabut
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
            {profile.sessions.length === 0 ? (
              <li className="py-8 text-center text-[11px] text-ink-muted">
                Belum ada sesi tercatat.
              </li>
            ) : null}
          </ul>
        </Panel>
      ) : null}

      {admin && activeTab === "team" && adminState ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel className="lg:col-span-8" eyebrow="Tim" title="Pengelola" bodyClassName="p-0">
            <ul className="divide-y divide-ink/10">
              {adminState.team.map((member) => (
                <li key={member.id} className="flex items-center gap-2.5 px-4 py-3">
                  <span className="flex size-8 items-center justify-center border border-ink/20 bg-panel/40 font-heading text-[9px] font-semibold">
                    {member.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-semibold">{member.name}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-muted">{member.email}</span>
                  </span>
                  <StatusStamp label={member.status} tone={member.status === "active" ? "done" : "wait"} />
                </li>
              ))}
            </ul>
            {adminState.invites.length > 0 ? (
              <ul className="border-t border-ink/10 px-4 py-2">
                {adminState.invites.map((pending) => (
                  <li key={pending.id} className="py-1.5 text-[10px] text-ink-muted">
                    Undangan {pending.email} · {pending.roles.join(", ")} · berlaku sampai{" "}
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "short" }).format(new Date(pending.expiresAt))}
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
          <div className="space-y-4 lg:col-span-4">
            <Panel eyebrow="Undangan" title="Tambah pengelola">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="nama@email.com"
                className="mt-1.5"
              />
              <Button
                size="sm"
                className="mt-3 w-full"
                disabled={!inviteEmail.includes("@")}
                onClick={() =>
                  void run(async () => {
                    const result = await invite({
                      email: inviteEmail,
                      roles: ["admin"],
                      reason: "Undangan pengelola dari pengaturan.",
                    })
                    setInviteToken(result.token)
                    setInviteEmail("")
                  }, "Undangan dibuat. Tautan ditampilkan sekali.")
                }
              >
                <Plus aria-hidden="true" />
                Kirim undangan
              </Button>
              {inviteToken ? (
                <p className="mt-2 break-all border border-brass/40 bg-brass/10 p-2 text-[9px] text-ink-soft">
                  Token undangan: {inviteToken}
                </p>
              ) : null}
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

      {admin && activeTab === "integrations" && adminState ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminState.integrations.map((integration) => (
            <Panel key={integration.integration} eyebrow="Integrasi" title={integrationLabel(integration.integration)}>
              <p className="text-[10.5px] leading-relaxed text-ink-muted">
                {integration.message ?? "Belum ada laporan kesehatan."}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <StatusStamp
                  label={INTEGRATION_STATUS_LABELS[integration.status]}
                  tone={INTEGRATION_STATUS_TONES[integration.status]}
                />
                <span className="text-[9px] text-ink-muted">
                  {integration.checkedAt
                    ? new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(new Date(integration.checkedAt))
                    : "belum diperiksa"}
                </span>
              </div>
            </Panel>
          ))}
          <Panel eyebrow="Gerbang" title="Status pembayaran">
            <p className="text-[10.5px] leading-relaxed text-ink-muted">
              Kesehatan gerbang bersifat baca saja. Tidak ada kunci, token sesi,
              atau payload QRIS yang ditampilkan di sini.
            </p>
          </Panel>
        </div>
      ) : null}

      {admin && activeTab === "flags" && adminState ? (
        <div className="grid gap-4 md:grid-cols-2">
          {adminState.flags.map((flag) => (
            <Panel key={flag.id} eyebrow="Flag" title={flag.key}>
              <p className="text-[10.5px] leading-relaxed text-ink-muted">{flag.description}</p>
              <p className="mt-1 text-[9px] text-ink-muted">
                Terakhir diperbarui oleh{" "}
                {flag.updatedByName ?? "Akun tidak ditemukan"} ·{" "}
                {formatDateTime(flag.updatedAt)}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <StatusStamp label={flag.enabled ? "Aktif" : "Mati"} tone={flag.enabled ? "done" : "muted"} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void run(
                      () =>
                        setFeatureFlag({
                          key: flag.key,
                          description: flag.description,
                          enabled: !flag.enabled,
                          rolloutPercent: flag.rolloutPercent,
                          reason: "Perubahan flag dari halaman pengaturan.",
                        }),
                      "Flag diperbarui dan dicatat.",
                    )
                  }
                >
                  {flag.enabled ? "Matikan" : "Aktifkan"}
                </Button>
              </div>
            </Panel>
          ))}
          {adminState.flags.length === 0 ? (
            <EmptyState title="Belum ada flag" description="Flag rilis akan tampil di sini setelah dibuat." />
          ) : null}
        </div>
      ) : null}

      {admin && activeTab === "slas" && adminState ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel eyebrow="Ambang" title="SLA operasi">
            <div className="grid gap-3">
              {adminState.slas.map((sla) => (
                <SlaRow
                  key={sla.key}
                  sla={sla}
                  onSave={(targetMinutes) =>
                    run(
                      () =>
                        saveSla({
                          flowKey: sla.flowKey,
                          key: sla.key,
                          name: sla.name,
                          targetMinutes,
                          escalationMinutes: sla.escalationMinutes ?? undefined,
                        }),
                      "SLA disimpan.",
                    )
                  }
                />
              ))}
              {adminState.slas.length === 0 ? (
                <p className="text-[10.5px] text-ink-muted">
                  Belum ada SLA tersimpan. Definisi bawaan dipakai oleh antrean.
                </p>
              ) : null}
            </div>
          </Panel>
          <Panel
            eyebrow="Bagi hasil"
            title={`${adminState.revenueSplit.teacher} / ${adminState.revenueSplit.platform} / ${adminState.revenueSplit.community}`}
          >
            <div className="flex h-7 border border-ink/25" aria-hidden="true">
              <span
                className="h-full bg-copper-dark"
                style={{ width: `${adminState.revenueSplit.teacher}%` }}
              />
              <span
                className="h-full bg-ink"
                style={{ width: `${adminState.revenueSplit.platform}%` }}
              />
              <span
                className="h-full bg-moss"
                style={{ width: `${adminState.revenueSplit.community}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 text-center text-[9px] font-bold uppercase tracking-[0.05em] text-ink-muted">
              <span>Pengajar {adminState.revenueSplit.teacher}%</span>
              <span>Platform {adminState.revenueSplit.platform}%</span>
              <span>Komunitas {adminState.revenueSplit.community}%</span>
            </div>
            <p className="mt-3 border-t border-ink/15 pt-2.5 text-[10px] leading-relaxed text-ink-muted">
              {adminState.revenueSplit.note}
            </p>
          </Panel>
        </div>
      ) : null}

      {admin && activeTab === "api" && adminState ? (
        <Panel eyebrow="API" title="Kunci integrasi">
          <ul className="divide-y divide-ink/10">
            {adminState.apiKeys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-[11.5px] font-semibold">{key.name}</p>
                  <p className="mt-0.5 text-[9.5px] text-ink-muted">
                    {key.keyPrefix ?? "tanpa awalan"} · {key.scopes.join(", ")} · {key.status}
                  </p>
                  <p className="mt-0.5 text-[9px] text-ink-muted">
                    {key.rotatedFrom
                      ? `Diputar dari ${key.rotatedFrom}`
                      : "Belum pernah diputar"}
                    {key.rotatedTo ? ` · digantikan oleh ${key.rotatedTo}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusStamp label={API_KEY_STATUS_LABELS[key.status]} tone={key.status === "active" ? "done" : "muted"} />
                  {key.status === "active" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void run(async () => {
                            const result = await rotateApiKey({
                              keyId: key.id as Id<"apiKeys">,
                              reason: "Rotasi dari halaman pengaturan.",
                            })
                            setIssuedKey(result.token)
                          }, "Kunci diputar. Token baru ditampilkan sekali.")
                        }
                      >
                        <RefreshCw aria-hidden="true" />
                        Putar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void run(
                            () =>
                              revokeApiKey({
                                keyId: key.id as Id<"apiKeys">,
                                reason: "Pencabutan dari halaman pengaturan.",
                              }),
                            "Kunci dicabut.",
                          )
                        }
                      >
                        Cabut
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 border-t border-ink/15 pt-3 md:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor="api-name">Nama kunci</Label>
              <Input id="api-name" value={newKeyName} onChange={(event) => setNewKeyName(event.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="api-scopes">Scope, pisahkan koma</Label>
              <Input id="api-scopes" value={newKeyScopes} onChange={(event) => setNewKeyScopes(event.target.value)} className="mt-1.5" />
            </div>
            <Button
              className="mt-6"
              disabled={!newKeyName.trim()}
              onClick={() =>
                void run(async () => {
                  const result = await createApiKey({
                    name: newKeyName,
                    scopes: newKeyScopes.split(",").map((scope) => scope.trim()).filter(Boolean),
                    reason: "Kunci baru dari pengaturan.",
                  })
                  setIssuedKey(result.token)
                  setNewKeyName("")
                }, "Kunci dibuat. Token hanya ditampilkan sekali.")
              }
            >
              <KeyRound aria-hidden="true" />
              Buat kunci
            </Button>
          </div>
          {issuedKey ? (
            <div className="mt-3 border border-brass/40 bg-brass/10 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Token baru — salin sekarang, tidak ditampilkan lagi
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-ink">{issuedKey}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  void navigator.clipboard.writeText(issuedKey)
                  toast("Token disalin")
                }}
              >
                <Copy aria-hidden="true" />
                Salin
              </Button>
            </div>
          ) : null}
          <p className="mt-3 flex items-start gap-2 text-[9.5px] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-moss" aria-hidden="true" />
            Rahasia tidak pernah ditampilkan penuh di daftar, tidak masuk log, dan hanya
            hash yang disimpan.
          </p>
        </Panel>
      ) : null}

      {admin && activeTab === "webhooks" && adminState ? (
        <div className="space-y-4">
        <Panel eyebrow="Webhook" title="Endpoint keluar">
          <ul className="divide-y divide-ink/10">
            {adminState.webhooks.map((endpoint) => (
              <li key={endpoint.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-[11.5px] font-semibold">{endpoint.name}</p>
                  <p className="mt-0.5 break-all text-[9.5px] text-ink-muted">
                    {endpoint.url} · {endpoint.events.join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusStamp label={WEBHOOK_STATUS_LABELS[endpoint.status]} tone={endpoint.status === "active" ? "done" : "muted"} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(
                        () =>
                          setWebhookStatus({
                            endpointId: endpoint.id as Id<"webhookEndpoints">,
                            status: endpoint.status === "active" ? "paused" : "active",
                            reason: "Status webhook diubah dari pengaturan.",
                          }),
                        "Status webhook diperbarui.",
                      )
                    }
                  >
                    {endpoint.status === "active" ? "Jeda" : "Aktifkan"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 border-t border-ink/15 pt-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <Label htmlFor="webhook-name">Nama</Label>
              <Input id="webhook-name" value={webhookName} onChange={(event) => setWebhookName(event.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="webhook-url">URL HTTPS</Label>
              <Input id="webhook-url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="webhook-events">Event</Label>
              <Input id="webhook-events" value={webhookEvents} onChange={(event) => setWebhookEvents(event.target.value)} className="mt-1.5" />
            </div>
            <Button
              className="mt-6"
              disabled={!webhookName.trim() || !webhookUrl.trim()}
              onClick={() =>
                void run(async () => {
                  const result = await createWebhook({
                    name: webhookName,
                    url: webhookUrl,
                    events: webhookEvents.split(",").map((event) => event.trim()).filter(Boolean),
                  })
                  setIssuedSecret(result.secret)
                  setWebhookName("")
                  setWebhookUrl("")
                }, "Endpoint dibuat. Rahasia hanya ditampilkan sekali.")
              }
            >
              Tambah endpoint
            </Button>
          </div>
          {issuedSecret ? (
            <div className="mt-3 border border-brass/40 bg-brass/10 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Rahasia penandatanganan — salin sekarang
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-ink">{issuedSecret}</p>
            </div>
          ) : null}
        </Panel>
        <Panel eyebrow="Pengiriman webhook" title="Riwayat pengiriman">
          {deliveries === undefined ? (
            <p className="text-[10.5px] text-ink-muted">Memuat riwayat pengiriman…</p>
          ) : deliveries.length === 0 ? (
            <EmptyState
              title="Belum ada pengiriman webhook"
              description="Baris akan muncul setelah peristiwa seperti order.paid diantrekan untuk endpoint aktif."
            />
          ) : (
            <ul className="divide-y divide-ink/10">
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11.5px] font-semibold">{delivery.event}</p>
                      <p className="mt-0.5 text-[9.5px] text-ink-muted">
                        {delivery.endpointName} · percobaan {delivery.attempts}
                        {delivery.responseStatus
                          ? ` · HTTP ${delivery.responseStatus}`
                          : ""}
                      </p>
                    </div>
                    <StatusStamp
                      label={WEBHOOK_DELIVERY_STATUS_LABELS[delivery.status]}
                      tone={deliveryTone(delivery.status)}
                    />
                  </div>
                  {delivery.error ? (
                    <p className="mt-1 text-[9.5px] text-[#9a3423]">{delivery.error}</p>
                  ) : null}
                  <p className="mt-1 text-[9px] text-ink-muted">
                    Dibuat{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(delivery.createdAt))}
                    {delivery.lastAttemptAt
                      ? ` · terakhir ${new Intl.DateTimeFormat("id-ID", {
                          timeStyle: "short",
                        }).format(new Date(delivery.lastAttemptAt))}`
                      : ""}
                    {delivery.nextAttemptAt
                      ? ` · berikutnya ${new Intl.DateTimeFormat("id-ID", {
                          timeStyle: "short",
                        }).format(new Date(delivery.nextAttemptAt))}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        </div>
      ) : null}

      {admin && activeTab === "templates" && adminState ? (
        <Panel eyebrow="Template" title="Notifikasi">
          <ul className="divide-y divide-ink/10">
            {adminState.templates.map((template) => (
              <li key={template.id} className="py-2.5">
                <p className="text-[11px] font-semibold">{template.key} · {template.channel}</p>
                <p className="mt-0.5 text-[10px] text-ink-muted">{template.subject ?? "Tanpa subjek"}</p>
                <p className="mt-1 line-clamp-2 text-[10px] text-ink-soft">{template.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 border-t border-ink/15 pt-3">
            <div>
              <Label htmlFor="template-key">Kunci</Label>
              <Input id="template-key" value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="template-body">Isi</Label>
              <Textarea id="template-body" value={templateBody} onChange={(event) => setTemplateBody(event.target.value)} className="mt-1.5 min-h-20" />
            </div>
            <Button
              size="sm"
              disabled={!templateKey.trim() || templateBody.trim().length < 4}
              onClick={() =>
                void run(async () => {
                  await saveTemplate({
                    key: templateKey,
                    channel: "in_app",
                    body: templateBody,
                  })
                  setTemplateBody("")
                }, "Template disimpan.")
              }
            >
              Simpan template
            </Button>
          </div>
        </Panel>
      ) : null}

      {admin && activeTab === "platform" && adminState ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel eyebrow="Pemeliharaan" title="Mode dan banner">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] text-ink-soft">Mode pemeliharaan</span>
                <StatusStamp label={adminState.maintenance.enabled ? "Aktif" : "Mati"} tone={adminState.maintenance.enabled ? "danger" : "muted"} />
              </div>
              <Textarea
                value={platformMessages.maintenance}
                onChange={(event) =>
                  setPlatformDraft({
                    ...platformMessages,
                    maintenance: event.target.value,
                  })
                }
                className="min-h-16 text-[11px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void run(
                    () =>
                      updateSetting({
                        key: "platform.maintenance",
                        value: { enabled: !adminState.maintenance.enabled, message: platformMessages.maintenance },
                        reason: "Mode pemeliharaan diubah dari pengaturan.",
                      }),
                    "Mode pemeliharaan diperbarui.",
                  )
                }
              >
                Simpan mode
              </Button>
              <Textarea
                value={platformMessages.banner}
                onChange={(event) =>
                  setPlatformDraft({
                    ...platformMessages,
                    banner: event.target.value,
                  })
                }
                className="min-h-16 text-[11px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void run(
                    () =>
                      updateSetting({
                        key: "platform.banner",
                        value: { enabled: !adminState.banner.enabled, message: platformMessages.banner },
                        reason: "Banner publik diubah dari pengaturan.",
                      }),
                    "Banner publik diperbarui.",
                  )
                }
              >
                Simpan banner
              </Button>
            </div>
          </Panel>
          <Panel eyebrow="Wilayah" title="Wilayah dan zona waktu">
            <p className="text-[10.5px] leading-relaxed text-ink-soft">
              Basis layanan: {adminState.regions.join(", ")}. Zona waktu {adminState.timezone}.
            </p>
            <p className="mt-2 text-[9.5px] leading-relaxed text-ink-muted">
              Klaim cakupan nasional tidak dipakai. Praktisi dari wilayah lain dapat
              mengajukan jalur.
            </p>
          </Panel>
          <Panel
            className="lg:col-span-2"
            eyebrow="Nilai tersimpan"
            title="Pengaturan platform"
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-ink/10">
              {adminState.settings.map((setting) => (
                <li key={setting.key} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11.5px] font-semibold">{setting.label}</p>
                    <span className="text-[9px] text-ink-muted">
                      {setting.key}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-[10px] text-ink-soft">
                    {formatSettingValue(setting.value)}
                  </p>
                  <p className="mt-1 text-[9px] text-ink-muted">
                    Terakhir diperbarui oleh{" "}
                    {setting.updatedByName ?? "Akun tidak ditemukan"}
                    {setting.updatedAt
                      ? ` · ${formatDateTime(setting.updatedAt)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
            {adminState.settings.length === 0 ? (
              <p className="px-4 py-6 text-center text-[11px] text-ink-muted">
                Belum ada pengaturan platform tersimpan.
              </p>
            ) : null}
          </Panel>
        </div>
      ) : null}
    </div>
  )
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp))
}

function formatSettingValue(value: unknown): string {
  if (value === null || value === undefined) return "Belum diisi"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

function SlaRow({
  sla,
  onSave,
}: {
  sla: AdminSettingsState["slas"][number]
  onSave: (targetMinutes: number) => Promise<void>
}) {
  const [value, setValue] = React.useState(String(sla.targetMinutes))
  return (
    <div className="grid grid-cols-[1fr_120px_auto] items-center gap-3">
      <Label htmlFor={`sla-${sla.key}`}>{sla.name}</Label>
      <Input
        id={`sla-${sla.key}`}
        type="number"
        min={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-11"
      />
      <Button size="sm" onClick={() => void onSave(Number(value))}>
        Simpan
      </Button>
    </div>
  )
}
