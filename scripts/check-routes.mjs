#!/usr/bin/env node
/**
 * Direct-load smoke test for the built site.
 *
 * Next can render a route differently on a client navigation than on a fresh
 * request or a reload. This starts the production server, asks for every public
 * route twice, and fails on a 5xx or on the global error boundary. It also
 * asserts that the retired work URLs are gone instead of redirected.
 *
 * Usage:
 *
 *   npm run check:routes
 */
import { spawn } from "node:child_process"
import path from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const port = Number(process.env.ROUTE_CHECK_PORT ?? 3417)
const base = `http://127.0.0.1:${port}`

/** Routes that are not in the sitemap but still get direct traffic. */
export const EXTRA_ROUTES = [
  "/masuk",
  "/daftar",
  "/ruang",
  "/pesan/kelas/batik-bambu",
  "/verifikasi/KN-9147",
  "/verifikasi/kn-9147",
]

/** Old work links must return 404, not a redirect to a replacement. */
export const RETIRED_ROUTES = [
  "/karya/selendang-canting-nitik",
  "/karya/box-tisu-batik-bambu",
  "/pesan/selendang-canting-nitik",
  "/pesan/box-tisu-batik-bambu",
  "/kelas/box-tisu-batik-bambu",
]

const ERROR_TEXT = /Halaman ini belum bisa dibuka|Application error|__next_error__/

export function routePaths(sitemapXml, extra = EXTRA_ROUTES) {
  const paths = new Set(extra)
  for (const match of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try {
      paths.add(new URL(match[1]).pathname)
    } catch {
      // A malformed sitemap entry is reported by the request check itself.
    }
  }
  return Array.from(paths).sort()
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${base}/robots.txt`)
      if (response.status < 500) return
    } catch {
      // The server is still starting.
    }
    await delay(500)
  }
  throw new Error(`Server did not become ready on ${base}.`)
}

async function request(pathname) {
  const response = await fetch(`${base}${pathname}`, {
    redirect: "manual",
    headers: { accept: "text/html" },
  })
  const body = await response.text()
  return { status: response.status, body }
}

async function main() {
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next")
  const server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  let serverLog = ""
  server.stdout.on("data", (chunk) => {
    serverLog += chunk.toString()
  })
  server.stderr.on("data", (chunk) => {
    serverLog += chunk.toString()
  })

  const failures = []
  let routeCount = 0
  try {
    await waitForServer()

    const sitemapResponse = await fetch(`${base}/sitemap.xml`)
    const sitemap = await sitemapResponse.text()
    const routes = routePaths(sitemap)
    routeCount = routes.length

    for (const pathname of routes) {
      const first = await request(pathname)
      const second = await request(pathname)

      if (first.status >= 500) {
        failures.push(`${pathname} returned ${first.status} on direct load`)
      }
      if (second.status >= 500) {
        failures.push(`${pathname} returned ${second.status} on reload`)
      }
      if (first.status !== second.status) {
        failures.push(
          `${pathname} changed from ${first.status} to ${second.status} on reload`,
        )
      }
      if (ERROR_TEXT.test(first.body) || ERROR_TEXT.test(second.body)) {
        failures.push(`${pathname} rendered the global error boundary`)
      }
    }

    for (const pathname of RETIRED_ROUTES) {
      const response = await fetch(`${base}${pathname}`, { redirect: "manual" })
      if (response.status !== 404) {
        failures.push(`${pathname} must be 404, got ${response.status}`)
      }
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error))
  } finally {
    server.kill("SIGTERM")
    await delay(500)
  }

  if (failures.length > 0) {
    console.error("Route smoke check failed.")
    for (const failure of failures) console.error(`- ${failure}`)
    if (serverLog.trim()) console.error(serverLog.trim().split("\n").slice(-20).join("\n"))
    process.exitCode = 1
    return
  }

  console.log(
    `Route smoke check passed. ${routeCount} public routes loaded directly and again on reload.`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
