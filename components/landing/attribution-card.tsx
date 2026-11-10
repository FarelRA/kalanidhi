import { InfoButton } from "@/components/overlays/overlay-buttons"
import { attribution } from "@/lib/content/landing"

export function AttributionCard() {
  return (
    <div className="border-t border-soga/40 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-[10px] text-text-muted">{attribution.label}</p>
        <div className="flex items-center gap-3">
          <span className="border border-paper/15 px-2 py-1 text-[10px] text-text-muted">
            Akses {attribution.access.toLowerCase()}
          </span>
          <InfoButton
            infoKey="policy"
            variant="ghost"
            size="xs"
            className="border-0 border-b border-paper/25 px-0 text-paper-dim hover:bg-transparent hover:text-paper"
          >
            Kebijakan
          </InfoButton>
        </div>
      </div>

      <ul className="mt-4 space-y-4">
        {attribution.sources.map((source, index) => (
          <li
            key={source.name}
            className={index > 0 ? "border-t border-paper/12 pt-4" : undefined}
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-soga/60 font-heading text-[10px] text-soga"
              >
                {source.initials}
              </span>
              <div>
                <p className="font-heading text-[1.1rem] leading-tight text-paper">
                  {source.name}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-paper-dim">
                  {source.field}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[10px] leading-relaxed text-paper-dim">
        {attribution.permission}
      </p>
      <p className="mt-1 text-[10px] text-soga/80">{attribution.reference}</p>
      <p className="mt-3 text-[10px] leading-relaxed text-text-muted">
        {attribution.note}
      </p>
    </div>
  )
}
