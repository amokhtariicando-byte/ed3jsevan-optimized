# Eyvan Menu — Shared-Host Deployment Guide

How to deploy the Eyvan cafe menu (React frontend + PHP/SQLite backend) on a
cPanel-style Iranian shared host. Host provider and domain are **not decided
yet** — this guide uses placeholders (`<user>`, `<domain>`) and environment
variables everywhere; nothing here hardcodes a host path or a domain.

## 1. What ships where

The golden rule: **PHP app code and the SQLite database live OUTSIDE
`public_html`.** Only the built frontend, the API entry point, and the uploads
directory are web-accessible.

| Repo path | Host path | Notes |
| --- | --- | --- |
| `dist/` (built frontend) | `/home/<user>/public_html/` | `index.html`, `assets/`, `favicon.*`, `robots.txt`, `manifest.*` |
| `public/.htaccess` | `/home/<user>/public_html/.htaccess` | Copied into `dist/` by the build; see §3 |
| `backend/public/api/index.php` | `/home/<user>/public_html/api/index.php` | Front controller — the ONLY PHP file under `public_html` |
| `backend/public/api/.htaccess` | `/home/<user>/public_html/api/.htaccess` | Rewrites `/api/*` → `index.php`; see §3 |
| `backend/src/*.php` | `/home/<user>/eyvan/app/src/` | bootstrap, Database, Auth, MenuStore, Api, Uploads, seed.php |
| `backend/seed/seed.json` | `/home/<user>/eyvan/app/seed/seed.json` | Initial menu data (seeded on first run) |
| `backend/setup.php` | `/home/<user>/eyvan/app/setup.php` | CLI first-run password setup (§4); never web-accessible |
| `backend/tests/smoke.sh` | `/home/<user>/eyvan/app/tests/smoke.sh` | Optional; run from SSH after deploy (§7) |
| `backend/DEPLOY.md` | — | This file; do not upload it |
| (created at runtime) | `/home/<user>/eyvan/data/eyvan.db` | SQLite database (§5) |
| (created at runtime) | `/home/<user>/public_html/uploads/` | Uploaded photos (§6) |

The built frontend is a static Vite build: run the build locally (or in CI)
and upload the `dist/` contents — never upload the `src/` tree or
`node_modules/` to the host.

## 2. Requirements

- **PHP 8.1+** (8.2/8.3 fine)
- Extensions: `pdo_sqlite`, `fileinfo`, `json` (core in PHP 8.1+),
  `mbstring`
- **Apache or LiteSpeed with `mod_rewrite`** (cPanel hosts normally have this)
- No Composer packages, no database server, no Node.js on the host

## 3. Configuration

The backend reads its configuration from environment variables, with a
`config.php` file next to `index.php` as an alternative:

| Variable | Default | Meaning |
| --- | --- | --- |
| `EYVAN_APP_DIR` | (derived from `index.php` location) | Path to the app dir (`/home/<user>/eyvan/app/`) |
| `EYVAN_DB_PATH` | `<app>/data/eyvan.db` | SQLite database file |
| `EYVAN_UPLOADS_DIR` | `<public_html>/uploads/` | Where uploaded photos are stored |
| `EYVAN_UPLOADS_URL` | `/uploads/` | Public URL prefix for uploaded photos |

On cPanel, set env vars in one of these ways (whichever the host supports):
`.htaccess` `SetEnv` lines in `public_html/api/.htaccess`, the cPanel
"SetEnv"/PHP-variables UI, or a `config.php` next to `index.php` that defines
the same values. If the host gives no way to set env vars, `config.php` is
the fallback — it is a plain PHP file, so it works everywhere.

### `.htaccess` notes

- **`public/.htaccess`** (already in the repo, ships inside `dist/`): sends
  `Cache-Control: no-store` for `.php` responses, so API responses are never
  cached by the browser or a CDN. It also carries the long-lived cache headers
  for hashed frontend assets.
- **`backend/public/api/.htaccess`**: rewrites every `/api/*` request to
  `index.php` and also sends `no-store`, so no API response is ever cached.
- **HTTPS redirect**: `public/.htaccess` contains an HTTPS redirect — enable
  it **only after SSL is live** on the domain, or the site will redirect-loop
  before the certificate exists.
- **Uploads**: uploaded files get unique hashed filenames (never the original
  user-supplied name), so re-uploads can't collide or overwrite each other.

## 4. First-run setup (admin password)

There is **no hardcoded password anywhere**. The admin password is set once,
at first run, by either of these two methods:

**Option A — CLI (preferred when SSH/terminal is available):**

```bash
cd /home/<user>/eyvan/app
php setup.php --password '...'
```

**Option B — one-time HTTP endpoint (no SSH needed):**

```bash
curl -X POST https://<domain>/api/admin/setup \
  -H 'Content-Type: application/json' \
  -d '{"password": "..."}'
```

`POST /api/admin/setup` works **only while no admin password exists** — once
one is set it answers `403`. Minimum password length is **6 characters**; the
endpoint and the CLI both reject shorter ones.

After setup, log in at `https://<domain>/#/admin` with that password. The
password can be changed later from the panel (Settings →
`POST /api/admin/change-password`).

## 5. SQLite permissions and backups

- The data directory (`/home/<user>/eyvan/data/`) must be **writable by the
  web-server user** (on cPanel this is normally the account user itself, so
  default ownership works).
- The database file should be **`640` or `600`** — readable/writable by the
  owner, never world-writable.
- The database must **never live inside `public_html`** — a `.db` file under
  the web root can be downloaded by anyone who guesses its URL.
- **Backup** = copy `eyvan.db` (e.g. `cp eyvan.db eyvan.db.2026-11-21.bak`).
  The panel also offers a JSON export (`GET /api/admin/backup`) and a raw
  database download (`GET /api/admin/backup-db`) from Settings.
- **Restore** = replace `eyvan.db` with the backup copy while the site is
  quiet (no admin edits in flight), then confirm the menu loads. Keep at
  least one backup copy outside the `data/` directory.

## 6. Uploads directory

- Location: `/home/<user>/public_html/uploads/` (served at `/uploads/`).
- Must be **writable by the web-server user**; create it during deploy if it
  doesn't exist (`mkdir -p public_html/uploads`).
- Files are stored under unique hashed names (§3), so uploads never collide
  with each other or with frontend assets.
- The uploads directory is part of the site's data: include it in backups
  alongside `eyvan.db`.

## 7. Smoke checklist (after deployment)

Run through these on the live domain before handing the site over:

1. **Public menu loads** — `https://<domain>/` shows the menu (the published
   state; `GET /api/menu` returns the seeded menu JSON).
2. **Admin login** — `https://<domain>/#/admin` accepts the setup password;
   a wrong password is rejected (401) without an error page.
3. **Edit + publish** — change one item's price in the panel, confirm the
   public menu is unchanged, press Publish, confirm the public menu shows the
   new price; then revert the price and publish again.
4. **Upload** — upload a photo for an item (image slot) and confirm it renders
   on the menu card and in the item sheet.
5. **Backup** — download the JSON export from Settings and confirm it parses
   (`GET /api/admin/backup`); optionally download the raw DB
   (`GET /api/admin/backup-db`).
6. **No caching of the API** — after a publish, a hard refresh shows the new
   data immediately (the `no-store` headers in §3 guarantee this).
7. **(Optional, SSH)** — run `bash /home/<user>/eyvan/app/tests/smoke.sh`
   against the live domain for the automated version of this checklist.
