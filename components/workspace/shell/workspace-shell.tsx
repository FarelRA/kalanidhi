"use client"

import * as React from "react"

import { CapabilityGate } from "@/components/workspace/shell/capability-gate"
import { CommandPalette } from "@/components/workspace/shell/command-palette"
import { MobileNav } from "@/components/workspace/shell/mobile-nav"
import { ViewerProvider } from "@/components/workspace/shell/viewer-provider"
import { WorkspaceRail } from "@/components/workspace/shell/workspace-rail"
import { WorkspaceTopbar } from "@/components/workspace/shell/workspace-topbar"
import type { Viewer } from "@/lib/access/viewer"

export function WorkspaceShell({
  children,
  viewer = null,
  preview = false,
}: {
  children: React.ReactNode
  viewer?: Viewer | null
  preview?: boolean
}) {
  const [searchOpen, setSearchOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <ViewerProvider viewer={viewer} preview={preview}>
      <div className="min-h-svh bg-cream">
        <a
          href="#konten-ruang"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:border-2 focus:border-ink focus:bg-paper-2 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink"
        >
          Lewati ke konten ruang kerja
        </a>
        <WorkspaceRail />
        <div className="min-w-0 lg:pl-[252px]">
          <WorkspaceTopbar onOpenSearch={() => setSearchOpen(true)} />
          <main
            id="konten-ruang"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1500px] min-w-0 px-3 py-5 pb-24 sm:px-5 lg:px-7 lg:py-7 lg:pb-12"
          >
            {preview ? <PreviewBanner /> : null}
            <CapabilityGate>
              {preview ? children : <LiveFoundation viewer={viewer} />}
            </CapabilityGate>
          </main>
        </div>
        <MobileNav />
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </ViewerProvider>
  )
}

function PreviewBanner() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 border border-copper-dark/35 bg-panel/70 px-3 py-2">
      <span className="border border-copper-dark/40 bg-copper/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-copper-dark">
        Pratinjau pengembangan
      </span>
      <span className="text-[10px] leading-relaxed text-ink-soft">
        Data lokal untuk pengembangan. Tidak tersambung ke Convex dan bukan
        data produksi.
      </span>
    </div>
  )
}

function LiveFoundation({ viewer }: { viewer: Viewer | null }) {
  return (
    <div className="mx-auto max-w-2xl border border-ink/25 bg-paper-2 p-5 sm:p-8">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-copper-dark">
        Fondasi ruang kerja
      </p>
      <h1 className="heading-section mt-2 text-[clamp(1.8rem,4vw,2.7rem)]">
        Sesi dan peran sudah tersambung.
      </h1>
      <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-soft">
        {viewer?.name ?? "Akun ini"} masuk sebagai{" "}
        <strong>{viewer?.roleLabel ?? "tanpa peran"}</strong>. Modul fitur
        dibuka pada fase berikutnya; ruang ini tidak menampilkan data lokal
        sebagai data nyata.
      </p>
      <dl className="mt-6 grid gap-2 border-t border-ink/15 pt-4 text-[11px] sm:grid-cols-2">
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
            Kemampuan aktif
          </dt>
          <dd className="mt-1 text-ink">{viewer?.capabilities.length ?? 0}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-[0.08em] text-ink-muted">
            Cakupan jual
          </dt>
          <dd className="mt-1 text-ink">
            {viewer?.sellScopes.length ? viewer.sellScopes.join(", ") : "Belum ada"}
          </dd>
        </div>
      </dl>
    </div>
  )
}
