import Link from "next/link"
import { Check } from "lucide-react"

import type { InfoContent } from "@/lib/content/types"
import { interestHref } from "@/lib/content/routes"

export function InfoPageContent({ content }: { content: InfoContent }) {
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <ul className="space-y-3">
          {(content.bullets ?? []).map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-3 border-b border-ink/15 pb-3 text-[13px] leading-relaxed text-ink-soft"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center bg-ink text-paper">
                <Check className="size-3" aria-hidden="true" />
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:col-span-5">
        <div className="border-2 border-ink bg-paper-2 p-5 shadow-[5px_5px_0_var(--teak)]">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-copper-dark">
            Catatan
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
            {content.footnote}
          </p>
          {content.action ? (
            <Link
              href={interestHref({
                intent: content.action.lead.variant,
                interest: content.action.lead.interest,
              })}
              className="mt-4 inline-flex min-h-11 items-center border-b border-copper-dark/40 text-[10.5px] font-bold uppercase tracking-[0.06em] text-copper-dark hover:text-ink"
            >
              {content.action.label}
            </Link>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
