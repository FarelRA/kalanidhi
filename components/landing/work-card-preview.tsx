import { hero } from "@/lib/content/landing"

function FakeQr() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 29 29"
      className="size-11 text-ink"
      fill="currentColor"
    >
      <path d="M0 0h9v9H0V0Zm2 2v5h5V2H2Zm2 2h1v1H4V4Zm16-4h9v9h-9V0Zm2 2v5h5V2h-5Zm2 2h1v1h-1V4ZM0 20h9v9H0v-9Zm2 2v5h5v-5H2Zm2 2h1v1H4v-1Zm9-24h2v2h-2V0Zm2 2h2v2h-2V2Zm2 2h2v2h-2V4Zm2 2h2v2h-2V6Zm-6 6h2v2h-2v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm2 2h2v2h-2v-2Zm-8 2h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-6 2h2v2h-2v-2Zm8 0h2v2h-2v-2Zm2 2h2v2h-2v-2Zm-10 2h2v2h-2v-2Zm4 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm2 2h2v2h-2v-2Zm-8 2h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-6 2h9v2h-9v-2Zm9 0h3v3h-3v-3Z" />
    </svg>
  )
}

export function WorkCardPreview() {
  const { workCard } = hero

  return (
    <div className="paper-slip relative rounded-[3px] border border-ink/15 p-5">
      <div
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-px bg-ink/10"
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] tracking-[0.14em] text-soga-ink">
            {workCard.title.toUpperCase()}
          </p>
          <p className="mt-1 font-heading text-[1.25rem] leading-none text-ink">
            Batik tulis
          </p>
          <p className="mt-1 text-[10px] text-ink/70">
            Nomor seri #{workCard.serial}
          </p>
        </div>
        <span className="border border-ink/15 p-1">
          <FakeQr />
        </span>
      </div>

      <dl className="mt-4 space-y-1.5 border-y border-ink/15 py-3 text-[11px]">
        <div className="flex justify-between gap-3">
          <dt className="text-ink/70">Karya</dt>
          <dd className="text-right font-medium text-ink">{workCard.work}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink/70">Pembuat</dt>
          <dd className="font-medium text-ink">{workCard.maker}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink/70">Pengajar</dt>
          <dd className="font-medium text-ink">{workCard.teacher}</dd>
        </div>
      </dl>
    </div>
  )
}
