"use client"

import * as React from "react"
import Link from "next/link"
import {
  Ban,
  Check,
  KeyRound,
  MapPin,
  UserCheck,
  UserPlus,
  X,
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
import { SPLIT_PERCENTAGES } from "@/lib/commerce/money"
import { people } from "@/lib/workspace/mock-data"
import type { Person } from "@/lib/workspace/types"
import { formatWorkspaceDate } from "@/lib/workspace/format"

export function PeopleDirectory() {
  const [tab, setTab] = React.useState("users")
  const [selected, setSelected] = React.useState<Person | null>(null)
  const [review, setReview] = React.useState<"approve" | "reject" | null>(null)

  const teacherPeople = people.filter((person) => person.teacherStatus)
  const team = people.filter((person) => person.roles.includes("pengelola"))
  const rows =
    tab === "teachers" ? teacherPeople : tab === "team" ? team : people

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orang"
        title="Akun, peran, dan verifikasi."
        description="Cari akun berdasarkan nama, email, WhatsApp, peran, wilayah, atau status. Peran bersifat aditif; sertifikat membuka kemampuan, bukan mengubah peran."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                toast("Undangan disiapkan", {
                  description: "Tautan undangan pengelola berlaku 48 jam dan memerlukan MFA.",
                })
              }
            >
              <UserPlus aria-hidden="true" />
              Undang
            </Button>
            <Button asChild variant="outline">
              <Link href="/ruang/log">Riwayat akses</Link>
            </Button>
          </>
        }
      />

      <SegmentedTabs
        tabs={[
          { id: "users", label: "Pengguna", count: people.length },
          { id: "teachers", label: "Pengajar", count: teacherPeople.length },
          { id: "team", label: "Tim", count: team.length },
        ]}
        value={tab}
        onChange={setTab}
        ariaLabel="Pilih daftar orang"
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-9"
          eyebrow={tab === "teachers" ? "Pengajar" : tab === "team" ? "Tim" : "Pengguna"}
          title="Direktori akun"
          bodyClassName="p-0"
        >
          <DataTable
            rows={rows}
            columns={peopleColumns(tab, setSelected)}
            caption="Direktori akun dengan peran, wilayah, status, dan aktivitas"
            searchPlaceholder="Cari nama, email, WhatsApp, wilayah"
            getSearchText={(row) =>
              `${row.name} ${row.email} ${row.whatsapp} ${row.region} ${row.roles.join(" ")} ${row.note ?? ""}`
            }
            filters={[
              {
                id: "role",
                label: "Peran",
                options: [
                  { value: "all", label: "Semua" },
                  { value: "peserta", label: "Peserta" },
                  { value: "pengajar", label: "Pengajar" },
                  { value: "pengelola", label: "Pengelola" },
                ],
              },
              {
                id: "status",
                label: "Status",
                options: [
                  { value: "all", label: "Semua" },
                  { value: "active", label: "Aktif" },
                  { value: "review", label: "Tinjauan" },
                  { value: "suspended", label: "Ditangguhkan" },
                ],
              },
            ]}
            filterRow={(row, values) => {
              const roleOk =
                !values.role || values.role === "all" || row.roles.includes(values.role as "peserta")
              const statusOk =
                !values.status || values.status === "all" || row.status === values.status
              return roleOk && statusOk
            }}
            minWidth={850}
            footer={
              <p>
                {rows.length} akun pada tampilan ini · peran ditinjau setiap
                perubahan · ekspor memerlukan audit
              </p>
            }
          />
        </Panel>

        <div className="space-y-4 xl:col-span-3">
          <Panel eyebrow="Verifikasi" title="Menunggu tinjauan">
            {teacherPeople.filter((person) => person.teacherStatus === "review").length ? (
              teacherPeople
                .filter((person) => person.teacherStatus === "review")
                .map((person) => (
                  <div key={person.id} className="border border-ink/20 bg-panel/30 p-3">
                    <p className="text-[11.5px] font-semibold text-ink">{person.name}</p>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {person.specialty} · {person.region}
                    </p>
                    <p className="mt-1 text-[9.5px] text-ink-muted">
                      Diajukan {formatWorkspaceDate(person.joinedAt)}
                    </p>
                    <Button size="sm" className="mt-2.5 w-full" onClick={() => setSelected(person)}>
                      Buka dossier
                    </Button>
                  </div>
                ))
            ) : (
              <p className="text-[11px] text-ink-muted">Tidak ada pengajuan terbuka.</p>
            )}
          </Panel>
          <Panel eyebrow="Pedoman" title="Peran dan akses">
            <ul className="space-y-2.5">
              {[
                ["Peserta", "Belajar, kirim tugas, baca kredensial sendiri."],
                [
                  "Pengajar",
                  `Kohort, nilai, kredensial kohort, jual ${SPLIT_PERCENTAGES.teacher}%.`,
                ],
                ["Pengelola", "Operasi penuh, tanpa menilai atau mengirim tugas."],
              ].map(([role, note]) => (
                <li key={role}>
                  <p className="text-[10.5px] font-semibold text-ink">{role}</p>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-ink-muted">{note}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        eyebrow={selected?.teacherStatus ? "Dossier pengajar" : "Akun"}
        title={selected?.name ?? ""}
        stamp={
          selected?.teacherStatus === "review"
            ? "Menunggu verifikasi"
            : selected?.status === "suspended"
              ? "Ditangguhkan"
              : undefined
        }
        tone={selected?.teacherStatus === "review" || selected?.status === "suspended" ? "wait" : "done"}
        description={selected ? `${selected.email} · ${selected.region}` : undefined}
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2">
              {selected.teacherStatus === "review" ? (
                <>
                  <Button size="sm" onClick={() => setReview("approve")}>
                    <Check aria-hidden="true" />
                    Setujui pengajar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setReview("reject")}>
                    <X aria-hidden="true" />
                    Tolak
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast("Mode lihat-sebagai", {
                        description: "Impersonasi baca-saja akan menampilkan banner dan audit.",
                      })
                    }
                  >
                    Lihat sebagai
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast("Sesi dicabut", {
                        description: "Semua sesi perangkat dicabut. Pengguna harus masuk kembali.",
                      })
                    }
                  >
                    Cabut sesi
                  </Button>
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {selected ? (
          <>
            <DetailGrid
              items={[
                { label: "Email", value: selected.email },
                { label: "WhatsApp", value: selected.whatsapp },
                { label: "Wilayah", value: selected.region },
                { label: "Peran", value: selected.roles.join(", ") },
                { label: "Status", value: selected.status },
                { label: "Bergabung", value: formatWorkspaceDate(selected.joinedAt) },
                { label: "Aktif terakhir", value: formatWorkspaceDate(selected.lastActive) },
                { label: "MFA", value: selected.mfa ? "Aktif" : "Belum aktif" },
                { label: "Sesi", value: `${selected.sessions ?? 0} perangkat` },
                {
                  label: "Sertifikat",
                  value: selected.certificates.length
                    ? selected.certificates.join(", ")
                    : "Belum ada",
                },
              ]}
            />
            {selected.note ? (
              <DrawerSection title="Catatan">
                <p className="border-l-2 border-brass pl-3 text-[11.5px] leading-relaxed text-ink-soft">
                  {selected.note}
                </p>
              </DrawerSection>
            ) : null}

            {selected.teacherStatus ? (
              <DrawerSection title="Verifikasi pengajar">
                <ul className="space-y-2">
                  {[
                    ["Identitas dan kontak", true],
                    ["Wilayah dan komunitas", true],
                    ["Pengalaman dan portofolio", true],
                    ["Dokumen izin komunitas", selected.teacherStatus === "active"],
                    ["Rekomendasi pengajar senior", selected.teacherStatus === "active"],
                    ["Kurikulum jalur", selected.teacherStatus === "active"],
                  ].map(([label, done]) => (
                    <li key={String(label)} className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-ink-soft">{label}</span>
                      <StatusStamp
                        label={done ? "Lengkap" : "Menunggu"}
                        tone={done ? "done" : "wait"}
                      />
                    </li>
                  ))}
                </ul>
              </DrawerSection>
            ) : null}

            <DrawerSection title="Kemampuan efektif">
              <div className="flex flex-wrap gap-1.5">
                {[
                  selected.roles.includes("peserta") && "Belajar",
                  selected.roles.includes("pengajar") && "Mengajar",
                  selected.roles.includes("pengajar") && "Menilai",
                  selected.certificates.length > 0 && "Menjual",
                  selected.roles.includes("pengelola") && "Operasi",
                ]
                  .filter(Boolean)
                  .map((label) => (
                    <span
                      key={String(label)}
                      className="border border-ink/20 bg-panel/30 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-ink-soft"
                    >
                      {label}
                    </span>
                  ))}
              </div>
            </DrawerSection>

            <DrawerSection title="Tindakan akun">
              <div className="grid gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-start"
                  onClick={() =>
                    toast("Peran ditambahkan", {
                      description: "Penambahan peran dicatat sebagai entri append-only.",
                    })
                  }
                >
                  <UserCheck aria-hidden="true" />
                  Tambah peran
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-start"
                  onClick={() =>
                    toast("Reset MFA", {
                      description: "Tautan reset dikirim. Sesi lama tetap berlaku sampai dicabut.",
                    })
                  }
                >
                  <KeyRound aria-hidden="true" />
                  Reset MFA
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="justify-start text-[#8a2e1f]"
                  onClick={() =>
                    toast("Penangguhan", {
                      description: "Penangguhan memerlukan alasan dan tidak menghapus riwayat.",
                    })
                  }
                >
                  <Ban aria-hidden="true" />
                  Tangguhkan akun
                </Button>
              </div>
            </DrawerSection>
          </>
        ) : null}
      </DetailDrawer>

      <Dialog
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open) setReview(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {review === "approve" ? "Setujui pengajar" : "Tolak pengajuan"}
            </DialogTitle>
            <DialogDescription>
              {review === "approve"
                ? "Persetujuan membuat profil publik dan membuka kohort baru. Sertifikat peserta tetap valid."
                : "Penolakan menyimpan alasan dan membuka revisi bagi pelamar."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="review-note">
              {review === "approve" ? "Catatan verifikasi (opsional)" : "Alasan penolakan"}
            </Label>
            <Textarea
              id="review-note"
              className="mt-2 min-h-24"
              placeholder={
                review === "approve"
                  ? "Misalnya: dokumen izin komunitas lengkap, rekomendasi pengajar senior diterima."
                  : "Misalnya: dokumen izin komunitas belum lengkap."
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReview(null)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                toast(review === "approve" ? "Pengajar diverifikasi" : "Pengajuan ditolak", {
                  description: "Keputusan dan alasan masuk audit.",
                })
                setReview(null)
                setSelected(null)
              }}
            >
              {review === "approve" ? "Setujui" : "Tolak dengan alasan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function peopleColumns(
  tab: string,
  onSelect: (person: Person) => void,
): Column<Person>[] {
  return [
    {
      id: "person",
      header: "Nama",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center border border-ink/20 bg-panel/40 font-heading text-[9px] font-semibold">
            {row.initials}
          </span>
          <div>
            <p className="font-semibold text-ink">{row.name}</p>
            <p className="mt-0.5 text-[10px] text-ink-muted">
              {tab === "teachers" ? row.specialty : row.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Peran",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <span
              key={role}
              className="border border-ink/20 bg-panel/30 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.05em] text-ink-soft"
            >
              {role}
            </span>
          ))}
          {row.certificates.length ? (
            <span className="border border-brass/50 bg-brass/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.05em] text-[#7a5212]">
              penjual
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "region",
      header: "Wilayah",
      cell: (row) => (
        <span className="flex items-center gap-1 text-[10.5px] text-ink-soft">
          <MapPin className="size-3 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="truncate">{row.region}</span>
        </span>
      ),
      className: "hidden lg:table-cell",
      headClassName: "hidden lg:table-cell",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusStamp
          label={
            row.status === "active"
              ? "Aktif"
              : row.status === "review"
                ? "Tinjauan"
                : row.status === "invited"
                  ? "Diundang"
                  : "Ditangguhkan"
          }
          tone={
            row.status === "active"
              ? "done"
              : row.status === "review"
                ? "wait"
                : row.status === "invited"
                  ? "progress"
                  : "danger"
          }
        />
      ),
    },
    {
      id: "last",
      header: "Aktif terakhir",
      cell: (row) => (
        <span className="text-[10px] text-ink-muted">
          {formatWorkspaceDate(row.lastActive)}
        </span>
      ),
      className: "hidden xl:table-cell",
      headClassName: "hidden xl:table-cell",
    },
    {
      id: "action",
      header: "",
      align: "right",
      cell: (row) => (
        <Button size="sm" variant="ghost" onClick={() => onSelect(row)}>
          Buka
        </Button>
      ),
    },
  ]
}
