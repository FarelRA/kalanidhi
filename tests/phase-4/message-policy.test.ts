import { describe, expect, it } from "vitest"

import {
  attachmentProblem,
  baseMimeType,
  DEFAULT_RETENTION_DAYS,
  extensionForMime,
  hasExternalLink,
  looksLikeSpam,
  MAX_VOICE_BYTES,
  MAX_VOICE_DURATION_MS,
  reasonProblem,
  retentionCutoff,
} from "../../lib/messaging/policy"

describe("messaging / attachment policy", () => {
  it("[P4-MSG-30] strips codec parameters before the MIME allowlist check", () => {
    expect(baseMimeType("audio/webm;codecs=opus")).toBe("audio/webm")
    expect(extensionForMime("audio/webm;codecs=opus")).toBe(".webm")
    expect(extensionForMime("audio/ogg;codecs=opus")).toBe(".ogg")
    expect(extensionForMime("audio/mp4")).toBe(".m4a")
    expect(extensionForMime("audio/mpeg")).toBe(".mp3")
    expect(
      attachmentProblem("voice", {
        filename: "catatan.webm",
        mimeType: "audio/webm;codecs=opus",
        size: 1_024,
        durationMs: 3_000,
      }),
    ).toBeNull()
  })

  it("[P4-MSG-31] enforces voice size, duration, and waveform bounds", () => {
    expect(
      attachmentProblem("voice", {
        filename: "catatan.webm",
        mimeType: "audio/webm",
        size: MAX_VOICE_BYTES + 1,
        durationMs: 1_000,
      }),
    ).not.toBeNull()
    expect(
      attachmentProblem("voice", {
        filename: "catatan.webm",
        mimeType: "audio/webm",
        size: 1_000,
        durationMs: MAX_VOICE_DURATION_MS + 1,
      }),
    ).not.toBeNull()
    expect(
      attachmentProblem("voice", {
        filename: "catatan.webm",
        mimeType: "audio/webm",
        size: 1_000,
        durationMs: 1_000,
        waveform: [0.2, 1.4],
      }),
    ).not.toBeNull()
  })

  it("[P4-MSG-36] rejects extension and MIME mismatches and unsafe image types", () => {
    expect(
      attachmentProblem("voice", {
        filename: "catatan.txt",
        mimeType: "audio/webm",
        size: 1_000,
        durationMs: 1_000,
      }),
    ).not.toBeNull()
    expect(
      attachmentProblem("image", {
        filename: "gambar.svg",
        mimeType: "image/svg+xml",
        size: 1_000,
      }),
    ).not.toBeNull()
    expect(
      attachmentProblem("image", {
        filename: "gambar.png",
        mimeType: "image/png",
        size: 1_000,
      }),
    ).toBeNull()
    expect(
      attachmentProblem("file", {
        filename: "lembar.pdf",
        mimeType: "application/pdf",
        size: 1_000,
      }),
    ).toBeNull()
  })
})

describe("messaging / link and spam policy", () => {
  it("[P4-MSG-11] detects external links without building a preview", () => {
    expect(hasExternalLink("Lihat https://example.test/kain")).toBe(true)
    expect(hasExternalLink("Lihat www.example.test")).toBe(true)
    expect(hasExternalLink("Tidak ada tautan di sini.")).toBe(false)
  })

  it("[P4-MSG-12] detects repeated bodies and link bursts as spam", () => {
    expect(
      looksLikeSpam([
        "Pesan berulang",
        "Pesan berulang",
        "Pesan berulang",
        "Pesan berulang",
        "Pesan berulang",
      ]),
    ).toBe(true)
    expect(
      looksLikeSpam([
        "Halo",
        "Halo",
        "Halo",
        "Halo",
        "Pesan berbeda",
      ]),
    ).toBe(false)
    expect(
      looksLikeSpam([
        "https://a.test https://b.test https://c.test https://d.test",
      ]),
    ).toBe(true)
  })
})

describe("messaging / retention and reasons", () => {
  it("[P4-MSG-16] the retention cutoff follows the configured days", () => {
    const now = 1_760_000_000_000
    expect(retentionCutoff(now)).toBe(
      now - DEFAULT_RETENTION_DAYS * 86_400_000,
    )
    expect(retentionCutoff(now, 2)).toBe(now - 2 * 86_400_000)
  })

  it("[P0-ACC-61] a break-glass or moderation reason has a minimum length", () => {
    expect(reasonProblem("pendek")).not.toBeNull()
    expect(reasonProblem("  ")).not.toBeNull()
    expect(reasonProblem("Meninjau laporan pengguna")).toBeNull()
  })
})
