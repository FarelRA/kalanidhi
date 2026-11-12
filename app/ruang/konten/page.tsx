import type { Metadata } from "next"
import Link from "next/link"

import { ContentCmsGate } from "@/components/workspace/content/content-cms-gate"

export const metadata: Metadata = {
  title: "Konten",
}

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/ruang/konten/unggulan"
          className="inline-flex min-h-9 items-center border border-ink/25 bg-paper-2 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink/50"
        >
          Pilih unggulan landing
        </Link>
      </div>
      <ContentCmsGate />
    </div>
  )
}
