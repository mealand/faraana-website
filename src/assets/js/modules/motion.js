import { $, $$, clamp, finePointer, lerp, onScrollFrame, reducedMotion } from './utils.js';
import { splitWords } from './split.js';

/** Parallax: data-parallax="0.2" moves the element at 20% of its offset from the viewport centre. */
export function initParallax() {
  const items = $$('[data-parallax]');
  if (!items.length || reducedMotion()) return;
  onScrollFrame(() => {
    const vh = window.innerHeight;
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const factor = parseFloat(el.dataset.parallax) || 0.15;
      const offset = (r.top + r.height / 2 - vh / 2) * -factor;
      el.style.setProperty('--py', `${offset.toFixed(1)}px`);
    });
  });
}

/** Count-up numbers. */
export function initCounters() {
  const items = $$('[data-count]');
  if (!items.length) return;
  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reducedMotion()) {
      el.textContent = target + suffix;
      return;
    }
    const dur = 1800;
    const start = performance.now();
    const tick = (now) => {
      const t = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      }),
    { threshold: 0.6 }
  );
  items.forEach((el) => io.observe(el));
}

/** Pinned section whose track slides horizontally as you scroll vertically. */
export function initHorizontalScroll() {
  $$('[data-hscroll]').forEach((section) => {
    const track = $('.hscroll__track', section);
    const sticky = $('.hscroll__sticky', section);
    if (!track || !sticky) return;

    const desktop = window.matchMedia('(min-width: 768px)');
    let distance = 0;

    const measure = () => {
      if (!desktop.matches || reducedMotion()) {
        section.classList.add('hscroll--static');
        section.style.height = '';
        track.style.transform = '';
        distance = 0;
        return;
      }
      section.classList.remove('hscroll--static');
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = `${sticky.offsetHeight + distance}px`;
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    desktop.addEventListener('change', measure);

    onScrollFrame(() => {
      if (!distance) return;
      const r = section.getBoundingClientRect();
      const progress = clamp(-r.top / (r.height - window.innerHeight), 0, 1);
      track.style.transform = `translate3d(${(-progress * distance).toFixed(1)}px,0,0)`;
    });
  });
}

/** Words light up one by one as the paragraph scrolls through the viewport. */
export function initScrubText() {
  $$('[data-scrub-text]').forEach((el) => {
    const count = splitWords(el, { wordClass: 'scrub-word', inner: false });
    const words = $$('.scrub-word', el);
    if (reducedMotion()) {
      words.forEach((w) => w.classList.add('is-lit'));
      return;
    }
    onScrollFrame(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const lit = Math.round(progress * count);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    });
  });
}

/** Timeline line grows with scroll. */
export function initTimeline() {
  $$('[data-timeline]').forEach((tl) => {
    onScrollFrame(() => {
      const r = tl.getBoundingClientRect();
      const p = clamp((window.innerHeight * 0.6 - r.top) / r.height, 0, 1);
      tl.style.setProperty('--progress', p.toFixed(3));
    });
  });
}

/** Custom cursor with contextual labels (desktop only). */
export function initCursor() {
  const cursor = $('.cursor');
  if (!cursor || !finePointer() || reducedMotion()) return;
  document.documentElement.classList.add('has-cursor');
  const label = $('.cursor__label', cursor);
  let x = -100;
  let y = -100;
  let cx = x;
  let cy = y;

  window.addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
    cursor.classList.remove('is-hidden');
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));

  const loop = () => {
    cx = lerp(cx, x, 0.22);
    cy = lerp(cy, y, 0.22);
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();

  document.addEventListener('mouseover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button, input, select, textarea, label');
    cursor.classList.toggle('is-label', !!labelled);
    cursor.classList.toggle('is-hover', !labelled && !!interactive);
    label.textContent = labelled ? labelled.dataset.cursor : '';
  });
}

/** Buttons that lean towards the pointer. */
export function initMagnetic() {
  if (!finePointer() || reducedMotion()) return;
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.3}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

/** Subtle 3D tilt for cards. */
export function initTilt() {
  if (!finePointer() || reducedMotion()) return;
  $$('[data-tilt]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-4px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}
