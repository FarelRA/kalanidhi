"use client"

import { toast } from "sonner"

import { useDataSaver } from "@/hooks/use-data-saver"
import { setDataSaverPreference } from "@/lib/preferences"
import { cn } from "cn"

export function FooterPreferences() {
  const dataSaver = useDataSaver()

  function toggleDataSaver() {
    const next = !dataSaver
    setDataSaverPreference(next)
    toast(next ? "Mode hemat kuota aktif" : "Mode hemat kuota nonaktif", {
      description: next
        ? "Animasi dan tekstur dekoratif dikurangi pada perangkat ini."
        : "Animasi dan tekstur dekoratif kembali aktif.",
    })
  }

  function showEnglishNotice() {
    toast.info("Versi bahasa Inggris sedang disiapkan", {
      description: "Versi bahasa Inggris segera hadir.",
    })
  }

  return (
    <div className="flex flex-col gap-3 text-[12px] text-paper-dim">
      <div className="flex items-center gap-4">
        <span className="text-paper/60">Bahasa</span>
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            aria-pressed="true"
            className="border-b border-soga pb-0.5 text-paper"
          >
            Indonesia
          </button>
          <span className="text-paper/20">/</span>
          <button
            type="button"
            onClick={showEnglishNotice}
            className="border-b border-transparent pb-0.5 transition-colors hover:border-paper/30 hover:text-paper"
          >
            English
          </button>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-paper/60">Hemat kuota</span>
        <button
          type="button"
          role="switch"
          aria-checked={dataSaver}
          aria-label="Aktifkan mode hemat kuota"
          onClick={toggleDataSaver}
          className={cn(
            "relative h-5 w-9 shrink-0 rounded-full border transition-colors before:absolute before:-inset-3 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kunyit/50",
            dataSaver
              ? "border-soga/70 bg-soga/25"
              : "border-paper/25 bg-transparent",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-3.5 rounded-full transition-transform",
              dataSaver
                ? "left-[1.15rem] bg-soga"
                : "left-0.5 bg-paper/60",
            )}
          />
        </button>
      </div>
    </div>
  )
}
