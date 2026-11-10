"use client"

import { useEffect, useSyncExternalStore } from "react"

import {
  getDataSaverServerSnapshot,
  getDataSaverSnapshot,
  subscribeDataSaver,
} from "@/lib/preferences"

export function useDataSaver() {
  const enabled = useSyncExternalStore(
    subscribeDataSaver,
    getDataSaverSnapshot,
    getDataSaverServerSnapshot,
  )

  useEffect(() => {
    const root = document.documentElement

    if (enabled) {
      root.dataset.dataSaver = "on"
    } else if (root.dataset.dataSaver) {
      delete root.dataset.dataSaver
    }
  }, [enabled])

  return enabled
}
