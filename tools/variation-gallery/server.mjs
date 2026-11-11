import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, "../..")
const port = Number(process.env.PORT || 3500)

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" })
  res.end(body)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`)
  const pathname = decodeURIComponent(url.pathname)

  if (pathname === "/" || pathname === "/index.html") {
    return send(res, 200, fs.readFileSync(path.join(here, "index.html")), types[".html"])
  }
  if (pathname === "/styles.css") {
    return send(res, 200, fs.readFileSync(path.join(here, "styles.css")), types[".css"])
  }
  if (pathname === "/app.js") {
    return send(res, 200, fs.readFileSync(path.join(here, "app.js")), types[".js"])
  }
  if (pathname === "/heroes.jpg") {
    return send(res, 200, fs.readFileSync(path.join(repoRoot, "docs/variations/heroes.jpg")), types[".jpg"])
  }
  if (pathname === "/health") {
    return send(res, 200, JSON.stringify({ ok: true, port }), types[".json"])
  }

  return send(res, 404, "Not found")
})

server.listen(port, "0.0.0.0", () => {
  console.log(`Variation gallery: http://localhost:${port}`)
})
