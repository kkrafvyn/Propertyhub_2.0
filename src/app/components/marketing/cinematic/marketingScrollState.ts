export type ScenePointer = { x: number; y: number };

type InvalidateFn = () => void;
type ChapterListener = () => void;

/** Mutable scroll/pointer state for cinematic marketing — avoids React re-renders every scroll tick. */
export const marketingScrollState = {
  progress: 0,
  pointer: { x: 0, y: 0 } as ScenePointer,
  _invalidate: null as InvalidateFn | null,
  _chapterListeners: new Set<ChapterListener>(),

  setProgress(progress: number) {
    const next = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    if (Math.abs(next - this.progress) < 0.00005) return;
    this.progress = next;
    this._invalidate?.();
    this._notifyChaptersThrottled();
  },

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
    this._invalidate?.();
  },

  registerInvalidate(fn: InvalidateFn | null) {
    this._invalidate = fn;
  },

  subscribeChapters(listener: ChapterListener) {
    this._chapterListeners.add(listener);
    return () => this._chapterListeners.delete(listener);
  },

  _chapterRaf: 0 as number | 0,
  _notifyChaptersThrottled() {
    if (this._chapterRaf) return;
    this._chapterRaf = requestAnimationFrame(() => {
      this._chapterRaf = 0;
      this._chapterListeners.forEach((l) => l());
    });
  },
};
