import {
  BadgeCheck,
  BookOpen,
  PenLine,
  Store,
  Undo2,
  Users,
} from "lucide-react"

import type { LoopContent } from "@/lib/content/types"

const stageIcons = [BookOpen, PenLine, BadgeCheck, Store, Users] as const

/**
 * The rail is deliberately uneven: each step sits a little further in than the
 * one before, so the eye walks down the bench instead of scanning a card grid.
 * Only literal class names are listed here so Tailwind can see them.
 */
const stageIndent = [
  "lg:pl-0",
  "lg:pl-12",
  "lg:pl-24",
  "lg:pl-36",
] as const

export function BenchLoop({ loop }: { loop: LoopContent }) {
  const returnStage = loop.stages[loop.stages.length - 1]
  const workedStages = loop.stages.slice(0, -1)

  return (
    <section
      id="lingkaran"
      aria-labelledby="loop-title"
      className="relative border-b border-ink/15 bg-cream py-16 sm:py-20 lg:py-28"
    >
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <span className="stamp border-ink/35 text-ink">{loop.label}</span>
            <h2
              id="loop-title"
              className="heading-section mt-5 max-w-[17ch] text-balance"
            >
              {loop.title}
            </h2>
          </div>
          <p className="body-copy max-w-[34rem] lg:col-span-4 lg:col-start-9 lg:pb-2">
            {loop.description}
          </p>
        </div>

        <div className="mt-14 grid lg:mt-20 lg:grid-cols-12">
          <div
            className="hidden lg:col-span-1 lg:flex lg:flex-col lg:items-center lg:gap-5"
            aria-hidden="true"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.32em] text-ink/40 [writing-mode:vertical-rl]">
              alur kerja
            </span>
            <span className="w-px flex-1 bg-gradient-to-b from-ink/25 via-ink/15 to-transparent" />
          </div>

          <ol className="border-t border-ink/15 lg:col-span-11 lg:border-t-0">
            {workedStages.map((stage, index) => {
              const Icon = stageIcons[index] ?? BookOpen

              return (
                <li
                  key={stage.code}
                  className={`relative grid gap-4 border-b border-ink/15 py-8 transition-colors duration-300 hover:bg-paper/40 sm:grid-cols-[5.5rem_1fr] sm:gap-8 sm:py-9 ${stageIndent[index] ?? "lg:pl-0"}`}
                >
                  <div className="flex items-center gap-4 sm:block">
                    <span
                      aria-hidden="true"
                      className="block font-heading text-[2.9rem] leading-none tabular-nums text-transparent [-webkit-text-stroke:1.2px_var(--color-copper-dark)] sm:text-[3.6rem]"
                    >
                      {stage.code}
                    </span>
                    <span
                      aria-hidden="true"
                      className="hidden h-px w-8 bg-ink/20 sm:mt-4 sm:block"
                    />
                  </div>

                  <div className="max-w-[40rem]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span
                        className="flex size-8 items-center justify-center border border-ink/25 bg-paper/60 text-ink"
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <h3 className="font-heading text-[1.35rem] leading-tight">
                        {stage.title}
                      </h3>
                      <span className="ml-auto hidden text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35 sm:block">
                        langkah {stage.code} / {String(loop.stages.length).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-2.5 max-w-[36rem] text-[13.5px] leading-relaxed text-ink/70">
                      {stage.description}
                    </p>
                  </div>
                </li>
              )
            })}

            {returnStage ? (
              <li className="pt-10 lg:pl-16">
                <div className="relative border-2 border-copper-dark bg-paper-2 shadow-[7px_7px_0_0_rgba(58,36,24,0.14)]">
                  <span className="absolute -top-3 left-6 bg-cream px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-copper-dark">
                    {loop.returnLabel}
                  </span>

                  <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
                    <div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span
                          aria-hidden="true"
                          className="font-heading text-[2.6rem] leading-none tabular-nums text-copper-dark/25"
                        >
                          {returnStage.code}
                        </span>
                        <span
                          className="flex size-8 items-center justify-center bg-copper-dark text-cream-2"
                          aria-hidden="true"
                        >
                          <Users className="size-4" />
                        </span>
                        <h3 className="font-heading text-[1.5rem] leading-tight text-copper-dark">
                          {returnStage.title}
                        </h3>
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] text-copper-dark/55">
                          langkah {returnStage.code} /{" "}
                          {String(loop.stages.length).padStart(2, "0")}
                        </span>
                      </div>
                      <p className="mt-3 max-w-[38rem] text-[13.5px] leading-relaxed text-ink/75">
                        {returnStage.description}
                      </p>
                    </div>

                    <p className="border-l-2 border-copper/70 pl-4 text-[12px] leading-relaxed text-ink-muted lg:border-l lg:border-ink/20 lg:pl-5">
                      {loop.returnNote}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex max-w-[52rem] items-start gap-3 border-t-2 border-ink/20 pt-5">
                  <Undo2
                    className="mt-0.5 size-4 shrink-0 text-copper-dark"
                    aria-hidden="true"
                  />
                  <p className="text-[12.5px] leading-relaxed text-ink/70">
                    {loop.returnCaveat}
                  </p>
                </div>
              </li>
            ) : null}
          </ol>
        </div>
      </div>
    </section>
  )
}
