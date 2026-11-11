import {
  BadgeCheck,
  BookOpen,
  PenLine,
  Store,
  Undo2,
  Users,
} from "lucide-react"

import { loop } from "@/lib/content/landing"

const stageIcons = [BookOpen, PenLine, BadgeCheck, Store, Users] as const

const stations = [
  { x: 280, y: 112 },
  { x: 439.8, y: 228.1 },
  { x: 378.8, y: 415.9 },
  { x: 181.2, y: 415.9 },
  { x: 120.2, y: 228.1 },
] as const

const forwardArrows = [
  { x: 378.7, y: 144.1, angle: 36 },
  { x: 439.8, y: 331.9, angle: 108 },
  { x: 280, y: 448, angle: 180 },
  { x: 120.2, y: 331.9, angle: 252 },
] as const

export function BenchLoop() {
  return (
    <section
      id="lingkaran"
      aria-labelledby="loop-title"
      className="border-b border-ink/15 bg-cream py-16 sm:py-20 lg:py-24"
    >
      <div className="shell">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[44rem]">
            <span className="stamp border-ink/35 text-ink">{loop.label}</span>
            <h2 id="loop-title" className="heading-section mt-5 max-w-[18ch]">
              {loop.title}
            </h2>
          </div>
          <p className="body-copy max-w-[34rem] md:mb-1">{loop.description}</p>
        </div>

        <div className="mt-12 grid items-start gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-10">
          <figure className="lg:col-span-5">
            <div className="relative mx-auto max-w-[560px]">
              <svg
                viewBox="0 0 560 560"
                role="img"
                aria-labelledby="loop-svg-title loop-svg-desc"
                className="h-auto w-full overflow-visible"
              >
                <title id="loop-svg-title">
                  Bangku kerja melingkar dengan lima tahap
                </title>
                <desc id="loop-svg-desc">
                  Lima tahap tersusun mengelilingi bangku. Jalur kembali
                  membawa karya yang selesai ke bangku pertama, tempat lulusan
                  mulai mengajar.
                </desc>

                {/* Return rail: the finished piece travels back to the first seat. */}
                <path
                  d="M 63.1 209.5 A 228 228 0 0 1 280 52"
                  fill="none"
                  stroke="#3a2418"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M 63.1 209.5 A 228 228 0 0 1 280 52"
                  fill="none"
                  stroke="#a9552c"
                  strokeWidth="4"
                  strokeDasharray="2 8"
                  strokeLinecap="round"
                />
                <path
                  d="M 280 52 L 280 76"
                  fill="none"
                  stroke="#a9552c"
                  strokeWidth="4"
                  strokeLinecap="round"
                  markerEnd="url(#return-arrow)"
                />
                <defs>
                  <marker
                    id="return-arrow"
                    markerWidth="10"
                    markerHeight="10"
                    refX="6"
                    refY="5"
                    orient="auto"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 Z" fill="#a9552c" />
                  </marker>
                </defs>

                {/* The bench ring. */}
                <circle
                  cx="280"
                  cy="280"
                  r="168"
                  fill="none"
                  stroke="#3a2418"
                  strokeWidth="38"
                />
                <circle
                  cx="280"
                  cy="280"
                  r="168"
                  fill="none"
                  stroke="#4a2f20"
                  strokeWidth="38"
                  strokeDasharray="2 7"
                  opacity="0.7"
                />
                <circle
                  cx="280"
                  cy="280"
                  r="146"
                  fill="none"
                  stroke="#d7ad63"
                  strokeWidth="1.5"
                  strokeDasharray="4 7"
                  opacity="0.7"
                />

                {forwardArrows.map((arrow) => (
                  <path
                    key={`${arrow.x}-${arrow.y}`}
                    d="M -4 -5 L 5 0 L -4 5 Z"
                    fill="#d7ad63"
                    transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle})`}
                  />
                ))}

                {stations.map((station, index) => (
                  <g key={station.x}>
                    <circle
                      cx={station.x}
                      cy={station.y}
                      r="34"
                      fill="#fbf4e6"
                      stroke="#2b1d14"
                      strokeWidth="3"
                    />
                    <text
                      x={station.x}
                      y={station.y + 7}
                      textAnchor="middle"
                      fill="#2b1d14"
                      fontFamily="var(--font-heading), Georgia, serif"
                      fontSize="21"
                      fontWeight="600"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </text>
                  </g>
                ))}

                <circle
                  cx="280"
                  cy="280"
                  r="88"
                  fill="#e7d5b8"
                  stroke="#2b1d14"
                  strokeWidth="2"
                />
                <text
                  x="280"
                  y="265"
                  textAnchor="middle"
                  fill="#2b1d14"
                  fontFamily="var(--font-heading), Georgia, serif"
                  fontSize="28"
                  fontWeight="600"
                >
                  belajar
                </text>
                <text
                  x="280"
                  y="290"
                  textAnchor="middle"
                  fill="#6b5a4a"
                  fontFamily="var(--font-karla), sans-serif"
                  fontSize="13"
                  letterSpacing="1.5"
                >
                  LALU
                </text>
                <text
                  x="280"
                  y="318"
                  textAnchor="middle"
                  fill="#2b1d14"
                  fontFamily="var(--font-heading), Georgia, serif"
                  fontSize="28"
                  fontWeight="600"
                >
                  mengajari
                </text>

                {/* Finished piece on the return rail. */}
                <g transform="translate(146 95.5) rotate(54)">
                  <rect
                    x="-27"
                    y="-17"
                    width="54"
                    height="34"
                    rx="2"
                    fill="#fbf4e6"
                    stroke="#2b1d14"
                    strokeWidth="2"
                  />
                  <path
                    d="M -20 -9 H 20 M -20 0 H 20 M -20 9 H 20"
                    stroke="#a9552c"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill="#2b1d14"
                    fontFamily="var(--font-karla), sans-serif"
                    fontSize="8"
                    fontWeight="700"
                    letterSpacing="0.8"
                  >
                    KAIN
                  </text>
                </g>

                <g transform="translate(208 112)">
                  <rect
                    x="-58"
                    y="-11"
                    width="58"
                    height="22"
                    rx="1"
                    fill="#a9552c"
                  />
                  <text
                    x="-29"
                    y="4"
                    textAnchor="middle"
                    fill="#fbf4e6"
                    fontFamily="var(--font-karla), sans-serif"
                    fontSize="9"
                    fontWeight="700"
                    letterSpacing="0.9"
                  >
                    JALUR KEMBALI
                  </text>
                </g>
              </svg>
            </div>
            <figcaption className="mx-auto mt-6 max-w-[30rem] border-l-2 border-copper pl-4 text-[12px] leading-relaxed text-ink-soft">
              {loop.returnNote}
            </figcaption>
          </figure>

          <div className="lg:col-span-7">
            <ol className="space-y-3">
              {loop.stages.map((stage, index) => {
                const Icon = stageIcons[index] ?? BookOpen
                const isReturn = index === loop.stages.length - 1

                return (
                  <li
                    key={stage.code}
                    className={
                      isReturn
                        ? "grid grid-cols-[44px_1fr] gap-4 border-2 border-copper-dark bg-paper-2 p-4 sm:p-5"
                        : "grid grid-cols-[44px_1fr] gap-4 border border-ink/15 bg-paper/55 p-4 sm:p-5"
                    }
                  >
                    <span
                      className={
                        isReturn
                          ? "flex size-11 items-center justify-center bg-copper-dark text-cream-2"
                          : "flex size-11 items-center justify-center bg-panel text-ink"
                      }
                      aria-hidden="true"
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-[10px] font-bold tracking-[0.12em] text-copper-dark">
                          {stage.code}
                        </span>
                        <h3 className="font-heading text-[1.25rem] leading-tight">
                          {stage.title}
                        </h3>
                        {isReturn ? (
                          <span className="stamp stamp-soft border-copper-dark/50 text-copper-dark">
                            {loop.returnLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink/70">
                        {stage.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="mt-5 flex items-start gap-3 border-t-2 border-ink/20 pt-5">
              <Undo2 className="mt-0.5 size-4 shrink-0 text-copper-dark" aria-hidden="true" />
              <p className="text-[12.5px] leading-relaxed text-ink/70">
                Jalur kembali tidak menjanjikan semua lulusan mengajar. Pintu
                ini disiapkan untuk pengajar pendamping, penilai tugas, atau
                pemasok bahan. Setiap pintu yang terisi membuka jalur baru.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
