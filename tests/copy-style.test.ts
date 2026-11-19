import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * Guards the copy contract: no em dash, no en dash, no semicolon, and no
 * colon in user-visible prose. String literals that are clearly code (URLs,
 * import paths, MIME types, CSS utilities, single-token keys) are skipped.
 */

const ROOT = path.resolve(__dirname, "..")

const EXTRA_FILES = [
  "convex/seed/content/data.ts",
  "convex/seed/content/identities.ts",
  "convex/seed/domains/curriculum.ts",
  "convex/seed/domains/messaging.ts",
  "convex/seed/domains/ops.ts",
  "convex/seed/domains/growth.ts",
  "convex/seed/domains/learning.ts",
  "convex/seed/domains/content.ts",
  "convex/seed/domains/commerce.ts",
  "convex/seed/domains/governance.ts",
  "convex/seed/domains/people.ts",
  "convex/seed/domains/settings.ts",
  "scripts/upload-images.mjs",
]

function walk(dir: string): string[] {
  const full = path.join(ROOT, dir)
  return readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(relative)
    return /\.(ts|tsx|mjs)$/.test(entry.name) ? [relative] : []
  })
}

function sourceFiles(): string[] {
  return [...walk("app"), ...walk("components"), ...walk("lib"), ...walk("convex"), ...EXTRA_FILES]
}

const CSS_UTILITY =
  /(^|\s)(sm|md|lg|xl|2xl|hover|focus|focus-visible|dark|group|peer|data-|aria-|has-|in-data-|max-lg|max-sm):/

function isCodey(text: string): boolean {
  const value = text.trim()
  if (!value) return true
  if (/^[;:,.!?()\-–—]+$/.test(value)) return true
  if (/^&[a-z]+;$/.test(value)) return true
  if (/^Mozilla\/|AppleWebKit/.test(value)) return true
  if (value.startsWith("(") && /(min|max)-width|\d(vw|px)/.test(value)) return true
  if (/^(https?:\/\/|mailto:|tel:|data:|blob:|node:)/.test(value)) return true
  if (/^[./@#][\w./@-]*$/.test(value)) return true
  if (/^[\w.-]+\/[\w.+-]+(;|$)/.test(value)) return true
  if (!value.includes(" ") && /^[a-z0-9_:./@-]+$/i.test(value)) return true
  if (CSS_UTILITY.test(value)) return true
  if (
    value.includes(" ") &&
    /\b(text-|bg-|border-|rounded-|font-|px-|py-|pt-|pb-|pl-|pr-|mt-|mb-|ml-|mr-|gap-|grid-cols-|items-|justify-|flex-|size-|w-|h-)/.test(
      value,
    )
  ) {
    return true
  }
  if (/^[A-Z][A-Z0-9_]+:/.test(value)) return true
  return false
}

function violationsIn(text: string): string[] {
  const found: string[] = []
  if (/[—–]/.test(text)) found.push("em atau en dash")
  if (text.includes(";")) found.push("titik koma")
  if (/\p{L}[^:]{0,60}:\s/u.test(text) || /\p{L}:$/u.test(text)) {
    found.push("titik dua")
  }
  return found
}

function lineOf(source: ts.SourceFile, position: number): number {
  return source.getLineAndCharacterOfPosition(position).line + 1
}

function scan(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(path.join(ROOT, file), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const problems: string[] = []

  function record(text: string, position: number) {
    for (const kind of violationsIn(text)) {
      problems.push(`${file}:${lineOf(source, position)} ${kind}: ${text.trim()}`)
    }
  }

  function visit(node: ts.Node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isCodey(node.text)) record(node.text, node.getStart(source))
    } else if (ts.isTemplateExpression(node)) {
      if (!isCodey(node.head.text)) record(node.head.text, node.head.getStart(source))
      for (const span of node.templateSpans) {
        if (!isCodey(span.literal.text)) {
          record(span.literal.text, span.literal.getStart(source))
        }
      }
    } else if (ts.isJsxText(node)) {
      if (!isCodey(node.text)) record(node.text, node.getStart(source))
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return problems
}

describe("copy style", () => {
  it("keeps user-visible copy free of em dash, en dash, semicolon, and colon", () => {
    const problems = sourceFiles().flatMap(scan)
    expect(problems).toEqual([])
  })
})
