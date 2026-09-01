export const AI_PANEL_OPEN_EVENT = 'baytmiftah:open-ai-panel'

export function openBaytMiftahAIPanel() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AI_PANEL_OPEN_EVENT))
}
