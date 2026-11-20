import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

/**
 * Text that only belongs to a runtime branch. When one of these strings shows
 * up in a prerendered HTML file, a request-time decision was baked into the
 * build. That is how the checkout page shipped "Masuk belum tersambung" to
 * every visitor even though the runtime environment was configured.
 */
export const RUNTIME_ONLY_TEXT = [
  "Masuk belum tersambung",
  "Checkout belum tersambung",
  "Status pesanan belum tersedia",
  "Sistem pesanan belum dikonfigurasi",
  "layanan masuk belum dikonfigurasi",
]

async function walk(directory, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(full, files)
    } else if (entry.isFile()) {
      files.push(full)
    }
  }
  return files
}

export function bakedRuntimeBranches(html, phrases = RUNTIME_ONLY_TEXT) {
  return phrases.filter((phrase) => html.includes(phrase))
}

export async function findBakedRuntimeBranches(
  appDirectory = path.join(".next", "server", "app"),
) {
  const files = (await walk(appDirectory)).filter((file) =>
    file.endsWith(".html"),
  )

  const hits = []
  for (const file of files) {
    const phrases = bakedRuntimeBranches(await readFile(file, "utf8"))
    if (phrases.length > 0) hits.push({ file, phrases })
  }
  return hits
}

async function main() {
  const configured = Boolean(
    process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL,
  )
  if (!configured) {
    console.warn(
      "Prerender guard: no Convex URL at build time, skipping the static output scan.",
    )
    return
  }

  let hits
  try {
    hits = await findBakedRuntimeBranches()
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.warn(
        "Prerender guard: no .next/server/app output found, skipping the scan.",
      )
      return
    }
    throw error
  }

  if (hits.length === 0) {
    console.log(
      "Prerender guard: no runtime-only branch was baked into static output.",
    )
    return
  }

  console.error(
    "Prerender guard failed. These pages are prerendered but contain text that only a request-time render should produce:",
  )
  for (const hit of hits) {
    console.error(`- ${hit.file}`)
    for (const phrase of hit.phrases) console.error(`    "${phrase}"`)
  }
  console.error(
    "Resolve the branch in the browser, or render the route per request with connection().",
  )
  process.exitCode = 1
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
