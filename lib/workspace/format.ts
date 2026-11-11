export function formatWorkspaceDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

export function formatWorkspaceDateTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatWorkspaceTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatCompactIDR(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp${(value / 1_000_000_000).toFixed(1).replace(".", ",")} M`
  }
  if (value >= 1_000_000) {
    return `Rp${(value / 1_000_000).toFixed(1).replace(".", ",")} jt`
  }
  if (value >= 1_000) {
    return `Rp${Math.round(value / 1_000)} rb`
  }
  return `Rp${value}`
}

export function percent(value: number): string {
  return `${value}%`
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
}
