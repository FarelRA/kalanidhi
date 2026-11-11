# KalaNidhi Digital: Design Direction

## The idea

**Bangku kayu: a working bench, not a course catalogue.**

KalaNidhi Digital is a place where cultural knowledge is passed hand to hand. The page should feel like a workshop at the end of the day: teak, copper, unbleached cream, wood shavings, a photograph pinned to the wall, a tag tied to a finished piece. Not a dark SaaS dashboard, not a museum vitrine, not a paper archive.

The product is a closed loop, and the page is built around it:

**Belajar → dinilai pengajar → sertifikat platform + Kartu Karya → berkarya atau berjualan → kembali mengajar, menilai, atau memasok → jalur baru lahir.**

The one memorable artifact is the **circular bench** in the loop section: five stations around a thick ring, a dashed copper return rail, and a small finished cloth travelling back to station 01. The second artifact is the **Kartu Karya tag** pinned over the hero photograph. Everything else stays disciplined.

## Palette

Built in OKLCH from five material references: teak, copper, unbleached cream, moss, and ink. Hex values live in the token layer in `app/globals.css`; components consume semantic roles, not raw hex.

| Token | Hex | Role |
| --- | --- | --- |
| `deep` | `#20130D` | Hero, ethics, closing, footer; dark teak |
| `teak` | `#3A2418` | Raised dark wood, bench edge |
| `copper` | `#A9552C` | Primary action, return rail, structural accent |
| `copper-dark` | `#8C4322` | Text accent on cream, focus ring, stamps |
| `copper-light` | `#E0A06F` | Accent on dark wood, toast icons |
| `moss` | `#4F5F43` | Community fund, access marker |
| `brass` | `#D7AD63` | Metal highlight, focus on dark wood |
| `cream` | `#F4EAD8` | Page canvas, working surface |
| `cream-2` | `#FBF4E6` | Raised paper, dialogs, tags |
| `panel` | `#E7D5B8` | Shelf, institution, works band |
| `ink` | `#2B1D14` | Primary text, ink buttons |
| `text-secondary` | `#5A493A` | Body copy |
| `text-muted` | `#6B5A4A` | Captions, metadata |

Key measured pairs: `ink` on `cream` 13.66:1; `text-secondary` on `cream` 7.19:1; `text-muted` on `cream` 5.53:1; `copper-dark` on `cream` 5.99:1; `paper` on `deep` 15.17:1; `brass` on `deep` 8.66:1. `paper` on `copper` is 4.38:1, so it is used for large text only. Status is never colour-only: `Terbuka` uses a filled square, `Sedang dipetakan` half-filled, `Direncanakan` hollow, always with the label.

## Type

- **Fraunces** for display, editorial headings, and pull quotes. Variable with `SOFT 45`, `WONK 1`, `opsz 72`; warm and slightly hand-cut without becoming a museum pastiche.
- **Karla** for body, controls, labels, and captions. Humanist, open, comfortable at small sizes.
- No monospace face. Workshop labels are Karla uppercase with wide tracking, like stencilled bench tags.

Scale: hero `clamp(2.5rem, 6vw, 4.6rem)` at 0.95 line-height; section `clamp(2.15rem, 4.3vw, 3.4rem)`; body 16px, 17px from 640px; small copy 10–13px. Measure is held to roughly 54–62 characters. Headlines are sentence case and left-aligned.

## Layout

A 1200px shell and a 12-column desktop grid. The page alternates dark teak and cream working surfaces, with panel bands for the shelf, works, and institution. Sections use 64px / 80px / 96px vertical rhythm.

- **Hero:** 6/6 split. Left: headline, description, and two actions. Right: a framed photograph, a copper correction seal, and a punched Kartu Karya tag overlapping the image.
- **Loop:** 5/7 split. Left: the circular bench drawing. Right: five numbered stages, with the return stage boxed in copper.
- **Shelf:** three readiness groups, each a row of chunky material tags over a wooden plank.
- **Paths:** horizontal bench slips with a photograph, facts, tags, and two actions.
- **Teachers:** three staggered portraits with offset name plates and a quote.
- **Works:** one large featured piece with a Kartu Karya caption, then a compact list.
- **Ethics:** dark bench with a Kartu Sumber Budaya card and a 70 / 15 / 15 share bar.
- **Closing:** dark bench with the 2026 metrics, a circular brand seal, and the final invitation.

Radii stay at 2–4px. Plates are square, framed with a hairline, and captioned underneath. Offset shadows and wood planks do the work that soft shadows usually do.

## Motion

One arrival gesture: the hero photograph settles from a slight rotation, the Kartu Karya tag drops, and the correction seal presses in. Nothing fades in per section. Hover states are limited to a 2–4px lift on shelf tags and link colour. `prefers-reduced-motion` and the existing data-saver switch collapse all animation and remove the wood-grain textures.

## The loop

The loop is the second section and the centre of gravity.

- Five stations around a thick circular bench: **Belajar, Dinilai, Tersertifikat, Berkarya, Kembali mengajar**.
- The return leg is a dashed copper rail with an arrowhead and the label **Jalur kembali**.
- A small finished cloth tag marked **KAIN** travels along the return rail back to station 01.
- The centre reads **belajar / LALU / mengajari**.
- The fifth stage is boxed in copper and labelled **Jalur kembali**.
- The note under the drawing says the return path is a door, not a promise: graduates can apply as teaching assistants, assessors, or suppliers, and each filled door opens a new path.

The same loop is echoed in the FAQ, the closing section, and the footer description. A first-time visitor sees the return path before the catalog.

## Catalog breadth

The catalog is a shelf, not a logo wall. **Rak bahan** groups ten mapped fields by readiness:

- **Sudah di bangku (2):** Batik tulis, Pranatacara.
- **Sedang disiapkan (3):** Kriya ukir kayu, Tenun, Karawitan.
- **Menunggu pengajar (5):** Tari tradisi, Keramik, Kuliner tradisi, Jamu, Wayang.

Each tag carries a region and a short note. Open fields link to the paths section. The section states the base: Yogyakarta and Jawa Tengah, with practitioners from other regions able to propose a path. New fields open when curriculum, permission, and a teacher are ready.

## Copy voice

Plain, warm, specific, and comfortable saying “belum”. Buttons name the outcome. The page avoids “maestro”, invented maturity metrics, and generic marketplace language. One evidence series is used everywhere: **10 fields, 2 open paths, 14 teachers, 24 participants, 36 assessed tasks, 12 works and services**.

Representative lines:

- “Duduk di bangku ini. Nanti kamu yang mengajari.”
- “Rak ini tumbuh satu per satu, bersama pengajarnya.”
- “Bangku berikutnya kosong.”

## Cultural and ethical rules

- The certificate is a **sertifikat platform** everywhere, with a public verification code. The ethics section, FAQ, footer, and path dialog all say it is not government or BNSP certification.
- The **Kartu Sumber Budaya** shows both knowledge sources, permission date, reference, and access level. The 70 / 15 / 15 split is shown before transaction.
- No sacred or forbidden motif is used. The brand mark is an abstract bench ring with a finished-piece tag, not a batik pattern.
- Cultural detail stays modest. The mangsa note is attributed to Giriloyo teacher interviews and explicitly disclaims weather forecasting and regional uniformity.
- The base region is stated in the shelf note, the closing, and the footer. The platform is “terbuka untuk” practitioners elsewhere, not “beroperasi di” everywhere.
- Testimonials are labelled as participant and partner interviews with permission. No partnerships, coverage, or revenue figures are invented.
- Commerce is the outlet of learning: works are documented with maker, technique, teacher, and Kartu Karya, and the learning loop is always the larger frame.

## Accessibility

- WCAG 2.1 AA target. Text pairs checked at 4.5:1; large display text above 3:1.
- Axe run on desktop and mobile with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `best-practice`: 0 violations.
- Skip link, semantic landmarks, one `h1`, labelled sections, visible focus rings. On cream, focus is copper; on dark wood, links switch to brass.
- Dialogs are Radix-based and keyboard operable; Escape closes; focus returns to the trigger. Search supports `Cmd/Ctrl+K`.
- Mobile controls are at least 44px tall. The mobile dock is hidden from assistive technology and removed from the tab order until it slides in.
- No horizontal overflow at 360, 390, 768, 1024, or 1440.
- `prefers-reduced-motion` and the data-saver switch disable the arrival gesture and wood textures.

## What not to reintroduce

- Near-black plus gold, or a cool indigo archive.
- Paper-ledger rails, folio spines, or ruled record sheets.
- Rounded-card kits or soft SaaS shadows.
- Four-step linear “how it works” rows that stop at “sell”.
- A catalog that implies every field is live.
- Ratings, review counts, or revenue claims that do not come from actual records.
- Government/BNSP accreditation language.
- “Maestro”, sample/dummy labels, or Nyantrik branding.
