export function syncSavedIds(_ids: string[]) {
  return Promise.resolve({ ok: true });
}

export function getSavedIds() {
  try {
    const raw = localStorage.getItem("baytmiftah.saved");
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
