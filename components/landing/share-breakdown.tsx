import { Info } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { shareBreakdown } from "@/lib/content/landing"
import { cn } from "cn"

const colors = ["bg-soga", "bg-indigo-dust", "bg-paper/35"]

export function ShareBreakdown({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden bg-paper/10">
        {shareBreakdown.map((row, index) => (
          <div
            key={row.label}
            className={cn(colors[index], "h-full")}
            style={{ width: `${row.value}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <ul className={cn("mt-6", compact ? "space-y-4" : "space-y-5")}>
        {shareBreakdown.map((row, index) => (
          <li key={row.label}>
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn("size-2 shrink-0", colors[index])}
                  aria-hidden="true"
                />
                <span className="text-[13px] text-paper">{row.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Penjelasan pembagian ${row.label}`}
                      className="shrink-0 text-text-muted transition-colors hover:text-soga"
                    >
                      <Info className="size-3" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] border border-soga/30 bg-ink-2 text-[11px] leading-relaxed text-paper-dim">
                    {row.note}
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-heading text-[1.4rem] leading-none text-paper">
                {row.value}%
              </span>
            </div>
            {!compact ? (
              <p className="mt-2 pl-[1.1rem] text-[11px] leading-relaxed text-text-muted">
                {row.note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-paper/12 pt-3 text-[10px] leading-relaxed text-text-muted">
        Persentase final ditampilkan sebelum transaksi. Rincian ini berlaku
        untuk setiap pembayaran.
      </p>
    </div>
  )
}
