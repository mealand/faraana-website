import { $, $$, onScrollFrame, reducedMotion, storage } from './utils.js';

/** Preloader: plays once per browser session, then gets out of the way. */
export function initPreloader() {
  const el = $('.preloader');
  if (!el) return Promise.resolve();
  if (storage.get('fng-visited') || reducedMotion()) {
    el.classList.add('is-skipped');
    return Promise.resolve();
  }
  storage.set('fng-visited', '1');
  return new Promise((resolve) => {
    const finish = () => {
      el.classList.add('is-done');
      setTimeout(() => {
        el.classList.add('is-skipped');
      }, 1000);
      resolve();
    };
    const minTime = new Promise((r) => setTimeout(r, 1500));
    const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
    // never hold the page hostage on a slow network
    Promise.race([Promise.all([minTime, loaded]), new Promise((r) => setTimeout(r, 3200))]).then(finish);
  });
}

/** Sticky header that hides on scroll-down and returns on scroll-up; mobile menu. */
export function initHeader() {
  const header = $('[data-header]');
  if (!header) return;
  let lastY = window.scrollY;

  onScrollFrame(() => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = header.classList.contains('menu-open');
    if (!menuOpen) header.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;
  });

  const toggle = $('.menu-toggle', header);
  const menu = $('#mobile-menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      $('a', menu)?.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => {
        if (!menu.classList.contains('is-open')) menu.hidden = true;
      }, 800);
    }
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => e.matches && setOpen(false));
}

/** Reading progress bar + back-to-top ring share one --scroll variable. */
export function initScrollProgress() {
  const root = document.documentElement;
  const toTop = $('.to-top');
  onScrollFrame(() => {
    const max = root.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    root.style.setProperty('--scroll', p.toFixed(4));
    toTop?.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
  });
  toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }));
}

/** Curtain wipe between internal pages. */
export function initPageTransitions() {
  const curtain = $('.page-curtain');
  if (!curtain || reducedMotion()) return;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return; // same-page anchor
    e.preventDefault();
    curtain.classList.add('is-leaving');
    setTimeout(() => (location.href = url.href), 480);
  });

  // restore when navigating back via the bfcache
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) curtain.classList.remove('is-leaving');
  });
}

/** Rotating phrase in the home hero. */
export function initRotator() {
  $$('[data-rotator]').forEach((el) => {
    const words = el.dataset.rotator.split('|');
    if (words.length < 2 || reducedMotion()) return;
    let i = 0;
    setInterval(() => {
      el.classList.add('is-out');
      setTimeout(() => {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove('is-out');
      }, 400);
    }, 2600);
  });
}
