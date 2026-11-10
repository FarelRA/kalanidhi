"use client"

import { useEffect, useState } from "react"

import { useOverlay } from "@/components/overlays/overlay-provider"
import { Button } from "@/components/ui/button"
import { paths } from "@/lib/content/landing"
import { formatIDR } from "@/lib/format"
import { cn } from "cn"

const startingPrice = Math.min(
  ...paths
    .map((path) => path.price)
    .filter((price): price is number => typeof price === "number"),
)

export function MobileCtaDock() {
  const { openLead } = useOverlay()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 0.8)
    }

    const frame = window.requestAnimationFrame(onScroll)
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <aside
      aria-label="Ajakan mendaftar"
      data-state={visible ? "open" : "closed"}
      className={cn(
        "safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-soga/40 bg-ink/95 px-4 pt-3 backdrop-blur-xl transition-transform duration-300 md:hidden",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0">
          <p className="text-[10px] text-text-muted">Mulai dari</p>
          <p className="font-heading text-[1.35rem] leading-tight text-paper">
            {formatIDR(startingPrice)}
            <span className="ml-1 font-sans text-[10px] text-text-muted">
              / jalur
            </span>
          </p>
        </div>
        <Button
          type="button"
          tabIndex={visible ? undefined : -1}
          className="ml-auto shrink-0"
          onClick={() => openLead({ variant: "student" })}
        >
          Daftar minat
        </Button>
      </div>
      <p className="mt-1.5 text-[10px] text-text-muted">
        Harga termasuk paket bahan
      </p>
    </aside>
  )
}
