const variations = [
  {
    n: "01",
    slug: "malam-canting",
    name: "Malam Canting",
    direction: "Gelap sinematik, full-bleed, cahaya lilin, film reel loop.",
    note: "Malam di workshop: lima babak, satu lampu, dan reel yang kembali ke awal.",
    port: 3401,
    commit: "d480c3d",
    colors: ["#0B1118", "#101A27", "#E8A45C", "#A3B0BF"],
  },
  {
    n: "02",
    slug: "tenun-berjalan",
    name: "Tenun Berjalan",
    direction: "Kertas katun, tenun/arsip, warp 10 bidang, weft merah.",
    note: "Katalog sebagai lungsin; loop sebagai benang merah yang kembali.",
    port: 3402,
    commit: "0ced74f",
    colors: ["#F2ECDD", "#17150F", "#16365C", "#A8321E"],
  },
  {
    n: "03",
    slug: "buku-indigo",
    name: "Buku Indigo",
    direction: "Ledger indigo, loop seal, register 10 bidang.",
    note: "Buku kerja rumah pewarna: aturan tipis, register, dan segel lingkaran.",
    port: 3403,
    commit: "adee083",
    colors: ["#F7F6F1", "#181E2C", "#3A4E8C", "#A03622"],
  },
  {
    n: "04",
    slug: "bangku-kayu",
    name: "Bangku Kayu",
    direction: "Hangat taktil, teak/copper, meja kerja, circular bench.",
    note: "Pengetahuan berpindah dari tangan ke tangan di bangku yang sama.",
    port: 3404,
    commit: "1463044",
    colors: ["#20130D", "#3A2418", "#A9552C", "#F4EAD8"],
  },
  {
    n: "05",
    slug: "buku-kerja",
    name: "Buku Kerja",
    direction: "Working ledger, koreksi pensil merah, ring loop.",
    note: "Bukti belajar terlihat: koreksi, stempel, nomor seri, dan margin merah.",
    port: 3405,
    commit: "0083c79",
    colors: ["#F8F7F2", "#1A2433", "#27396B", "#A83325"],
  },
  {
    n: "06",
    slug: "panggung",
    name: "Panggung",
    direction: "Teater hitam/plum, spotlight, playbill, lima babak.",
    note: "Satu malam pertunjukan; lulusan kembali ke panggung sebagai pengajar.",
    port: 3406,
    commit: "a55fbb6",
    colors: ["#0B0809", "#2A0F1A", "#7E1B2A", "#F4E8CF"],
  },
  {
    n: "07",
    slug: "tenun-terbuka",
    name: "Tenun Terbuka",
    direction: "Chalk paper, tenun flat, selvedge, madder thread.",
    note: "Setiap jalur adalah lungsin; setiap tugas adalah lintasan pakan.",
    port: 3407,
    commit: "5b6a283",
    colors: ["#F2F3EA", "#17201C", "#243E8F", "#A83327"],
  },
  {
    n: "08",
    slug: "poster-nusantara",
    name: "Poster Nusantara",
    direction: "Poster modernis, cobalt/red/mustard, tipografi besar.",
    note: "Pengumuman yang ditempel di dinding: loop, pengajar, dan karya.",
    port: 3408,
    commit: "ffc33ad",
    colors: ["#F4F1E7", "#12110F", "#163FA8", "#D3261B"],
  },
  {
    n: "09",
    slug: "lembar-koreksi",
    name: "Lembar Koreksi",
    direction: "Lembar tugas terkoreksi, koreksi merah sebagai bahasa visual.",
    note: "Yang dibayar bukan video, tapi tanda pengajar di atas karya.",
    port: 3409,
    commit: "d8a7794",
    colors: ["#E8EBE2", "#16201C", "#B3391F", "#2F4670"],
  },
  {
    n: "10",
    slug: "rempah",
    name: "Rempah",
    direction: "Apotek botanikal, cream/forest/turmeric, lingkar tanam.",
    note: "Praktik budaya sebagai bahan: ada sumber, musim, dan penjaga.",
    port: 3410,
    commit: "debac65",
    colors: ["#F5EEDF", "#173A2B", "#B45F3C", "#B8C4A7"],
  },
]

const host = window.location.hostname === "0.0.0.0" || !window.location.hostname
  ? "localhost"
  : window.location.hostname

const list = document.querySelector("#variation-list")
const iframe = document.querySelector("#preview")
const viewport = document.querySelector("#viewport")
const addressText = document.querySelector("#address-text")
const metaNumber = document.querySelector("#meta-number")
const metaName = document.querySelector("#meta-name")
const metaDirection = document.querySelector("#meta-direction")
const metaSwatches = document.querySelector("#meta-swatches")
const metaCommit = document.querySelector("#meta-commit")
const metaPort = document.querySelector("#meta-port")
const openButton = document.querySelector("#open-button")
const reloadButton = document.querySelector("#reload-button")
const overview = document.querySelector("#overview")
const overviewGrid = document.querySelector("#overview-grid")
const overviewButton = document.querySelector("#overview-button")
const overviewClose = document.querySelector("#overview-close")

let current = 0
let lastFocused = null

function urlFor(v) {
  return `http://${host}:${v.port}/`
}

function renderList() {
  list.innerHTML = ""
  variations.forEach((v, index) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "variation"
    button.setAttribute("aria-current", index === current ? "true" : "false")
    button.innerHTML = `
      <span class="variation-index">${v.n}</span>
      <span>
        <span class="variation-name">${v.name}</span>
        <span class="variation-note">${v.note}</span>
        <span class="variation-dots" aria-hidden="true">
          ${v.colors.slice(0, 4).map((c) => `<i style="background:${c}"></i>`).join("")}
        </span>
      </span>
    `
    button.addEventListener("click", () => select(index))
    list.appendChild(button)
  })
}

function renderMeta() {
  const v = variations[current]
  metaNumber.textContent = v.n
  metaName.textContent = v.name
  metaDirection.textContent = v.direction
  metaCommit.textContent = `commit ${v.commit}`
  metaPort.textContent = `port ${v.port}`
  metaSwatches.innerHTML = v.colors.map((c) => `<i style="background:${c}"></i>`).join("")
  addressText.textContent = `localhost:${v.port}`
  openButton.href = urlFor(v)
  openButton.setAttribute("aria-label", `Buka ${v.name} di tab baru`)
  iframe.title = `Pratinjau ${v.name}, variasi ${v.n} KalaNidhi Digital`
}

function select(index, options = {}) {
  current = Math.max(0, Math.min(variations.length - 1, index))
  const v = variations[current]
  iframe.src = urlFor(v)
  renderMeta()
  ;[...list.children].forEach((el, i) => {
    el.classList.toggle("is-active", i === current)
    el.setAttribute("aria-current", i === current ? "true" : "false")
  })
  if (options.updateHash !== false) {
    history.replaceState(null, "", `#${v.n}`)
  }
  if (options.scroll !== false) {
    const active = list.children[current]
    if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" })
  }
}

function setWidth(width) {
  viewport.dataset.width = width
  document.querySelectorAll("[data-width]").forEach((button) => {
    if (button.closest(".segmented")) {
      button.classList.toggle("is-active", button.dataset.width === width)
    }
  })
}

function openOverview() {
  lastFocused = document.activeElement
  overview.hidden = false
  document.body.style.overflow = "hidden"
  overviewClose.focus()
}

function closeOverview() {
  overview.hidden = true
  document.body.style.overflow = ""
  if (lastFocused) lastFocused.focus()
}

function buildOverview() {
  overviewGrid.innerHTML = ""
  variations.forEach((v, index) => {
    const card = document.createElement("button")
    card.type = "button"
    card.className = "overview-card"
    card.innerHTML = `
      <small>${v.n} · port ${v.port}</small>
      <strong>${v.name}</strong>
      <span>${v.direction}</span>
    `
    card.addEventListener("click", () => {
      select(index)
      closeOverview()
    })
    overviewGrid.appendChild(card)
  })
}

document.querySelectorAll(".segmented button").forEach((button) => {
  button.addEventListener("click", () => setWidth(button.dataset.width))
})

reloadButton.addEventListener("click", () => {
  iframe.src = iframe.src
})

overviewButton.addEventListener("click", openOverview)
overviewClose.addEventListener("click", closeOverview)
overview.addEventListener("click", (event) => {
  if (event.target === overview) closeOverview()
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overview.hidden) {
    closeOverview()
    return
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
  if (event.key === "[" || event.key === "ArrowLeft") {
    event.preventDefault()
    select(current - 1)
  } else if (event.key === "]" || event.key === "ArrowRight") {
    event.preventDefault()
    select(current + 1)
  } else if (/^[0-9]$/.test(event.key)) {
    const index = event.key === "0" ? 9 : Number(event.key) - 1
    select(index)
  }
})

const fromHash = variations.findIndex((v) => `#${v.n}` === window.location.hash)
renderList()
buildOverview()
select(fromHash >= 0 ? fromHash : 0, { updateHash: false })
