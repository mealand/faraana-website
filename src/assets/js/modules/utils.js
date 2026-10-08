export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Run `fn` at most once per animation frame. */
export function rafThrottle(fn) {
  let queued = false;
  return (...args) => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...args);
    });
  };
}

/** One shared scroll/resize loop so modules don't each attach their own listeners. */
const scrollSubscribers = new Set();
const onScroll = rafThrottle(() => scrollSubscribers.forEach((fn) => fn()));
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });

export function onScrollFrame(fn) {
  scrollSubscribers.add(fn);
  fn();
  return () => scrollSubscribers.delete(fn);
}

/** Storage can throw in private mode or with blocked site data. */
export const storage = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};
