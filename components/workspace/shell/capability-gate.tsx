"use client"

import Link from "next/link"
import { LockKeyhole } from "lucide-react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { canAccessRoute } from "@/lib/workspace/access"
import { useViewer } from "@/components/workspace/shell/viewer-provider"

export function CapabilityGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { capabilities, profile } = useViewer()

  if (canAccessRoute(capabilities, pathname)) {
    return <>{children}</>
  }

  return (
    <div className="mx-auto max-w-2xl border border-ink/25 bg-paper-2 p-5 sm:p-8">
      <span className="inline-flex size-11 items-center justify-center border border-ink/25 text-copper-dark">
        <LockKeyhole className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
        Ruang terkunci
      </p>
      <h1 className="heading-section mt-2 text-[clamp(1.8rem,4vw,2.7rem)]">
        Peran ini belum membuka ruang tersebut.
      </h1>
      <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-soft">
        Anda masuk sebagai <strong>{profile.user.roleLabel}</strong>. Navigasi
        dan tindakan mengikuti kemampuan peran, bukan alamat rute. Kembali ke
        ringkasan atau minta akses kepada pengelola.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/ruang">Kembali ke ringkasan</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/ruang/pengaturan">Buka pengaturan</Link>
        </Button>
      </div>
      <p className="mt-5 border-t border-ink/15 pt-3 text-[10px] leading-relaxed text-ink-muted">
        Peran dan akses dikelola di Pengaturan. Perubahan peran berlaku pada
        sesi berikutnya.
      </p>
    </div>
  )
}
