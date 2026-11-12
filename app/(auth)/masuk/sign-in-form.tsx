"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { ArrowRight, KeyRound, MessageCircle } from "lucide-react"

import { BrandLockup } from "@/components/brand/brand-mark"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { PROVINCES } from "@/lib/regions/provinces"

type Mode = "signin" | "signup"

function errorMessage(caught: unknown, fallback: string): string {
  if (caught && typeof caught === "object" && "data" in caught) {
    const data = (caught as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return caught instanceof Error ? caught.message : fallback
}

type CompleteProfile = (args: {
  phone: string
  province: string
}) => Promise<{ waUrl: string; expiresAt: number }>

export function SignInForm({
  nextPath,
  configured,
  initialMode = "signin",
}: {
  nextPath: string
  configured: boolean
  initialMode?: Mode
}) {
  if (!configured) {
    return (
      <SignInFormView
        nextPath={nextPath}
        configured={false}
        completeProfile={null}
        initialMode={initialMode}
      />
    )
  }
  return (
    <ConfiguredSignInForm nextPath={nextPath} initialMode={initialMode} />
  )
}

function ConfiguredSignInForm({
  nextPath,
  initialMode,
}: {
  nextPath: string
  initialMode: Mode
}) {
  const completeProfile = useMutation(api.users.completeProfile)
  return (
    <SignInFormView
      nextPath={nextPath}
      configured
      completeProfile={completeProfile}
      initialMode={initialMode}
    />
  )
}

function SignInFormView({
  nextPath,
  configured,
  completeProfile,
  initialMode,
}: {
  nextPath: string
  configured: boolean
  completeProfile: CompleteProfile | null
  initialMode: Mode
}) {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>(initialMode)
  const [name, setName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [province, setProvince] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [waUrl, setWaUrl] = React.useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!configured) {
      setError("Autentikasi belum dikonfigurasi pada lingkungan ini.")
      return
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.")
      return
    }
    if (!phone.trim()) {
      setError("Nomor WhatsApp wajib diisi.")
      return
    }
    if (mode === "signup" && !province) {
      setError("Pilih provinsi asal.")
      return
    }

    setPending(true)
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: name.trim() || email.split("@")[0],
          email: email.trim(),
          password,
        })

        if (result.error) {
          setError(
            result.error.message ?? "Tidak dapat mendaftar. Periksa data akun.",
          )
          return
        }

        if (!completeProfile) {
          setError("Profil WhatsApp belum dapat disimpan.")
          return
        }

        const profile = await completeProfile({
          phone: phone.trim(),
          province,
        })
        setWaUrl(profile.waUrl)
        return
      }

      const response = await fetch("/api/auth/phone-signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string
        } | null
        setError(
          payload?.message ??
            "Nomor WhatsApp atau kata sandi tidak cocok.",
        )
        return
      }

      router.replace(nextPath)
      router.refresh()
    } catch (caught) {
      setError(errorMessage(caught, "Tidak dapat masuk. Coba lagi."))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-svh bg-cream lg:grid-cols-2">
      <section className="wood-deep relative hidden flex-col justify-between border-r-2 border-copper-dark px-10 py-10 text-paper lg:flex">
        <Link href="/" aria-label="KalaNidhi Digital">
          <BrandLockup markSize={42} tone="paper" />
        </Link>
        <div className="max-w-md">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brass">
            Satu ruang kerja
          </p>
          <h1 className="mt-3 font-heading text-[clamp(2.2rem,4vw,3.5rem)] leading-[0.98] tracking-[-0.02em]">
            Duduk di bangku ini. Nanti kamu yang mengajari.
          </h1>
          <p className="mt-5 text-[13px] leading-relaxed text-paper/70">
            Belajar, dinilai pengajar, menerima sertifikat platform dan Kartu
            Karya, lalu kembali sebagai pengajar, penilai, atau pemasok.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-paper/15 pt-5">
            {[
              ["Belajar", "Jalur dan tugas"],
              ["Berkarya", "Kartu Karya"],
              ["Kembali", "Jalur baru"],
            ].map(([label, note]) => (
              <div key={label}>
                <dt className="text-[8px] font-bold uppercase tracking-[0.12em] text-brass">
                  {label}
                </dt>
                <dd className="mt-1 text-[10.5px] leading-snug text-paper/65">
                  {note}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-[9px] uppercase tracking-[0.12em] text-paper/40">
          Sertifikat platform, bukan sertifikasi pemerintah atau BNSP
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Link href="/" aria-label="KalaNidhi Digital">
              <BrandLockup markSize={34} />
            </Link>
          </div>

          <div className="mt-8 border border-ink/25 bg-paper-2 p-5 sm:p-7 lg:mt-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-copper-dark">
              {mode === "signin" ? "Masuk" : "Daftar peserta"}
            </p>
            <h2 className="mt-2 font-heading text-[clamp(1.6rem,3vw,2.2rem)] leading-tight text-ink">
              {mode === "signin"
                ? "Lanjutkan di ruang kerja."
                : "Mulai sebagai peserta."}
            </h2>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
              {mode === "signin"
                ? "Gunakan nomor WhatsApp dan kata sandi akun KalaNidhi. Email hanya untuk pemulihan."
                : "WhatsApp adalah identitas utama. Email tetap wajib untuk pemulihan dan pemberitahuan. Peran pengajar dan pengelola hanya melalui undangan."}
            </p>

            {!configured ? (
              <div className="mt-5 border border-copper-dark/35 bg-copper/10 px-3 py-2.5 text-[11px] leading-relaxed text-copper-dark">
                Autentikasi belum dikonfigurasi. Isi `CONVEX_URL`,
                `NEXT_PUBLIC_CONVEX_URL`, dan `NEXT_PUBLIC_CONVEX_SITE_URL`
                untuk mengaktifkan sesi.
              </div>
            ) : null}

            {waUrl ? (
              <div className="mt-5 space-y-3 border border-copper-dark/35 bg-copper/10 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-copper-dark">
                  Verifikasi WhatsApp
                </p>
                <p className="text-[11.5px] leading-relaxed text-ink-soft">
                  Kirim pesan itu dari WhatsApp nomor ini. Tautan berlaku 15
                  menit. Setelah terverifikasi, ruang kerja akan terbuka.
                </p>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 border border-ink bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink-2"
                >
                  <MessageCircle className="size-3.5" aria-hidden="true" />
                  Buka WhatsApp
                </a>
                <p className="break-all border border-ink/15 bg-cream px-2 py-1.5 text-[9.5px] leading-relaxed text-ink-muted">
                  {waUrl}
                </p>
                <Link
                  href={nextPath}
                  className="inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.08em] text-copper-dark underline decoration-copper-dark/40 underline-offset-4 hover:text-ink"
                >
                  Saya sudah mengirim pesan
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
                  {mode === "signup" ? (
                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                        Nama lengkap
                      </span>
                      <input
                        name="name"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="mt-1 flex min-h-11 w-full border border-ink/30 bg-cream px-3 text-[13px] text-ink outline-none focus:border-copper-dark"
                        placeholder="Nama lengkap"
                      />
                    </label>
                  ) : null}

                  <label className="block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                      Nomor WhatsApp
                    </span>
                    <input
                      name="phone"
                      type="tel"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="mt-1 flex min-h-11 w-full border border-ink/30 bg-cream px-3 text-[13px] text-ink outline-none focus:border-copper-dark"
                      placeholder="08xx xxxx xxxx"
                    />
                  </label>

                  {mode === "signup" ? (
                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                        Provinsi
                      </span>
                      <select
                        name="province"
                        required
                        value={province}
                        onChange={(event) => setProvince(event.target.value)}
                        className="mt-1 flex min-h-11 w-full border border-ink/30 bg-cream px-3 text-[13px] text-ink outline-none focus:border-copper-dark"
                      >
                        <option value="">Pilih provinsi</option>
                        {PROVINCES.map((item) => (
                          <option key={item.code} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {mode === "signup" ? (
                    <label className="block">
                      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                        Email
                      </span>
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="mt-1 flex min-h-11 w-full border border-ink/30 bg-cream px-3 text-[13px] text-ink outline-none focus:border-copper-dark"
                        placeholder="nama@email.com"
                      />
                      <span className="mt-1 block text-[9.5px] leading-relaxed text-ink-muted">
                        Sekunder: untuk pemulihan akun dan pemberitahuan.
                      </span>
                    </label>
                  ) : null}

                  <label className="block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
                      Kata sandi
                    </span>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-1 flex min-h-11 w-full border border-ink/30 bg-cream px-3 text-[13px] text-ink outline-none focus:border-copper-dark"
                      placeholder="Minimal 8 karakter"
                    />
                  </label>

                  {error ? (
                    <p
                      role="alert"
                      className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] leading-relaxed text-destructive"
                    >
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={pending || !configured}
                    className="w-full"
                  >
                    {pending
                      ? "Memproses…"
                      : mode === "signin"
                        ? "Masuk"
                        : "Buat akun peserta"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </form>

                <div className="mt-5 border-t border-ink/15 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin")
                      setError(null)
                    }}
                    className="inline-flex min-h-11 items-center gap-2 text-[11px] font-semibold text-copper-dark underline decoration-copper-dark/40 underline-offset-4 hover:text-ink"
                  >
                    <KeyRound className="size-3.5" aria-hidden="true" />
                    {mode === "signin"
                      ? "Belum punya akun? Daftar sebagai peserta"
                      : "Sudah punya akun? Masuk"}
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="mt-5 text-[10px] leading-relaxed text-ink-muted">
            Dengan masuk, kamu menyetujui{" "}
            <Link
              href="/privasi"
              className="underline decoration-ink/30 underline-offset-2 hover:text-ink"
            >
              kebijakan privasi
            </Link>{" "}
            dan{" "}
            <Link
              href="/ketentuan"
              className="underline decoration-ink/30 underline-offset-2 hover:text-ink"
            >
              ketentuan platform
            </Link>
            . Data pribadi tidak dijual.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted hover:text-ink"
          >
            Kembali ke situs publik
          </Link>
        </div>
      </section>
    </div>
  )
}
