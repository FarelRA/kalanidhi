"use client"

import { useEffect, useState } from "react"

export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string>("")

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    const visible = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio)
          } else {
            visible.delete(entry.target.id)
          }
        }

        const best = [...visible.entries()].sort(
          (a, b) => b[1] - a[1],
        )[0]

        setActive(best?.[0] ?? "")
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: [0, 0.15, 0.4, 0.75, 1],
      },
    )

    for (const element of elements) observer.observe(element)

    return () => observer.disconnect()
  }, [ids])

  return active
}
