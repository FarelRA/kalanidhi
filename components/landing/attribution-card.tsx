import { InfoButton } from "@/components/overlays/overlay-buttons"
import { attribution } from "@/lib/content/landing"

export function AttributionCard() {
  return (
    <div className="border-t border-soga/40 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-soga/60 font-heading text-[10px] text-soga"
          >
            SG
          </span>
          <div>
            <p className="text-[10px] text-text-muted">
              Kartu sumber budaya
            </p>
            <p className="mt-1 font-heading text-[1.1rem] text-paper">
              {attribution.community}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-paper-dim">
              {attribution.permission}
            </p>
            <p className="mt-1 text-[10px] text-soga/80">
              {attribution.reference}
            </p>
          </div>
        </div>
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
    </div>
  )
}
