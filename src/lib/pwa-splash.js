/** Remove the inline HTML splash (shown before React hydrates on installed PWAs). */
export function dismissHtmlSplash() {
  const el = document.getElementById('pwa-splash')
  if (el) {
    el.classList.add('pwa-splash--hide')
    window.setTimeout(() => el.remove(), 320)
  }
}
