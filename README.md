# faraananagaji.com

Personal profile website of **Fara’a Nana Gaji**: humanitarian, psychologist, youth mentor and entrepreneur.

A fast, animation-rich static site with no frameworks and no runtime dependencies. It is built with a tiny Node script and deploys to any web host or to GitHub Pages.

## Pages

| Page | File | Content |
| --- | --- | --- |
| Home | `src/pages/index.html` | Video hero, focus areas, horizontal "From the field" scroller, highlights, mission |
| About | `src/pages/about.html` | Story, values, career timeline, expertise, life beyond work |
| Community Impact | `src/pages/impact.html` | Approach, dialogue, assessments, savings groups, agriculture, health, video |
| GBV & Therapy | `src/pages/advocacy.html` | GBV response, psychosocial therapy (RWVL), policy & advocacy (GS-26) |
| Mentorship | `src/pages/mentorship.html` | Vision-board programme, mentoring framework, ECWA youth leadership |
| Ventures | `src/pages/ventures.html` | Farana Empire, Nana Ginger Paste, wellness coaching |
| Gallery | `src/pages/gallery.html` | Filterable masonry gallery with lightbox (driven by `src/data/gallery.json`) |
| Contact | `src/pages/contact.html` | Partnership enquiry form |

## Project structure

```
faraana-website/
├── .github/workflows/deploy.yml   CI: build + deploy (web host via FTP and/or GitHub Pages)
├── scripts/
│   ├── build.mjs                  static site builder (zero dependencies)
│   ├── serve.mjs                  local preview server
│   └── process-media.py           categorise, enhance & compress raw photos/videos
├── src/
│   ├── pages/                     one file per page (front-matter + body)
│   ├── partials/                  layout, header, footer, call-to-action
│   ├── assets/
│   │   ├── css/                   tokens → base → layout → components → animations → pages
│   │   ├── js/                    main.js + modules/ (ES modules, no libraries)
│   │   ├── images/                optimised WebP/JPEG by topic: portraits, community, advocacy, mentorship, professional
│   │   ├── video/                 compressed MP4 + poster frames
│   │   └── icons/
│   ├── data/                      media.json (generated) and gallery.json
│   └── static/                    .htaccess, robots.txt, web manifest → copied to site root
└── dist/                          build output (git-ignored)
```

## Commands

Requires Node.js 18+.

```bash
npm run build      # build into dist/
npm run preview    # build, then serve on http://localhost:4173
```

### Adding or replacing photos and videos

1. Drop the raw files into the `../media` folder.
2. Add each one to the `IMAGES` or `VIDEOS` map in `scripts/process-media.py` with a category and slug, e.g. `"new.jpg": ("community/water-project", False)`.
3. Run `pip install pillow imageio-ffmpeg` (first time only), then `npm run media`.
4. Use it in a page with `<x-img src="community/water-project" alt="Describe the photo" />`, or add it to `src/data/gallery.json`.

The build turns every `<x-img>` into a responsive `<picture>` element. That gives WebP at 480/960/1440px, a JPEG fallback, a blur-up placeholder, lazy loading and explicit dimensions (no layout shift).

## Features

- **Motion:** preloader, word-by-word heading reveals, clip-path image unveils, parallax, pinned horizontal scroller, scroll-scrubbed manifesto, animated timeline, counters, marquee tickers, magnetic buttons, 3D tilt cards, custom cursor, page-transition curtain.
- **Robust:** every animation is progressive enhancement. Content stays visible without JavaScript, and motion is switched off for `prefers-reduced-motion`.
- **Accessible:** semantic landmarks, skip link, keyboard-operable menu and lightbox (focus-trapped, Esc to close), alt text, visible focus states.
- **SEO:** unique titles and descriptions, canonical URLs, Open Graph/Twitter cards, `Person` structured data, sitemap.xml, robots.txt.
- **Performance:** about 120 KB average image size, videos 0.4–3 MB with `preload="none"` where not autoplaying, minified CSS, cache-busted assets, and `.htaccess` gzip + caching.

## Contact form

The form works immediately by opening the visitor's email app, addressed to `hello@faraananagaji.com`. To receive messages directly instead:

1. Create a free form at [formspree.io](https://formspree.io) using the email address you want messages sent to.
2. Paste the endpoint into `data-endpoint="…"` in `src/pages/contact.html`.
3. Update `data-mailto` if you use a different email address.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md).
