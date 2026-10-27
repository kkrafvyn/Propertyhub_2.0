import { act } from "react";
﻿import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingBackgroundCarousel } from "./MarketingBackgroundCarousel";

const active = (container: HTMLElement) => container.querySelector('.is-active img')?.getAttribute('src');
async function load(container: HTMLElement, index: number) {
  await act(async () => { fireEvent.load(container.querySelectorAll('img')[index]); });
}
async function loadAll(container: HTMLElement) { for (let i=0; i<5; i++) await load(container,i); }
function mount() { return render(<MarketingBackgroundCarousel><h1 id="marketing-hero-heading">Every property</h1><a href="/signup">Get Started</a></MarketingBackgroundCarousel>); }

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('hero background carousel', () => {
  it('prioritizes the first photograph and loads later images sequentially', async () => {
    const {container} = mount();
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')).toHaveAttribute('fetchpriority','high');
    expect(active(container)).toContain('residences');
    await load(container,0);
    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(container.querySelectorAll('img')[1]).toHaveAttribute('fetchpriority','low');
  });
  it('rotates every seven seconds, pauses for focus and the pause control, and resumes', async () => {
    const {container} = mount(); await loadAll(container);
    act(() => vi.advanceTimersByTime(7000)); expect(active(container)).toContain('interior');
    fireEvent.focus(screen.getByRole('link')); act(() => vi.advanceTimersByTime(14000)); expect(active(container)).toContain('interior');
    fireEvent.blur(screen.getByRole('link'), {relatedTarget: document.body});
    fireEvent.click(screen.getByRole('button', {name:'Pause background slideshow'}));
    act(() => vi.advanceTimersByTime(14000)); expect(active(container)).toContain('interior');
    fireEvent.click(screen.getByRole('button', {name:'Play background slideshow'}));
    act(() => vi.advanceTimersByTime(7000)); expect(active(container)).toContain('community');
  });
  it('stops in a hidden browser tab and starts a fresh interval when visible', async () => {
    const {container} = mount(); await loadAll(container);
    Object.defineProperty(document,'hidden',{configurable:true,value:true}); fireEvent(document,new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(21000)); expect(active(container)).toContain('residences');
    Object.defineProperty(document,'hidden',{configurable:true,value:false}); fireEvent(document,new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(7000)); expect(active(container)).toContain('interior');
  });
  it('respects reduced motion while allowing explicit slide selection', async () => {
    vi.spyOn(window,'matchMedia').mockReturnValue({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as MediaQueryList);
    const {container} = mount(); await loadAll(container);
    act(() => vi.advanceTimersByTime(28000)); expect(active(container)).toContain('residences');
    expect(screen.getByRole('button',{name:/Automatic rotation disabled/})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Next background image'})); expect(active(container)).toContain('interior');
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Background: Apartment interiors');
    expect(container.querySelector('img')).toHaveAttribute('alt','');
  });
  it('holds the current photo during loading and skips failed assets', async () => {
    const {container} = mount(); await load(container,0);
    fireEvent.click(screen.getByRole('button',{name:'Next background image'}));
    expect(active(container)).toContain('residences');
    fireEvent.error(container.querySelectorAll('img')[1]);
    expect(screen.getByRole('button',{name:/Show background 2/})).toBeDisabled();
    expect(active(container)).toContain('residences');
    fireEvent.click(screen.getByRole('button',{name:'Next background image'})); await load(container,1);
    expect(active(container)).toContain('community');
  });
  it('recovers from a failed first image without moving hero content', async () => {
    const {container} = mount(); fireEvent.error(container.querySelector('img')!); await load(container,0);
    expect(active(container)).toContain('interior');
    expect(screen.getByRole('heading')).toBeVisible(); expect(screen.getByRole('link')).toBeVisible();
  });
});
