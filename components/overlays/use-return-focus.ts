"use client"

import { useEffect, useState } from "react"

/**
 * Capture the element that opened a dialog before Radix moves focus, then
 * restore it when the dialog unmounts. Dialogs in this app are opened from
 * regular buttons rather than DialogTrigger, so Radix has no trigger to
 * return to on its own.
 */
export function useReturnFocus() {
  const [trigger] = useState<HTMLElement | null>(() => {
    if (typeof document === "undefined") return null
    const active = document.activeElement
    if (active instanceof HTMLElement && active !== document.body) {
      return active
    }
    return null
  })

  useEffect(() => {
    return () => {
      if (trigger && document.contains(trigger)) {
        window.setTimeout(() => trigger.focus({ preventScroll: true }), 0)
      }
    }
  }, [trigger])
}
