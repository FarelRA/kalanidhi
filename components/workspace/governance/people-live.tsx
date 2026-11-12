"use client"

import * as React from "react"
import { ArrowRight, ShieldCheck, UserPlus } from "lucide-react"
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
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { PersonSummary } from "@/lib/admin/types"
import type { StatusTone } from "@/lib/workspace/types"
import { useMutation, useQuery } from "convex/react"

function roleTone(status: PersonSummary["status"]): StatusTone {
  if (status === "active") return "done"
  if (status === "suspended") return "danger"
  if (status === "invited") return "wait"
  return "muted"
}

function teacherTone(status: PersonSummary["teacherStatus"]): StatusTone {
  if (status === "active") return "done"
  if (status === "suspended") return "danger"
  return "wait"
}

type ReasonAction = {
  title: string
  description: string
  label: string
  run: (reason: string) => Promise<void>
}

export function PeopleLive() {
  const [tab, setTab] = React.useState<"users" | "teachers" | "team">("users")
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Id<"users"> | null>(null)
  const [action, setAction] = React.useState<ReasonAction | null>(null)
  const [reason, setReason] = React.useState("")
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<"teacher" | "admin">("teacher")
  const [inviteReason, setInviteReason] = React.useState("")
  const [inviteToken, setInviteToken] = React.useState<string | null>(null)

  const rows = useQuery(api.people.list, { tab, q: query || undefined })
  const invite = useMutation(api.users.invite)

  function runAction(next: ReasonAction) {
    setAction(next)
    setReason("")
  }

  async function submitAction() {
    if (!action) return
    if (reason.trim().length < 4) {
      toast("Alasan terlalu pendek")
      return
    }
    try {
      await action.run(reason.trim())
      toast(action.label)
      setAction(null)
      setReason("")
    } catch (error) {
      toast("Tindakan gagal", {
        description: error instanceof Error ? error.message : "Coba lagi.",
      })
    }
  }

  async function sendInvite() {
    try {
      const result = await invite({
        email: inviteEmail,
        roles: [inviteRole],
        reason: inviteReason,
      })
      setInviteToken(result.token)
      toast("Undangan dibuat", {
        description: "Token ditampilkan sekali. Kirim melalui kanal aman.",
      })
    } catch (error) {
      toast("Undangan gagal", {
        description: error instanceof Error ? error.message : "Periksa email dan peran.",
      })
    }
  }

  const columns: Column<PersonSummary>[] = [
    {
      id: "name",
      header: "Akun",
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.name}</p>
          <p className="mt-0.5 text-[10px] text-ink-muted">{row.email}</p>
        </div>
      ),
    },
    {
      id: "role",
      header: "Peran",
      cell: (row) => (
        <div className="space-y-1">
          <p className="text-[10.5px] text-ink-soft">{row.roleLabel}</p>
          {row.roles.map((role) => (
            <StatusStamp key={role} label={role} tone="muted" />
          ))}
        </div>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp label={row.status} tone={roleTone(row.status)} />
      ),
    },
    {
      id: "teacher",
      header: "Pengajar",
      cell: (row) =>
        row.teacherStatus ? (
          <div className="space-y-1">
            <StatusStamp
              label={row.teacherStatus}
              tone={teacherTone(row.teacherStatus)}
            />
            <p className="text-[9.5px] text-ink-muted">
              {row.teacherPublished ? "Tampil publik" : "Belum tampil"}
            </p>
          </div>
        ) : (
          <span className="text-[10px] text-ink-muted">—</span>
        ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "region",
      header: "Wilayah",
      cell: (row) => (
        <span className="text-[10.5px] text-ink-soft">{row.region || "—"}</span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "sessions",
      header: "Sesi",
      cell: (row) => (
        <span className="text-[11px] tabular-nums text-ink">{row.sessions}</span>
      ),
      align: "right",
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => setSelected(row.id as Id<"users">)}>
          Buka
          <ArrowRight aria-hidden="true" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orang"
        title="Akun, peran, dan verifikasi."
        description="Satu direktori untuk peserta, pengajar, dan tim pengelola. Setiap perubahan peran, penangguhan, dan verifikasi menulis entri audit."
        meta={
          <span className="text-[10px] text-ink-muted">
            {rows?.length ?? 0} akun pada tampilan ini
          </span>
        }
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus aria-hidden="true" />
            Undang pengelola atau pengajar
          </Button>
        }
      />

      <SegmentedTabs
        tabs={[
          { id: "users", label: "Pengguna", count: tab === "users" ? rows?.length : undefined },
          { id: "teachers", label: "Pengajar", count: tab === "teachers" ? rows?.length : undefined },
          { id: "team", label: "Tim", count: tab === "team" ? rows?.length : undefined },
        ]}
        value={tab}
        onChange={(value) => setTab(value as "users" | "teachers" | "team")}
        ariaLabel="Pilih tab orang"
      />

      <Panel eyebrow="Direktori" title="Semua akun" bodyClassName="p-0">
        <DataTable
          rows={rows ?? []}
          columns={columns}
          caption="Akun dengan peran, status, profil pengajar, wilayah, dan jumlah sesi"
          searchPlaceholder="Cari nama, email, wilayah, atau peran"
          getSearchText={(row) =>
            `${row.name} ${row.email} ${row.region} ${row.roleLabel} ${row.status} ${row.specialty ?? ""}`
          }
          toolbar={
            <div className="flex items-center gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari direktori"
                className="h-8 w-48 text-[11px]"
              />
            </div>
          }
          emptyTitle="Tidak ada akun pada tampilan ini"
          emptyDescription="Undang pengajar atau pengelola, atau ubah filter pencarian."
          minWidth={880}
        />
      </Panel>

      <PersonDrawer
        userId={selected}
        onClose={() => setSelected(null)}
        onReasonAction={runAction}
      />

      <Dialog open={Boolean(action)} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action?.title}</DialogTitle>
            <DialogDescription>{action?.description}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reason-action">Alasan</Label>
            <Textarea
              id="reason-action"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 min-h-24"
              placeholder="Tulis alasan yang bisa diaudit."
            />
            <p className="mt-1 text-[10px] text-ink-muted">
              Minimal 4 karakter. Tersimpan di log audit.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Batal
            </Button>
            <Button onClick={() => void submitAction()}>{action?.label}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undang akun</DialogTitle>
            <DialogDescription>
              Pendaftaran peserta tetap publik. Undangan hanya untuk pengajar
              atau pengelola; token ditampilkan sekali.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Peran</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(event.target.value as "teacher" | "admin")
                }
                className="mt-1.5 flex h-9 w-full border border-ink/20 bg-paper-2 px-2 text-[12px]"
              >
                <option value="teacher">Pengajar</option>
                <option value="admin">Pengelola</option>
              </select>
            </div>
            <div>
              <Label htmlFor="invite-reason">Alasan</Label>
              <Input
                id="invite-reason"
                value={inviteReason}
                onChange={(event) => setInviteReason(event.target.value)}
                className="mt-1.5"
                placeholder="Dossier atau kebutuhan operasional"
              />
            </div>
            {inviteToken ? (
              <div className="border border-ink/20 bg-panel/35 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                  Token undangan
                </p>
                <code className="mt-1 block break-all text-[11px] text-ink">
                  {inviteToken}
                </code>
                <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
                  Penerima masuk dengan email yang diundang, membuka
                  <strong className="text-ink"> /ruang/undangan</strong>, lalu
                  menempel token ini. Token ditampilkan sekali.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Tutup
            </Button>
            <Button onClick={() => void sendInvite()}>
              <UserPlus aria-hidden="true" />
              Buat undangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PersonDrawer({
  userId,
  onClose,
  onReasonAction,
}: {
  userId: Id<"users"> | null
  onClose: () => void
  onReasonAction: (action: ReasonAction) => void
}) {
  const detail = useQuery(
    api.people.get,
    userId === null ? "skip" : { userId },
  )
  const setRolesMutation = useMutation(api.users.setRoles)
  const suspend = useMutation(api.users.suspend)
  const reactivate = useMutation(api.people.reactivate)
  const revokeSessions = useMutation(api.people.revokeSessions)
  const verifyTeacher = useMutation(api.people.verifyTeacher)
  const setPublication = useMutation(api.people.setTeacherPublication)
  const activateSeller = useMutation(api.people.activateSeller)
  const createTeacher = useMutation(api.people.createTeacherProfile)
  const site = useQuery(api.content.getSite)
  const [sellerOpen, setSellerOpen] = React.useState(false)
  const [sellerName, setSellerName] = React.useState("")
  const [sellerReason, setSellerReason] = React.useState("")
  const [sellerChecklist, setSellerChecklist] = React.useState({
    payoutAccount: false,
    consent: false,
    firstWorkCard: false,
    taxDetails: false,
  })
  const [teacherOpen, setTeacherOpen] = React.useState(false)
  const [teacherReason, setTeacherReason] = React.useState("")
  const [teacherDraft, setTeacherDraft] = React.useState({
    specialty: "",
    region: "",
    experience: "",
    quote: "",
    focus: "",
    community: "",
    pathId: "",
  })
  const [roleDraft, setRoleDraft] = React.useState<{
    userId: string
    roles: string[]
  } | null>(null)

  if (userId === null) return null

  const roles =
    roleDraft?.userId === userId
      ? roleDraft.roles
      : (detail?.user.roles ?? [])

  function setRoles(
    value: string[] | ((current: string[]) => string[]),
  ) {
    if (userId === null) return
    const next = typeof value === "function" ? value(roles) : value
    setRoleDraft({ userId, roles: next })
  }

  return (
    <>
      <DetailDrawer
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow="Akun"
      title={detail?.user.name ?? "Memuat akun"}
      stamp={detail?.user.roleLabel}
      tone={detail ? roleTone(detail.user.status) : "muted"}
      description={detail?.user.email}
      width="sm:max-w-[680px]"
      footer={
        detail ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() =>
                onReasonAction({
                  title: "Simpan peran",
                  description: "Peran yang berubah dicatat sebagai grant atau revoke append-only.",
                  label: "Simpan peran",
                  run: async (reason) => {
                    await setRolesMutation({
                      userId,
                      roles: roles as ("student" | "teacher" | "admin")[],
                      reason,
                    })
                  },
                })
              }
            >
              <ShieldCheck aria-hidden="true" />
              Simpan peran
            </Button>
            {detail.user.status === "suspended" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onReasonAction({
                    title: "Aktifkan akun",
                    description: "Akses ruang kerja dipulihkan; sesi lama tidak dihidupkan kembali.",
                    label: "Aktifkan",
                    run: async (reason) => {
                      await reactivate({ userId, reason })
                    },
                  })
                }
              >
                Aktifkan
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onReasonAction({
                    title: "Tangguhkan akun",
                    description: "Sesi aplikasi dicabut dan mutasi ruang kerja diblokir.",
                    label: "Tangguhkan",
                    run: async (reason) => {
                      await suspend({ userId, reason })
                    },
                  })
                }
              >
                Tangguhkan
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                onReasonAction({
                  title: "Cabut semua sesi",
                  description: "Proyeksi sesi aplikasi dicabut. Better Auth tetap sumber otoritatif.",
                  label: "Cabut sesi",
                  run: async (reason) => {
                    await revokeSessions({ userId, reason })
                  },
                })
              }
            >
              Cabut sesi
            </Button>
          </div>
        ) : undefined
      }
    >
      {detail ? (
        <div className="space-y-6">
          <DetailGrid
            items={[
              { label: "Status", value: <StatusStamp label={detail.user.status} tone={roleTone(detail.user.status)} /> },
              { label: "Wilayah", value: detail.user.region || "—" },
              { label: "Peran", value: detail.user.roles.join(", ") },
              { label: "Label", value: detail.user.roleLabel },
              {
                label: "Hak",
                value: (
                  <span className="flex flex-wrap gap-1">
                    {detail.user.entitlements.operate ? <StatusStamp label="operate" tone="done" /> : null}
                    {detail.user.entitlements.teach ? <StatusStamp label="teach" tone="done" /> : null}
                    {detail.user.entitlements.learn ? <StatusStamp label="learn" tone="done" /> : null}
                    {detail.user.entitlements.sellActive ? <StatusStamp label="sell" tone="done" /> : null}
                  </span>
                ),
              },
              { label: "Sesi aktif", value: detail.sessions.filter((item) => !item.revokedAt).length },
            ]}
          />

          <DrawerSection title="Peran">
            <div className="grid gap-2 sm:grid-cols-3">
              {(["student", "teacher", "admin"] as const).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 border border-ink/15 bg-paper/40 px-2.5 py-2 text-[11px]"
                >
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={(event) =>
                      setRoles((current) =>
                        event.target.checked
                          ? [...current, role]
                          : current.filter((item) => item !== role),
                      )
                    }
                    className="size-4 accent-[#a9552c]"
                  />
                  {role}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">
              Perubahan peran append-only. Pengelola tidak mewarisi penilaian
              atau penjualan.
            </p>
          </DrawerSection>

          {detail.teacher ? (
            <DrawerSection
              title="Dossier pengajar"
              aside={
                <StatusStamp
                  label={detail.teacher.verificationStatus ?? detail.teacher.status}
                  tone={teacherTone(detail.teacher.status)}
                />
              }
            >
              <dl className="space-y-2 text-[11.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Spesialisasi</dt>
                  <dd className="text-right text-ink">{detail.teacher.specialty}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Komunitas</dt>
                  <dd className="text-right text-ink">{detail.teacher.community}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Pengalaman</dt>
                  <dd className="text-right text-ink">{detail.teacher.experience}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Jalur</dt>
                  <dd className="text-right text-ink">
                    {detail.teacher.pathIds.join(", ") || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Tampil publik</dt>
                  <dd className="text-right text-ink">
                    {detail.teacher.published ? "Ya" : "Tidak"}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  onClick={() =>
                    onReasonAction({
                      title: "Verifikasi pengajar",
                      description: "Profil aktif dan tampil publik setelah verifikasi.",
                      label: "Verifikasi",
                      run: async (reason) => {
                        await verifyTeacher({
                          teacherId: detail.teacher!.id as Id<"teachers">,
                          decision: "verify",
                          reason,
                        })
                      },
                    })
                  }
                >
                  Verifikasi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onReasonAction({
                      title: "Tolak pengajuan",
                      description: "Profil tetap draf; pengaju dapat memperbaiki dossier.",
                      label: "Tolak",
                      run: async (reason) => {
                        await verifyTeacher({
                          teacherId: detail.teacher!.id as Id<"teachers">,
                          decision: "reject",
                          reason,
                        })
                      },
                    })
                  }
                >
                  Tolak
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onReasonAction({
                      title: "Tangguhkan pengajar",
                      description: "Profil tidak tampil; sertifikat yang sudah terbit tetap valid.",
                      label: "Tangguhkan",
                      run: async (reason) => {
                        await verifyTeacher({
                          teacherId: detail.teacher!.id as Id<"teachers">,
                          decision: "suspend",
                          reason,
                        })
                      },
                    })
                  }
                >
                  Tangguhkan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onReasonAction({
                      title: detail.teacher?.published ? "Sembunyikan profil" : "Terbitkan profil",
                      description: "Profil publik mengikuti status verifikasi.",
                      label: detail.teacher?.published ? "Sembunyikan" : "Terbitkan",
                      run: async (reason) => {
                        await setPublication({
                          teacherId: detail.teacher!.id as Id<"teachers">,
                          published: !detail.teacher!.published,
                          reason,
                        })
                      },
                    })
                  }
                >
                  {detail.teacher.published ? "Sembunyikan profil" : "Terbitkan profil"}
                </Button>
              </div>
            </DrawerSection>
          ) : null}

          <DrawerSection
            title="Profil penjual"
            aside={
              detail.seller ? (
                <StatusStamp
                  label={detail.seller.status}
                  tone={
                    detail.seller.status === "active"
                      ? "done"
                      : detail.seller.status === "suspended"
                        ? "danger"
                        : "wait"
                  }
                />
              ) : (
                <StatusStamp label="Belum aktif" tone="muted" />
              )
            }
          >
            {detail.seller ? (
              <dl className="space-y-2 text-[11.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Nama tampil</dt>
                  <dd className="text-right text-ink">{detail.seller.displayName}</dd>
                </div>
                {(
                  [
                    ["Rekening pencairan", detail.seller.onboardingChecklist.payoutAccount],
                    ["Persetujuan", detail.seller.onboardingChecklist.consent],
                    ["Kartu Karya pertama", detail.seller.onboardingChecklist.firstWorkCard],
                    ["Data pajak", detail.seller.onboardingChecklist.taxDetails],
                  ] as const
                ).map(([label, done]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="text-right text-ink">{done ? "Lengkap" : "Belum"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <>
                <p className="text-[11.5px] leading-relaxed text-ink-soft">
                  Penjual aktif hanya setelah dossier pengajar terverifikasi atau
                  sertifikat terbit, dan seluruh checklist onboarding lengkap.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setSellerName(detail.user.name)
                    setSellerReason("")
                    setSellerChecklist({
                      payoutAccount: false,
                      consent: false,
                      firstWorkCard: false,
                      taxDetails: false,
                    })
                    setSellerOpen(true)
                  }}
                >
                  Aktifkan penjual
                </Button>
              </>
            )}
          </DrawerSection>

          {!detail.teacher && detail.user.roles.includes("teacher") ? (
            <DrawerSection
              title="Dossier pengajar"
              aside={<StatusStamp label="Belum ada" tone="muted" />}
            >
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                Akun ini sudah berperan pengajar tetapi belum punya dossier.
                Lengkapi dossier agar jalur dan verifikasinya tercatat.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  setTeacherDraft({
                    specialty: "",
                    region: detail.user.region,
                    experience: "",
                    quote: "",
                    focus: "",
                    community: "",
                    pathId: site?.paths[0]?.slug ?? "",
                  })
                  setTeacherReason("")
                  setTeacherOpen(true)
                }}
              >
                Buat profil pengajar
              </Button>
            </DrawerSection>
          ) : null}

          <DrawerSection title="Pendaftaran dan kredensial">
            <div className="grid gap-2 sm:grid-cols-2">
              {detail.enrollments.map((item) => (
                <div key={item.id} className="border border-ink/15 bg-paper/40 px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-ink">{item.title}</p>
                  <StatusStamp label={item.status} tone="muted" />
                </div>
              ))}
              {detail.certificates.map((item) => (
                <div key={item.id} className="border border-ink/15 bg-paper/40 px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-ink">{item.title}</p>
                  <StatusStamp label={item.status} tone={item.status === "issued" ? "done" : "danger"} />
                </div>
              ))}
            </div>
            {detail.enrollments.length === 0 && detail.certificates.length === 0 ? (
              <p className="text-[11.5px] text-ink-muted">Belum ada pendaftaran atau sertifikat.</p>
            ) : null}
          </DrawerSection>

          <DrawerSection title="Karya dan pesanan">
            <div className="grid gap-2 sm:grid-cols-2">
              {detail.works.map((item) => (
                <div key={item.id} className="border border-ink/15 bg-paper/40 px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-ink">{item.title}</p>
                  <StatusStamp label={item.status} tone="muted" />
                </div>
              ))}
              {detail.orders.map((item) => (
                <div key={item.id} className="border border-ink/15 bg-paper/40 px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-ink">{item.id}</p>
                  <p className="text-[10px] text-ink-muted">{item.title}</p>
                  <StatusStamp label={item.status} tone="muted" />
                </div>
              ))}
            </div>
            {detail.works.length === 0 && detail.orders.length === 0 ? (
              <p className="text-[11.5px] text-ink-muted">
                Belum ada karya atau pesanan yang terkait akun ini.
              </p>
            ) : null}
          </DrawerSection>

          <DrawerSection title="Sesi dan riwayat masuk">
            <ul className="divide-y divide-ink/10">
              {detail.sessions.map((session) => (
                <li key={session.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-[11px] font-semibold text-ink">
                    {session.deviceName} {session.revokedAt ? "· dicabut" : ""}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-ink-muted">
                    {new Intl.DateTimeFormat("id-ID", {
                      timeZone: "Asia/Jakarta",
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(session.lastSeenAt))}
                  </p>
                </li>
              ))}
              {detail.sessions.length === 0 ? (
                <li className="text-[11.5px] text-ink-muted">Belum ada sesi tercatat.</li>
              ) : null}
            </ul>
            <ul className="mt-3 space-y-1.5 border-t border-ink/15 pt-3">
              {detail.authLogs.slice(0, 6).map((log) => (
                <li key={log.id} className="flex justify-between gap-2 text-[10px] text-ink-muted">
                  <span>{log.kind}</span>
                  <span>
                    {new Intl.DateTimeFormat("id-ID", {
                      timeZone: "Asia/Jakarta",
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(log.createdAt))}
                  </span>
                </li>
              ))}
            </ul>
          </DrawerSection>

          <DrawerSection title="Riwayat peran">
            <ul className="space-y-2">
              {detail.roleAssignments.map((assignment) => (
                <li key={assignment.id} className="border-l-2 border-copper/40 pl-2.5">
                  <p className="text-[10.5px] text-ink">
                    {assignment.action} · {assignment.role}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-ink-muted">
                    {assignment.reason}
                  </p>
                </li>
              ))}
            </ul>
          </DrawerSection>
        </div>
      ) : (
        <p className="text-[12px] text-ink-muted">Memuat detail akun.</p>
      )}
    </DetailDrawer>

      <Dialog open={sellerOpen} onOpenChange={setSellerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktifkan profil penjual</DialogTitle>
            <DialogDescription>
              Checklist ini adalah gerbang. Semua butir wajib lengkap sebelum
              penjual dapat menerbitkan karya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="seller-name">Nama tampil</Label>
              <Input
                id="seller-name"
                value={sellerName}
                onChange={(event) => setSellerName(event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="space-y-2">
              {(
                [
                  ["payoutAccount", "Rekening pencairan terverifikasi"],
                  ["consent", "Persetujuan bagi hasil dan ketentuan"],
                  ["firstWorkCard", "Kartu Karya pertama siap"],
                  ["taxDetails", "Data pajak lengkap"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-[11.5px] text-ink"
                >
                  <input
                    type="checkbox"
                    checked={sellerChecklist[key]}
                    onChange={(event) =>
                      setSellerChecklist((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <Label htmlFor="seller-reason">Alasan</Label>
              <Textarea
                id="seller-reason"
                value={sellerReason}
                onChange={(event) => setSellerReason(event.target.value)}
                className="mt-1.5 min-h-20"
                placeholder="Dasar aktivasi, tercatat di audit."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellerOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={async () => {
                try {
                  await activateSeller({
                    userId,
                    displayName: sellerName,
                    checklist: sellerChecklist,
                    reason: sellerReason,
                  })
                  toast("Profil penjual aktif")
                  setSellerOpen(false)
                } catch (error) {
                  toast("Aktivasi gagal", {
                    description:
                      error instanceof Error ? error.message : "Periksa checklist.",
                  })
                }
              }}
            >
              Aktifkan penjual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teacherOpen} onOpenChange={setTeacherOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat profil pengajar</DialogTitle>
            <DialogDescription>
              Dossier dibuat sebagai draf. Verifikasi tetap keputusan terpisah.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="teacher-specialty">Spesialisasi</Label>
              <Input
                id="teacher-specialty"
                value={teacherDraft.specialty}
                onChange={(event) =>
                  setTeacherDraft((current) => ({
                    ...current,
                    specialty: event.target.value,
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="teacher-region">Wilayah</Label>
              <Input
                id="teacher-region"
                value={teacherDraft.region}
                onChange={(event) =>
                  setTeacherDraft((current) => ({
                    ...current,
                    region: event.target.value,
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="teacher-community">Komunitas</Label>
              <Input
                id="teacher-community"
                value={teacherDraft.community}
                onChange={(event) =>
                  setTeacherDraft((current) => ({
                    ...current,
                    community: event.target.value,
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="teacher-focus">Fokus</Label>
              <Input
                id="teacher-focus"
                value={teacherDraft.focus}
                onChange={(event) =>
                  setTeacherDraft((current) => ({
                    ...current,
                    focus: event.target.value,
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="teacher-path">Jalur</Label>
              <select
                id="teacher-path"
                value={teacherDraft.pathId}
                onChange={(event) =>
                  setTeacherDraft((current) => ({
                    ...current,
                    pathId: event.target.value,
                  }))
                }
                className="mt-1.5 flex h-9 w-full border border-ink/20 bg-paper-2 px-2 text-[12px]"
              >
                {(site?.paths ?? []).map((path) => (
                  <option key={path.slug} value={path.slug}>
                    {path.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="teacher-experience">Pengalaman</Label>
              <Textarea
                id="teacher-experience"
                value={teacherDraft.experience}
                onChange={(event) =>
                  setTeacherDraft((current) => ({
                    ...current,
                    experience: event.target.value,
                  }))
                }
                className="mt-1.5 min-h-16"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="teacher-quote">Kutipan</Label>
              <Input
                id="teacher-quote"
                value={teacherDraft.quote}
                onChange={(event) =>
                  setTeacherDraft((current) => ({
                    ...current,
                    quote: event.target.value,
                  }))
                }
                className="mt-1.5"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="teacher-reason">Alasan</Label>
              <Input
                id="teacher-reason"
                value={teacherReason}
                onChange={(event) => setTeacherReason(event.target.value)}
                className="mt-1.5"
                placeholder="Dasar pembuatan dossier, tercatat di audit."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={async () => {
                try {
                  await createTeacher({
                    userId,
                    specialty: teacherDraft.specialty,
                    region: teacherDraft.region,
                    experience: teacherDraft.experience,
                    quote: teacherDraft.quote,
                    focus: teacherDraft.focus,
                    community: teacherDraft.community,
                    pathIds: teacherDraft.pathId ? [teacherDraft.pathId] : [],
                    reason: teacherReason,
                  })
                  toast("Dossier pengajar dibuat")
                  setTeacherOpen(false)
                } catch (error) {
                  toast("Dossier gagal dibuat", {
                    description:
                      error instanceof Error ? error.message : "Periksa isian.",
                  })
                }
              }}
            >
              Simpan dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
