# KalaNidhi Digital: Design Direction

## The idea

**Warm stone, soga, and indigo dust.**

The interface should feel like a working studio at dusk: quiet rooms, warm stone, soga, indigo dust, brass gamelan, paper certificates. Not a dark SaaS dashboard, not a museum vitrine, not a generic “black + gold” landing page.

The one memorable artifact is the **Kartu Karya slip** in the hero: a cream paper object with a serial number, overlapping a photographic plate. Everything around it stays disciplined.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#34302B` | Page canvas, warm stone graphite |
| `ink-2` | `#3E3933` | Raised surface, image plates |
| `paper` | `#FBF4E8` | Primary text, buttons, Kartu Karya |
| `soga` | `#E4A67E` | Rules, ordinals, secondary accent |
| `indigo-dust` | `#A9C0CF` | Verified states, process notes |
| `kunyit` | `#EAC47C` | Focus, small highlights only |

Gold is not the primary CTA colour. Primary actions are **paper on ink**.

## Type

- **Fraunces**: display and editorial headings. Soft, slightly wonky serif that carries craft and print without becoming a museum cliché.
- **Plus Jakarta Sans**: body, labels, controls. Designed in Jakarta; appropriate to the subject.

Rules:

- No all-caps eyebrows. Section markers are italic Fraunces, sentence case, in soga.
- Headlines are large, tight, and left-aligned. No highlighted single words.
- Body line length under 70 characters. 16px minimum on desktop, 15px on mobile.
- Roman numerals for genuine sequences, never decorative `01 / 02` chips.

## Layout

- 12-column editorial grid, max 1240px, large outer margins.
- Asymmetry is the default: 7/5 hero, 7/5 paths, 4/8 FAQ.
- Cards are removed where a rule, caption, or white space can do the job.
- Corners are small (4-8px) except the circular mangsa dial and avatars.
- Hairline rules in warm paper at 12-16% opacity; soga for structural rules.
- One warm soga-ink band for the institution section; the rest is warm stone ink.
- Photography is treated as **plates**: thin border, numbered caption rail, duotone-adjacent warmth.

## Motion

- One page-load moment: the hero plate and Kartu Karya slip settle into place.
- Interaction motion only: dialogs, accordion, carousel, saved state.
- No per-section fade-up. No hover lift on every card.
- Respect `prefers-reduced-motion` and the data-saver switch.

## Copy

- Sentence case, active voice, specific.
- No fake urgency, no invented cultural claims.
- Every cultural detail carries a source and permission note.
- Buttons name the outcome: “Lihat jalur”, “Daftar minat”, “Buka formulir”.

## What was removed from the previous direction

- The near-black + bright gold palette
- Uppercase tracked eyebrows on every section
- Identical rounded cards for stats, steps, paths, teachers, works, testimonials
- Gold pill CTAs with trailing arrows
- Section-wide fade-up animations
- Floating generic “dashboard card” in the hero
