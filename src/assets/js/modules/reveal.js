import { $$, reducedMotion } from './utils.js';
import { splitWords } from './split.js';

/** Scroll-triggered reveals for [data-reveal], [data-stagger] and split headings [data-split]. */
export function initReveal() {
  const reduce = reducedMotion();
  $$('[data-split]').forEach((el) => {
    if (reduce) el.classList.add('is-split');
    else splitWords(el);
  });

  const targets = $$('[data-reveal], [data-stagger], [data-split], .timeline__item');

  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );

  targets.forEach((el) => io.observe(el));

  // safety net: anything already in view after load is revealed even if IO is slow
  const sweep = () =>
    setTimeout(() => {
      targets.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-visible');
      });
    }, 1200);
  if (document.readyState === 'complete') sweep();
  else window.addEventListener('load', sweep, { once: true });
}
