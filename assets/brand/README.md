# Brand assets

`kalanidhi-logo.png` is the master artwork: a cream KalaNidhi mark on a dark
wood tile (4096 × 4096, RGBA).

Everything the app serves is derived from it:

| File | Purpose |
| --- | --- |
| `public/brand/kalanidhi-mark-ink-256.webp` | Transparent mark for light surfaces at UI sizes. |
| `public/brand/kalanidhi-mark-ink.webp` | 1024 px transparent mark for light surfaces at large sizes. |
| `public/brand/kalanidhi-mark-paper-256.webp` | Transparent mark for dark wood surfaces at UI sizes. |
| `public/brand/kalanidhi-mark-paper.webp` | 1024 px transparent mark for dark wood surfaces at large sizes. |
| `public/brand/kalanidhi-icon-192.png`, `-512.png` | PWA / manifest icons using the original tile. |
| `public/brand/kalanidhi-icon-maskable-512.png` | Maskable PWA icon with the mark inside the safe zone. |
| `app/icon.png`, `app/apple-icon.png` | Next.js file-convention icons. |
| `app/favicon.ico` | Multi-size favicon (16–256 px). |

The transparent renditions key out the tile background, keep the cream holes
as transparency, and are cropped to the mark so it aligns optically with the
wordmark. Regenerate exports from the master if the artwork changes; keep the
1024 px height and 774 × 1024 aspect ratio referenced by
`components/brand/brand-mark.tsx`.
