"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function VerificationLookupForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = code.trim()
    if (!value) {
      setError("Masukkan kode sertifikat atau Kartu Karya.")
      return
    }
    setError(null)
    router.push(`/verifikasi/${encodeURIComponent(value)}`)
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label htmlFor="verification-code" className="block">
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Kode publik
        </span>
        <Input
          id="verification-code"
          name="kode"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Contoh: KN-2026-0001"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "verification-code-error" : undefined}
          className="mt-1"
        />
      </label>
      {error ? (
        <p
          id="verification-code-error"
          role="alert"
          className="text-[11px] text-destructive"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full">
        <Search aria-hidden="true" />
        Buka halaman verifikasi
        <ArrowRight aria-hidden="true" />
      </Button>
    </form>
  )
}
