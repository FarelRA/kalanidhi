import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import {
  as,
  auditActions,
  createDb,
  errorCode,
  seedWorld,
  sendText,
  setSetting,
  storeBlob,
} from "./helpers"

async function directConversation(t: ReturnType<typeof createDb>) {
  const world = await seedWorld(t)
  const conversationId = await as(
    t,
    "auth-student",
  ).mutation(api.messaging.startDirect, {
    peerUserId: world.teacherId,
  })
  return { world, conversationId }
}

async function upload(
  t: ReturnType<typeof createDb>,
  authUserId: string,
  conversationId: Id<"conversations">,
  contents: string | Uint8Array,
  mimeType: string,
) {
  const intent = await as(t, authUserId).mutation(
    api.messaging.createUploadUrl,
    { conversationId },
  )
  const storageId = await storeBlob(t, contents, mimeType)
  return { storageId, uploadId: intent.uploadId, intent }
}

describe("voice notes and uploads", () => {
  it("[P4-MSG-06] text, voice, image, file, and system messages keep their kind", async () => {
    const t = createDb()
    const { world, conversationId } = await directConversation(t)

    const textId = await sendText(
      t,
      "auth-student",
      conversationId,
      "Pesan teks.",
    )
    const voice = await upload(
      t,
      "auth-student",
      conversationId,
      "fake-webm-audio",
      "audio/webm",
    )
    const voiceId = await as(t, "auth-student").mutation(
      api.messaging.sendMessage,
      {
        conversationId,
        kind: "voice",
        attachment: {
          storageId: voice.storageId,
          uploadId: voice.uploadId,
          filename: "catatan.webm",
          mimeType: "audio/webm;codecs=opus",
          size: "fake-webm-audio".length,
          durationMs: 12_000,
          waveform: [0.1, 0.4, 0.9, 0.3],
        },
      },
    )
    const image = await upload(
      t,
      "auth-student",
      conversationId,
      "fake-png",
      "image/png",
    )
    const imageId = await as(t, "auth-student").mutation(
      api.messaging.sendMessage,
      {
        conversationId,
        kind: "image",
        attachment: {
          storageId: image.storageId,
          uploadId: image.uploadId,
          filename: "kain.png",
          mimeType: "image/png",
          size: "fake-png".length,
          width: 640,
          height: 480,
        },
      },
    )
    const file = await upload(
      t,
      "auth-student",
      conversationId,
      "fake-pdf",
      "application/pdf",
    )
    const fileId = await as(t, "auth-student").mutation(
      api.messaging.sendMessage,
      {
        conversationId,
        kind: "file",
        attachment: {
          storageId: file.storageId,
          uploadId: file.uploadId,
          filename: "lembar.pdf",
          mimeType: "application/pdf",
          size: "fake-pdf".length,
        },
      },
    )
    const systemId = await t.mutation(
      api.messaging.ensureSystemConversation,
      {
        userId: world.studentId,
        title: "Pengingat",
        body: "Sesi kohort besok.",
      },
    )

    const view = await as(t, "auth-student").query(
      api.messaging.listMessages,
      { conversationId },
    )
    const kinds = Object.fromEntries(
      view.messages.map((message) => [message.id, message.kind]),
    )
    expect(kinds[textId]).toBe("text")
    expect(kinds[voiceId]).toBe("voice")
    expect(kinds[imageId]).toBe("image")
    expect(kinds[fileId]).toBe("file")

    const systemView = await as(t, "auth-student").query(
      api.messaging.listMessages,
      { conversationId: systemId },
    )
    expect(systemView.messages[0]?.kind).toBe("system")
  })

  it("[P4-MSG-30] the audio MIME allowlist is enforced", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)

    for (const [filename, mimeType] of [
      ["catatan.webm", "audio/webm"],
      ["catatan.ogg", "audio/ogg"],
      ["catatan.m4a", "audio/mp4"],
      ["catatan.mp3", "audio/mpeg"],
    ] as const) {
      const asset = await upload(
        t,
        "auth-student",
        conversationId,
        "audio-bytes",
        mimeType,
      )
      const id = await as(t, "auth-student").mutation(
        api.messaging.sendMessage,
        {
          conversationId,
          kind: "voice",
          attachment: {
            storageId: asset.storageId,
            uploadId: asset.uploadId,
            filename,
            mimeType,
            size: "audio-bytes".length,
            durationMs: 5_000,
          },
        },
      )
      expect(id).toBeTruthy()
    }

    const badAsset = await upload(
      t,
      "auth-student",
      conversationId,
      "wma-bytes",
      "audio/x-ms-wma",
    )
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "voice",
          attachment: {
            storageId: badAsset.storageId,
            uploadId: badAsset.uploadId,
            filename: "catatan.wma",
            mimeType: "audio/x-ms-wma",
            size: "wma-bytes".length,
            durationMs: 5_000,
          },
        }),
      ),
    ).toBe("INVALID_ARGUMENT")
  })

  it("[P4-MSG-31] the 10 minute and 25 MB limits are enforced server-side", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)

    const durationAsset = await upload(
      t,
      "auth-student",
      conversationId,
      "audio-bytes",
      "audio/webm",
    )
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "voice",
          attachment: {
            storageId: durationAsset.storageId,
            uploadId: durationAsset.uploadId,
            filename: "panjang.webm",
            mimeType: "audio/webm",
            size: "audio-bytes".length,
            durationMs: 10 * 60_000 + 1,
          },
        }),
      ),
    ).toBe("INVALID_ARGUMENT")

    const bigBytes = new Uint8Array(25 * 1024 * 1024 + 1)
    const sizeAsset = await upload(
      t,
      "auth-student",
      conversationId,
      bigBytes,
      "audio/webm",
    )
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "voice",
          attachment: {
            storageId: sizeAsset.storageId,
            uploadId: sizeAsset.uploadId,
            filename: "besar.webm",
            mimeType: "audio/webm",
            size: bigBytes.length,
            durationMs: 10_000,
          },
        }),
      ),
    ).toBe("INVALID_ARGUMENT")
  })

  it("[P4-MSG-32] an upload intent is bound to the sender, conversation, and expiry", async () => {
    const t = createDb()
    const { world, conversationId } = await directConversation(t)

    const intent = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.createUploadUrl, { conversationId })
    expect(intent.uploadUrl).toContain("storage")
    expect(intent.uploadId).toBeTruthy()

    const storageId = await storeBlob(t, "audio-bytes", "audio/webm")
    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "voice",
          attachment: {
            storageId,
            uploadId: intent.uploadId,
            filename: "catatan.webm",
            mimeType: "audio/webm",
            size: "audio-bytes".length,
            durationMs: 5_000,
          },
        }),
      ),
    ).toBe("INVALID_ARGUMENT")

    await t.run(async (ctx) =>
      ctx.db.patch(intent.uploadId, { expiresAt: Date.now() - 1 }),
    )
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "voice",
          attachment: {
            storageId,
            uploadId: intent.uploadId,
            filename: "catatan.webm",
            mimeType: "audio/webm",
            size: "audio-bytes".length,
            durationMs: 5_000,
          },
        }),
      ),
    ).toBe("INVALID_ARGUMENT")

    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(
          api.messaging.createUploadUrl,
          { conversationId },
        ),
      ),
    ).toBe("NOT_FOUND")
    void world
  })

  it("[P4-MSG-33] the message stores asset id, duration, waveform, MIME, and size", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)
    const asset = await upload(
      t,
      "auth-student",
      conversationId,
      "audio-bytes",
      "audio/webm",
    )
    const messageId = await as(t, "auth-student").mutation(
      api.messaging.sendMessage,
      {
        conversationId,
        kind: "voice",
        attachment: {
          storageId: asset.storageId,
          uploadId: asset.uploadId,
          filename: "catatan.webm",
          mimeType: "audio/webm",
          size: "audio-bytes".length,
          durationMs: 42_000,
          waveform: [0.2, 0.5, 1],
          transcript: "Kain soga direndam semalam.",
        },
      },
    )

    const stored = await t.run(async (ctx) => ctx.db.get(messageId))
    expect(stored?.assetId).toBeTruthy()
    expect(stored?.durationMs).toBe(42_000)
    expect(stored?.waveform).toEqual([0.2, 0.5, 1])

    const view = await as(t, "auth-teacher").query(
      api.messaging.listMessages,
      { conversationId },
    )
    const message = view.messages.find((item) => item.id === messageId)
    expect(message?.asset?.mimeType).toBe("audio/webm")
    expect(message?.asset?.size).toBe("audio-bytes".length)
    expect(message?.asset?.durationMs).toBe(42_000)
    expect(message?.asset?.transcript).toContain("Kain soga")
  })

  it("[P4-MSG-34] inline playback metadata resolves a storage URL", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)
    const asset = await upload(
      t,
      "auth-student",
      conversationId,
      "audio-bytes",
      "audio/webm",
    )
    const messageId = await as(t, "auth-student").mutation(
      api.messaging.sendMessage,
      {
        conversationId,
        kind: "voice",
        attachment: {
          storageId: asset.storageId,
          uploadId: asset.uploadId,
          filename: "catatan.webm",
          mimeType: "audio/webm",
          size: "audio-bytes".length,
          durationMs: 7_000,
        },
      },
    )
    const view = await as(t, "auth-teacher").query(
      api.messaging.listMessages,
      { conversationId },
    )
    const message = view.messages.find((item) => item.id === messageId)
    expect(message?.asset?.url).toMatch(/^https:\/\//)
  })

  it("[P4-MSG-35] transcript is optional, stored, and searchable", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)
    const withTranscript = await upload(
      t,
      "auth-student",
      conversationId,
      "audio-one",
      "audio/webm",
    )
    await as(t, "auth-student").mutation(api.messaging.sendMessage, {
      conversationId,
      kind: "voice",
      attachment: {
        storageId: withTranscript.storageId,
        uploadId: withTranscript.uploadId,
        filename: "satu.webm",
        mimeType: "audio/webm",
        size: "audio-one".length,
        durationMs: 3_000,
        transcript: "Motif parang rusak",
      },
    })
    const withoutTranscript = await upload(
      t,
      "auth-student",
      conversationId,
      "audio-two",
      "audio/webm",
    )
    await as(t, "auth-student").mutation(api.messaging.sendMessage, {
      conversationId,
      kind: "voice",
      attachment: {
        storageId: withoutTranscript.storageId,
        uploadId: withoutTranscript.uploadId,
        filename: "dua.webm",
        mimeType: "audio/webm",
        size: "audio-two".length,
        durationMs: 4_000,
      },
    })

    const search = await as(t, "auth-teacher").query(
      api.messaging.searchMessages,
      { conversationId, term: "parang" },
    )
    expect(search).toHaveLength(1)
    expect(search[0]?.asset?.transcript).toContain("parang")
  })

  it("[P4-MSG-36] wrong MIME, extension mismatch, and malformed uploads are rejected", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)

    const mismatch = await upload(
      t,
      "auth-student",
      conversationId,
      "audio-bytes",
      "audio/webm",
    )
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "voice",
          attachment: {
            storageId: mismatch.storageId,
            uploadId: mismatch.uploadId,
            filename: "catatan.txt",
            mimeType: "audio/webm",
            size: "audio-bytes".length,
            durationMs: 5_000,
          },
        }),
      ),
    ).toBe("INVALID_ARGUMENT")

    const textAsset = await upload(
      t,
      "auth-student",
      conversationId,
      "audio-bytes",
      "audio/webm",
    )
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "text",
          body: "Teks dengan lampiran.",
          attachment: {
            storageId: textAsset.storageId,
            uploadId: textAsset.uploadId,
            filename: "catatan.webm",
            mimeType: "audio/webm",
            size: "audio-bytes".length,
            durationMs: 5_000,
          },
        }),
      ),
    ).toBe("INVALID_ARGUMENT")

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "voice",
        }),
      ),
    ).toBe("INVALID_ARGUMENT")

    const ghostUpload = await as(
      t,
      "auth-student",
    ).mutation(api.messaging.createUploadUrl, { conversationId })
    const ghostStorage = await storeBlob(t, "ghost", "audio/webm")
    await t.run(async (ctx) => ctx.storage.delete(ghostStorage))
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.messaging.sendMessage, {
          conversationId,
          kind: "voice",
          attachment: {
            storageId: ghostStorage,
            uploadId: ghostUpload.uploadId,
            filename: "catatan.webm",
            mimeType: "audio/webm",
            size: 10,
            durationMs: 5_000,
          },
        }),
      ),
    ).toBe("INVALID_ARGUMENT")
  })

  it("[P4-MSG-37] repeated upload attempts hit the upload rate limit", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)
    await setSetting(t, "messaging.uploadLimitPerMinute", 2)

    await as(t, "auth-student").mutation(
      api.messaging.createUploadUrl,
      { conversationId },
    )
    await as(t, "auth-student").mutation(
      api.messaging.createUploadUrl,
      { conversationId },
    )
    expect(
      await errorCode(
        as(t, "auth-student").mutation(
          api.messaging.createUploadUrl,
          { conversationId },
        ),
      ),
    ).toBe("RATE_LIMITED")
  })

  it("[P4-MSG-38] a soft-deleted voice note keeps no accessible media", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)
    const asset = await upload(
      t,
      "auth-student",
      conversationId,
      "audio-bytes",
      "audio/webm",
    )
    const messageId = await as(t, "auth-student").mutation(
      api.messaging.sendMessage,
      {
        conversationId,
        kind: "voice",
        attachment: {
          storageId: asset.storageId,
          uploadId: asset.uploadId,
          filename: "catatan.webm",
          mimeType: "audio/webm",
          size: "audio-bytes".length,
          durationMs: 5_000,
        },
      },
    )
    await as(t, "auth-student").mutation(api.messaging.removeMessage, {
      messageId,
    })

    const view = await as(t, "auth-teacher").query(
      api.messaging.listMessages,
      { conversationId },
    )
    const message = view.messages.find((item) => item.id === messageId)
    expect(message?.asset).toBeNull()
    expect(message?.body).toBeNull()
    expect(
      await errorCode(
        as(t, "auth-outsider").query(api.messaging.listMessages, {
          conversationId,
        }),
      ),
    ).toBe("NOT_FOUND")
  })

  it("[P4-MSG-39] moderation removal keeps the flag reference without exposing media", async () => {
    const t = createDb()
    const { conversationId } = await directConversation(t)
    const asset = await upload(
      t,
      "auth-teacher",
      conversationId,
      "audio-bytes",
      "audio/webm",
    )
    const messageId = await as(t, "auth-teacher").mutation(
      api.messaging.sendMessage,
      {
        conversationId,
        kind: "voice",
        attachment: {
          storageId: asset.storageId,
          uploadId: asset.uploadId,
          filename: "catatan.webm",
          mimeType: "audio/webm",
          size: "audio-bytes".length,
          durationMs: 6_000,
        },
      },
    )
    const flagId = await as(t, "auth-student").mutation(
      api.messaging.reportMessage,
      { messageId, reason: "Lampiran suara tidak diminta" },
    )
    await as(t, "auth-admin").mutation(
      api.messaging.resolveFlag,
      {
        flagId,
        decision: "resolved",
        resolution: "Lampiran dihapus dari percakapan.",
        removeMessage: true,
      },
    )

    const view = await as(t, "auth-teacher").query(
      api.messaging.listMessages,
      { conversationId },
    )
    expect(view.messages.find((item) => item.id === messageId)?.asset).toBeNull()

    const flag = await t.run(async (ctx) => ctx.db.get(flagId))
    expect(flag?.messageId).toBe(messageId)
    expect(flag?.status).toBe("resolved")
    expect(await auditActions(t)).toContain("messaging.moderation.remove")
  })
})
