import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name.startsWith(".next")
    ) {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full, files)
    } else if (entry.isFile()) {
      files.push(full)
    }
  }
  return files
}

async function appSources(): Promise<Array<{ file: string; source: string }>> {
  const files = (await walk(path.join(root, "app"))).filter(
    (file) => file.endsWith(".tsx") || file.endsWith(".ts"),
  )
  return await Promise.all(
    files.map(async (file) => ({
      file,
      source: await readFile(file, "utf8"),
    })),
  )
}

function relative(file: string): string {
  return path.relative(root, file).replaceAll("\\", "/")
}

/** Functions that read cookies, headers, or a request-scoped session. */
const REQUEST_TIME_API =
  /(?:^|[^\w.])(?:headers|cookies|connection|getAuthServer|fetchAuthQuery|fetchMutation)\s*\(/m

/** Config helpers that must never run while a route is being prerendered. */
const BUILD_TIME_CONFIG = /isAuthConfigured|isCommerceConfigured/

describe("static rendering boundary", () => {
  it("keeps request-time auth out of the root layout", async () => {
    const source = await readFile(path.join(root, "app/layout.tsx"), "utf8")
    expect(source).not.toMatch(/getAuthServer|isAuthConfigured/)
    expect(source).not.toMatch(/\bheaders\s*\(|\bcookies\s*\(|\bconnection\s*\(/)
    expect(source).not.toMatch(/initialToken/)
  })

  it("never reads build-time auth or commerce config in an ensureStatic route", async () => {
    const pages = (await appSources()).filter((entry) =>
      entry.file.endsWith("/page.tsx") || entry.file.endsWith("/layout.tsx"),
    )

    for (const { file, source } of pages) {
      if (!/export\s+const\s+ensureStatic\s*=\s*["'](?:navigation|shell|prefetch)["']/.test(source)) {
        continue
      }
      expect(source, `${relative(file)} must not use request-time config`).not.toMatch(
        BUILD_TIME_CONFIG,
      )
      expect(source, `${relative(file)} must not call getAuthServer`).not.toMatch(
        /getAuthServer/,
      )
      expect(source, `${relative(file)} must not call headers`).not.toMatch(
        /\bheaders\s*\(/,
      )
      expect(source, `${relative(file)} must not call cookies`).not.toMatch(
        /\bcookies\s*\(/,
      )
      expect(source, `${relative(file)} must not call connection`).not.toMatch(
        /\bconnection\s*\(/,
      )
    }
  })

  it("keeps every build-time config reader on a request-time route", async () => {
    const pages = (await appSources()).filter(
      (entry) =>
        entry.file.endsWith("/page.tsx") || entry.file.endsWith("/layout.tsx"),
    )

    for (const { file, source } of pages) {
      if (!BUILD_TIME_CONFIG.test(source)) continue
      expect(
        REQUEST_TIME_API.test(source),
        `${relative(file)} reads auth or commerce config without a request-time API. Move the check to a client component or read it after connection().`,
      ).toBe(true)
    }
  })

  it("renders both checkout pages through the client auth gate", async () => {
    const checkoutPages = [
      "app/(site)/pesan/[slug]/page.tsx",
      "app/(site)/pesan/kelas/[slug]/page.tsx",
    ]

    for (const relativeFile of checkoutPages) {
      const source = await readFile(path.join(root, relativeFile), "utf8")
      expect(source, `${relativeFile} must use CheckoutGate`).toContain(
        "<CheckoutGate",
      )
      expect(
        source,
        `${relativeFile} must not bake a server-side auth fallback into a static page`,
      ).not.toContain("Masuk belum tersambung")
      expect(
        source,
        `${relativeFile} must not bake a server-side commerce fallback into a static page`,
      ).not.toContain("Checkout belum tersambung")
      expect(source, `${relativeFile} must not read auth config`).not.toMatch(
        /isAuthConfigured/,
      )
      expect(source, `${relativeFile} must not read commerce config`).not.toMatch(
        /isCommerceConfigured/,
      )
    }
  })

  it("resolves checkout identity in the browser, not during prerender", async () => {
    const gate = await readFile(
      path.join(root, "app/(site)/pesan/checkout-gate.tsx"),
      "utf8",
    )
    expect(gate).toContain('"use client"')
    expect(gate).toContain("useQuery(api.access.getViewer)")
    expect(gate).toContain("router.replace")
    expect(gate).toContain("PUBLIC_ROUTES.signIn")
  })

  it("renders every env-dependent page per request before reading config", async () => {
    const requestTimePages = [
      "app/(auth)/masuk/page.tsx",
      "app/(auth)/daftar/page.tsx",
      "app/(site)/pesanan/[token]/page.tsx",
    ]

    for (const relativeFile of requestTimePages) {
      const source = await readFile(path.join(root, relativeFile), "utf8")
      const connectionAt = source.indexOf("connection()")
      const configAt = source.search(/is(?:Auth|Commerce)Configured\s*\(/)
      expect(
        connectionAt,
        `${relativeFile} must call connection() so the build cannot capture env branches`,
      ).toBeGreaterThanOrEqual(0)
      expect(
        configAt,
        `${relativeFile} must still check its configuration`,
      ).toBeGreaterThanOrEqual(0)
      expect(
        connectionAt,
        `${relativeFile} must call connection() before reading config`,
      ).toBeLessThan(configAt)
    }
  })

  it("runs the prerender guard after every production build", async () => {
    const manifest = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> }
    expect(manifest.scripts.build).toContain("next build")
    expect(
      manifest.scripts.build,
      "npm run build must scan the prerendered output for baked runtime branches",
    ).toContain("scripts/check-prerender.mjs")
    expect(manifest.scripts["check:prerender"]).toBe(
      "node scripts/check-prerender.mjs",
    )
  })
})
