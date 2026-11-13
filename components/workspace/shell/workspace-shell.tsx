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
  viewer,
}: {
  children: React.ReactNode
  viewer: Viewer
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
    <ViewerProvider viewer={viewer}>
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
            <CapabilityGate>{children}</CapabilityGate>
          </main>
        </div>
        <MobileNav />
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </ViewerProvider>
  )
}
