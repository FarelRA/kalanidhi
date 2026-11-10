import { mangsa } from "@/lib/content/landing"

const names = [
  "Kasa",
  "Karo",
  "Katelu",
  "Kapat",
  "Kalima",
  "Kanem",
  "Kapitu",
  "Kawolu",
  "Kasanga",
  "Kasadasa",
  "Desta",
  "Saddha",
]

const ticks = names.map((name, index) => {
  const angle = ((index * 30 - 90) * Math.PI) / 180
  const inner = index === 0 ? 74 : 77
  const outer = 84
  const labelRadius = 101
  const x1 = 110 + Math.cos(angle) * inner
  const y1 = 110 + Math.sin(angle) * inner
  const x2 = 110 + Math.cos(angle) * outer
  const y2 = 110 + Math.sin(angle) * outer
  const lx = 110 + Math.cos(angle) * labelRadius
  const ly = 110 + Math.sin(angle) * labelRadius

  return { name, x1, y1, x2, y2, lx, ly, active: index === 0 }
})

export function MangsaWheel() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[29rem]">
      <svg
        viewBox="-12 -12 244 244"
        role="img"
        aria-label={`Roda 12 mangsa, posisi musim ${mangsa.name}`}
        className="size-full"
      >
        <circle
          cx="110"
          cy="110"
          r="91"
          fill="none"
          stroke="rgb(251 244 232 / 0.14)"
          strokeWidth="0.8"
        />
        <circle
          cx="110"
          cy="110"
          r="67"
          fill="none"
          stroke="rgb(251 244 232 / 0.14)"
          strokeWidth="0.8"
          strokeDasharray="1.5 5"
        />
        <circle
          cx="110"
          cy="110"
          r="46"
          fill="none"
          stroke="rgb(251 244 232 / 0.12)"
          strokeWidth="0.8"
        />
        <circle
          cx="110"
          cy="110"
          r="91"
          fill="none"
          stroke="#E4A67E"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="23.8 547.9"
          transform="rotate(-90 110 110)"
        />
        {ticks.map((tick) => (
          <g key={tick.name}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={tick.active ? "#E4A67E" : "rgb(251 244 232 / 0.3)"}
              strokeWidth={tick.active ? 2 : 1}
              strokeLinecap="round"
            />
            <text
              x={tick.lx}
              y={tick.ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={tick.active ? "#E4A67E" : "rgb(251 244 232 / 0.5)"}
              fontSize="4.6"
              letterSpacing="0.1"
            >
              {tick.name}
            </text>
          </g>
        ))}
        <circle cx="110" cy="19" r="2.4" fill="#E4A67E" />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] text-soga">{mangsa.season}</span>
        <span className="mt-1 font-heading text-[2.6rem] leading-none text-paper">
          {mangsa.name}
        </span>
        <span className="mt-2 text-[10px] text-text-muted">{mangsa.period}</span>
      </div>
    </div>
  )
}
