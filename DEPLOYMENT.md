# Deploying faraananagaji.com

The site is plain static files. Whatever is in `dist/` after `npm run build` is the complete website. There are two ways to get it onto your domain. **Option A** is recommended because you already pay for hosting.

---

## Option A: your existing web host (cPanel, Hostinger, Namecheap, Truehost, Whogohost, etc.)

### A1. One-time manual upload (quickest)

1. On your computer, run `npm run build` in this folder.
2. Log in to your hosting control panel and open **File Manager**.
3. Open `public_html` (the folder your domain points to). Delete or back up any placeholder `index.html` or `default.php` file.
4. Upload **the contents of** `dist/`, not the `dist` folder itself. Tip: zip the contents, upload the zip, then use **Extract**.
5. Turn on **SSL** for the domain. In cPanel this is under **SSL/TLS Status** → *Run AutoSSL*. On Hostinger it is under **SSL** → *Install*.
6. Visit https://faraananagaji.com.

`.htaccess` is a hidden file. In File Manager, enable *Settings → Show hidden files* to confirm it uploaded. It forces HTTPS, enables compression and caching, and serves the custom 404 page.

### A2. Automatic deploys from GitHub (recommended for later updates)

Every push to `main` rebuilds the site and uploads it to your host.

1. In your hosting panel, create an **FTP account** (cPanel: *FTP Accounts*) whose directory is `public_html`. Note the **server/host**, **username** and **password**.
2. On GitHub, open the repository, then go to **Settings → Secrets and variables → Actions**:
   - **Secrets** tab → *New repository secret*:
     - `FTP_SERVER`: e.g. `ftp.faraananagaji.com`
     - `FTP_USERNAME`
     - `FTP_PASSWORD`
   - **Variables** tab → *New repository variable*:
     - `DEPLOY_FTP` = `true`
     - `FTP_SERVER_DIR` = `public_html/`. Skip this if your FTP account already opens inside `public_html`; in that case set it to `./`.
3. Go to **Actions → Build & deploy → Run workflow**, or simply push a change.

If the upload fails with a TLS/SSL error, your host may not support FTPS. Change `protocol: ftps` to `protocol: ftp` in `.github/workflows/deploy.yml`.

---

## Option B: GitHub Pages (free hosting; you only use your registrar for DNS)

1. On GitHub, open the repository and go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add `DEPLOY_PAGES` = `true`.
3. Run the workflow (**Actions → Build & deploy → Run workflow**).
4. **Settings → Pages → Custom domain**: enter `faraananagaji.com` and save.
5. At your domain registrar's DNS settings:
   - Delete existing `A`/`AAAA` records for `@`.
   - Add four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Add a `CNAME` record: `www` → `<your-github-username>.github.io`
6. Wait for DNS to propagate (minutes to a few hours), then tick **Enforce HTTPS** in Settings → Pages.

---

## After going live

- Submit `https://faraananagaji.com/sitemap.xml` in [Google Search Console](https://search.google.com/search-console).
- Share the homepage link. The preview card uses `assets/images/social/og-card.jpg`.
- Create the `hello@faraananagaji.com` mailbox in your hosting panel (cPanel → *Email Accounts*), or change the address in `src/pages/contact.html`.
