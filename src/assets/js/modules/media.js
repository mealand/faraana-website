import { $, $$ } from './utils.js';

/** Click-to-play feature videos, and pausing of ambient videos when off-screen. */
export function initVideos() {
  $$('[data-video]').forEach((wrap) => {
    const video = $('video', wrap);
    const btn = $('.video-feature__play', wrap);
    if (!video || !btn) return;
    btn.addEventListener('click', () => {
      video.controls = true;
      video.play();
      wrap.classList.add('is-playing');
    });
    video.addEventListener('pause', () => {
      if (video.ended) wrap.classList.remove('is-playing');
    });
  });

  // ambient autoplay loops shouldn't burn battery when nobody is looking at them
  const ambient = $$('video[autoplay]');
  if (!ambient.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    });
  });
  ambient.forEach((v) => io.observe(v));
}

/** Filterable gallery + accessible lightbox (keyboard, swipe, focus return). */
export function initGallery() {
  const lightbox = $('.lightbox');
  const galleries = $$('[data-gallery]');
  if (!lightbox || !galleries.length) return;

  const mediaBox = $('.lightbox__media', lightbox);
  const caption = $('.lightbox__caption', lightbox);
  const count = $('.lightbox__count', lightbox);
  let items = [];
  let index = 0;
  let opener = null;

  const fullSrc = (btn) => {
    const source = $('source', btn);
    if (source) {
      const candidates = source.srcset.split(',').map((s) => s.trim().split(' ')[0]);
      return candidates[candidates.length - 1];
    }
    return $('img', btn)?.src;
  };

  const render = () => {
    const btn = items[index];
    mediaBox.innerHTML = '';
    if (btn.dataset.videoSrc) {
      const v = document.createElement('video');
      v.src = btn.dataset.videoSrc;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      mediaBox.appendChild(v);
    } else {
      const img = document.createElement('img');
      img.src = fullSrc(btn);
      img.alt = $('img', btn)?.alt || '';
      mediaBox.appendChild(img);
    }
    caption.textContent = btn.dataset.caption || '';
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  };

  const open = (gallery, btn) => {
    items = $$('.masonry__item:not(.is-hidden)', gallery);
    index = items.indexOf(btn);
    opener = btn;
    render();
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    $('.lightbox__close', lightbox).focus();
  };

  const close = () => {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      lightbox.hidden = true;
      mediaBox.innerHTML = '';
    }, 350);
    opener?.focus();
  };

  const step = (dir) => {
    index = (index + dir + items.length) % items.length;
    render();
  };

  galleries.forEach((gallery) => {
    gallery.addEventListener('click', (e) => {
      const btn = e.target.closest('.masonry__item');
      if (btn) open(gallery, btn);
    });
  });

  $('.lightbox__close', lightbox).addEventListener('click', close);
  $('.lightbox__nav--prev', lightbox).addEventListener('click', () => step(-1));
  $('.lightbox__nav--next', lightbox).addEventListener('click', () => step(1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'Tab') {
      // keep focus inside the dialog
      const focusables = $$('button, video', lightbox);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  let touchX = null;
  lightbox.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    touchX = null;
  });

  // filters (gallery page)
  const filterBar = $('.filters');
  if (!filterBar) return;
  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    const filter = btn.dataset.filter;
    $$('[data-filter]', filterBar).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    $$('.masonry__item').forEach((item) => {
      const show = filter === 'all' || item.dataset.cat.split(' ').includes(filter);
      if (show && item.classList.contains('is-hidden')) {
        item.classList.remove('is-hidden');
        item.classList.add('is-entering');
        requestAnimationFrame(() => requestAnimationFrame(() => item.classList.remove('is-entering')));
      } else if (!show) {
        item.classList.add('is-hidden');
      }
    });
  });
}
