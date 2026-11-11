# KalaNidhi Digital — 10 Design Variations

Ten independent redesigns of the landing page, each built in its own worktree from the corrected baseline (`51fbeb4`). Every variation keeps the same product truth — the all-culture closed loop, platform-only certificate, honest pilot numbers, attribution, and 70/15/15 revenue share — but changes the art direction, palette, typography, layout, motion, copy voice, and loop device.

A visual index is in [`docs/variations/heroes.jpg`](docs/variations/heroes.jpg).

## View all ten at one address

```bash
npm run gallery
```

Open **http://localhost:3500**. The gallery is a single control room with all ten previews in one iframe, a concept switcher, desktop/tablet/mobile viewport presets, keyboard shortcuts (`[`, `]`, `1`–`0`), and an overview grid. It expects the ten preview servers on ports 3401–3410 to be running.

## The set

| # | Concept | Direction | Key palette | Type | Loop device | Commit | Port |
|---|---|---|---|---|---|---|---|
| 01 | **Malam Canting** | Dark cinematic night in the workshop; full-bleed film stills, one wax lamp, scene chapters | indigo-black `#0B1118`, panel `#101A27`, wax amber `#E8A45C`, smoke `#A3B0BF` | Newsreader + IBM Plex Sans/Mono | Five-still film reel with a sprocketed amber return thread | `d480c3d` | 3401 |
| 02 | **Tenun Berjalan** | Raw-cotton working loom and archive; the ten fields are a warp, the loop is a red weft | cotton `#F2ECDD`, ink `#17150F`, tarum indigo `#16365C`, vermilion `#A8321E` | Bricolage Grotesque + Work Sans + Instrument Serif | Red weft returning through a ten-field warp; spiral return path | `0ced74f` | 3402 |
| 03 | **Buku Indigo** | Midday indigo dye-house ledger; rules, registers, chapter gutters, no cards | paper `#F7F6F1`, ink `#181E2C`, indigo `#3A4E8C`, madder `#A03622`, moss `#326445` | Newsreader + Archivo | Circular “loop seal” around the hero image; `05 ↳ 01` close | `adee083` | 3403 |
| 04 | **Bangku Kayu** | Warm workshop bench; teak and copper, physical tags, tools, overhead bench | deep teak `#20130D`, brown `#3A2418`, copper `#A9552C`, cream `#F4EAD8`, moss `#4F5F43` | Fraunces + Karla | Circular five-seat bench with a finished cloth travelling back to station 01 | `1463044` | 3404 |
| 05 | **Buku Kerja** | Practitioner’s working ledger; ruled grid, red margin, pasted photos, correction marks | chalk `#F8F7F2`, ink `#1A2433`, indigo `#27396B`, vermilion `#A83325`, manila `#E8E0CD` | Archivo + IBM Plex Sans/Mono | Five-station ring with a dashed vermilion return path and a “Yang kembali” register | `0083c79` | 3405 |
| 06 | **Panggung** | Living theatre; stage black and plum, spotlight, curtain folds, playbill, five acts | stage `#0B0809`, plum `#2A0F1A`, curtain `#7E1B2A`, cream `#F4E8CF`, brass | Bodoni Moda + Archivo | Five-act stage with a brass return arc from Act V to Act I | `a55fbb6` | 3406 |
| 07 | **Tenun Terbuka** | Chalk-white print-shop textile system; flat dye inks, selvedge edges, ledger sheets | chalk `#F2F3EA`, ink `#17201C`, indigo `#243E8F`, madder `#A83327`, ochre `#795A12` | Bricolage Grotesque + Instrument Sans | Five warp stages crossed by a madder weft; dashed new-thread stubs | `5b6a283` | 3407 |
| 08 | **Poster Nusantara** | Modernist poster campaign; oversized grotesque, hard grid, flat spot inks | off-white `#F4F1E7`, ink `#12110F`, cobalt `#163FA8`, signal red `#D3261B`, mustard `#EAB41F` | Archivo Black + Archivo | `05 → 01` circular stamp, five-panel poster sequence, red return strip | `ffc33ad` | 3408 |
| 09 | **Lembar Koreksi** | Marked-up worksheet; assessment itself is the visual language | mineral paper `#E8EBE2`, chalk `#F9FAF4`, ink `#16201C`, correction `#B3391F`, indigo `#2F4670` | Archivo + Newsreader | Red margin path returning from station 05 to 01; circled closing headline | `d8a7794` | 3409 |
| 10 | **Rempah** | Naturalist apothecary and botanical index; jars, roots, soft daylight | cream `#F5EEDF`, forest `#173A2B`, turmeric, clay `#B45F3C`, sage `#B8C4A7` | Fraunces + Karla | “Lingkar Tanam” vine circle: five plant stages returning to soil | `debac65` | 3410 |

## How the set is balanced

- **Dark / immersive:** 01, 04, 06.
- **Light archive / ledger cluster:** 02, 03, 05, 07, 09. They share a paper-and-indigo family but differ in artifact and type: loom, loop seal, correction sheet, selvedge, marked worksheet.
- **Graphic / campaign:** 08.
- **Naturalist / organic:** 10.

The first pass produced ten light archive pages. Variations 01, 04, 06, 08, and 10 were deliberately pivoted to prevent the set from collapsing into one visual family.

## Shared product truth

Every variation keeps:

- the closed loop **belajar → dinilai pengajar → sertifikat platform + Kartu Karya → karya/jasa → kembali mengajar/memasok → jalur baru**;
- the all-culture catalog as a staged index, not a claim that every field is live;
- one consistent trial series: 10 fields, 14 teachers/practitioners, 24 pilot participants, 36 assessed tasks, 12 works/services (four shown);
- the platform certificate with a public verification code, never government/BNSP accreditation;
- cultural attribution, permission, access level, and the 70/15/15 share split;
- no “maestro”, “contoh”, “dummy”, “prototipe”, or “sample” labels;
- Yogyakarta / Jawa Tengah as the honest base, open to practitioners from other regions;
- working forms, search, dialogs, navigation, mobile dock, reduced-motion support, and WCAG 2.1 AA behavior.

## Verification

All ten branches passed:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- axe-core with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`
- no horizontal overflow at 360, 390, 768, 1024, 1440

Variation 04 has a few axe `color-contrast` items marked **incomplete** (text over photography or a pseudo-element), not violations; this is documented in its `VARIATION.md`.

## Preview locally

Each variation is a Git worktree with its own branch and production server port:

```bash
# list worktrees
git worktree list

# example: Variation 06
cd /home/farel/.local/share/opencode/worktree/c25ad5/variation-06
npm ci        # if node_modules is not already installed there
npm run build
npx next start -p 3406
```

Then open `http://localhost:3406`. The other ports follow the table above.

## Choosing a direction

- If the goal is **premium, quiet, and editorial**, start with 03, 05, or 07.
- If the goal is **emotional and memorable**, start with 01 or 06.
- If the goal is **tactile and human**, start with 04 or 10.
- If the goal is **loud, campaign-like, and easy to scan**, start with 08.
- If the goal is **differentiation through the assessment promise**, start with 09.

Each worktree contains a `VARIATION.md` with its full palette table (including OKLCH values and contrast pairs), type scale, layout logic, copy voice, cultural decisions, accessibility notes, and skill rationale.
