import { StatusShape } from "@/components/workspace/data/status-stamp"
import type { RoleTone, StatusTone } from "@/lib/workspace/types"
import { cn } from "cn"

const roleMeta: Record<
  RoleTone,
  { label: string; tone: StatusTone; className: string }
> = {
  peserta: {
    label: "Peserta",
    tone: "open",
    className: "border-copper-dark/40 bg-copper/10 text-copper-dark",
  },
  pengajar: {
    label: "Pengajar",
    tone: "progress",
    className: "border-moss/45 bg-moss/10 text-moss",
  },
  pengelola: {
    label: "Pengelola",
    tone: "done",
    className: "border-ink/35 bg-ink/8 text-ink",
  },
  penjual: {
    label: "Penjual",
    tone: "wait",
    className: "border-brass/60 bg-brass/15 text-[#7a5212]",
  },
}

export function RoleTag({
  role,
  label,
  className,
}: {
  role: RoleTone
  label?: string
  className?: string
}) {
  const meta = roleMeta[role]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] font-bold uppercase leading-none tracking-[0.09em]",
        meta.className,
        className,
      )}
    >
      <StatusShape tone={meta.tone} />
      {label ?? meta.label}
    </span>
  )
}
