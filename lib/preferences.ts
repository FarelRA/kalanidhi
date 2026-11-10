export const DATA_SAVER_KEY = "kalanidhi:data-saver"
const DATA_SAVER_EVENT = "kalanidhi:data-saver-change"

export function subscribeDataSaver(callback: () => void) {
  window.addEventListener(DATA_SAVER_EVENT, callback)
  window.addEventListener("storage", callback)

  return () => {
    window.removeEventListener(DATA_SAVER_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export function getDataSaverSnapshot() {
  return window.localStorage.getItem(DATA_SAVER_KEY) === "on"
}

export function getDataSaverServerSnapshot() {
  return false
}

export function setDataSaverPreference(enabled: boolean) {
  window.localStorage.setItem(DATA_SAVER_KEY, enabled ? "on" : "off")
  document.documentElement.dataset.dataSaver = enabled ? "on" : "off"
  window.dispatchEvent(new Event(DATA_SAVER_EVENT))
}
