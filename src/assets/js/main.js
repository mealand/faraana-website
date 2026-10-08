/**
 * Entry point. Each module is self-contained and safe to call on any page:
 * it simply does nothing when its elements aren't present.
 */
import { initHeader, initPageTransitions, initPreloader, initRotator, initScrollProgress } from './modules/chrome.js';
import { initReveal } from './modules/reveal.js';
import {
  initCounters,
  initCursor,
  initHorizontalScroll,
  initMagnetic,
  initParallax,
  initScrubText,
  initTilt,
  initTimeline,
} from './modules/motion.js';
import { initGallery, initVideos } from './modules/media.js';
import { initContactForm } from './modules/form.js';

window.__fngReady = true;

const safely = (fn) => {
  try {
    fn();
  } catch (err) {
    console.error(err);
  }
};

[
  initHeader,
  initScrollProgress,
  initPageTransitions,
  initHorizontalScroll,
  initParallax,
  initScrubText,
  initTimeline,
  initCounters,
  initCursor,
  initMagnetic,
  initTilt,
  initRotator,
  initVideos,
  initGallery,
  initContactForm,
].forEach(safely);

// reveal once the preloader has lifted so the first animations are actually seen
initPreloader().then(() => safely(initReveal));
