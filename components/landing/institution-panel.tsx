"use client"

import { useState } from "react"

import { useOverlay } from "@/components/overlays/overlay-provider"
import { Button } from "@/components/ui/button"
import { institution } from "@/lib/content/landing"
import { cn } from "cn"

const brief = institution.brief

export function InstitutionPanel() {
  const [segment, setSegment] = useState(institution.segments[0])
  const { openLead } = useOverlay()

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <p className="text-[11px] text-soga">Pilih segmen</p>
        <div
          role="group"
          aria-label="Segmen institusi"
          className="mt-4 border-t border-paper/15"
        >
          {institution.segments.map((option) => {
            const active = segment === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setSegment(option)}
                className={cn(
                  "flex w-full items-center justify-between gap-4 border-b border-paper/15 py-3.5 text-left transition-colors",
                  active ? "text-paper" : "text-paper/50 hover:text-paper",
                )}
              >
                <span
                  className={cn(
                    "font-heading text-[1.5rem] leading-none sm:text-[1.8rem]",
                    active && "text-soga",
                  )}
                >
                  {option}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px transition-all",
                    active ? "w-10 bg-soga" : "w-4 bg-paper/25",
                  )}
                />
              </button>
            )
          })}
        </div>

        <ul className="mt-6 space-y-2.5">
          {institution.points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 text-[13px] leading-relaxed text-paper-dim"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-dust" />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Button
            type="button"
            size="sm"
            onClick={() =>
              openLead({ variant: "institution", interest: segment })
            }
          >
            {institution.cta}
          </Button>
          <button
            type="button"
            onClick={() =>
              openLead({
                variant: "consultation",
                interest: `Institusi, ${segment}`,
              })
            }
            className="border-b border-paper/30 pb-0.5 text-[12px] text-paper-dim transition-colors hover:border-soga hover:text-soga"
          >
            Konsultasi singkat
          </button>
        </div>
      </div>

      <div className="lg:col-span-5">
        <div className="border-t border-soga/50 pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[10px] text-text-muted">Segmen terpilih</p>
            <p className="text-[10px] text-soga">Ringkasan</p>
          </div>
          <p className="mt-1 font-heading text-[2rem] leading-none text-paper">
            {segment}
          </p>

          <dl className="mt-6">
            {brief.map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-paper/15 py-3"
              >
                <dt className="text-[11px] text-text-muted">{label}</dt>
                <dd className="text-right text-[12px] text-paper">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 text-[10px] leading-relaxed text-text-muted">
            {institution.note}
          </p>
        </div>
      </div>
    </div>
  )
}
