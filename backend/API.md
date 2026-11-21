# Eyvan Menu — Backend API

Plain PHP 8.1+ + SQLite, no framework, no Composer dependencies. Implements
the `AdminApi` contract from `src/admin/types.ts` (implemented in the browser
by `MockAdminApi` in `src/admin/api.ts`), so the admin views work unchanged
against this backend once the HTTP client lands. Deployment is covered in
`DEPLOY.md`.

**Prices are stored in full تومان.** The frontend divides by 1000 for
display — the backend never does that conversion.

**No ordering, no payment.** This API only manages the menu content.

## Layout

```
backend/
  API.md                      this file
  DEPLOY.md                   shared-host deployment guide
  public/api/index.php        front controller (deployed to public_html/api/)
  public/api/.htaccess        rewrite /api/* → index.php; Cache-Control: no-store
  src/bootstrap.php           config resolution + requires
  src/Database.php            PDO, schema creation, seed loading
  src/Auth.php                password_hash/password_verify, token sessions
  src/MenuStore.php           draft/published snapshot CRUD
  src/Api.php                 route dispatch + JSON in/out + error handling
  src/Uploads.php             photo upload handling
  src/seed.php                seed loader — reads backend/seed/seed.json
  seed/seed.json              initial MenuState (draft == published on first run)
  setup.php                   CLI first-run password setup
  tests/smoke.sh              curl smoke test against a `php -S` instance
```

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `EYVAN_APP_DIR` | derived from `index.php` location | Path to the `backend/` dir |
| `EYVAN_DB_PATH` | `<app>/data/eyvan.db` | SQLite database file |
| `EYVAN_UPLOADS_DIR` | `<repo>/public/uploads` in dev; `<app>/../public_html/uploads` on a host; else `<app>/data/uploads` | Where uploaded photos are stored |
| `EYVAN_UPLOADS_URL` | `/uploads/` | Public URL prefix for uploaded photos |

Resolution order for each setting: deploy-time `config.php` → PHP constant
of the same name → environment variable → default above.

`config.php` lives next to `index.php` on the host (deploy-time, **not in the
repo**) and may either return an array or define constants — both forms work:

```php
<?php
// Form A: return an array (short keys or EYVAN_* keys).
return [
  'app_dir'     => '/home/<user>/eyvan/app',
  'db_path'     => '/home/<user>/eyvan/data/eyvan.db',
  'uploads_dir' => '/home/<user>/public_html/uploads',
  'uploads_url' => '/uploads/',
];

// Form B: define constants.
// define('EYVAN_APP_DIR', '/home/<user>/eyvan/app');
// define('EYVAN_DB_PATH', '/home/<user>/eyvan/data/eyvan.db');
// define('EYVAN_UPLOADS_DIR', '/home/<user>/public_html/uploads');
// define('EYVAN_UPLOADS_URL', '/uploads/');
```

## Auth

- **One admin password.** There is no hardcoded password anywhere. It is set
  once, at first run, via `POST /api/admin/setup` or `php backend/setup.php
  --password '...'` (both refuse when a password already exists).
- **Login** (`POST /api/admin/login`) verifies with `password_verify` and, on
  success, issues a bearer token: `bin2hex(random_bytes(32))`, stored as its
  SHA-256 hash with a **12-hour expiry**.
- Every `/admin/*` route except `login` and `setup` requires
  `Authorization: Bearer <token>`. A missing, unknown, or expired token gets
  **401** `unauthorized` — the frontend treats 401 as "session expired" and
  sends the admin back to login.
- **Change password** (`POST /api/admin/change-password`) mirrors the mock
  rule: an empty current password or a new password shorter than 6 characters
  is rejected. A wrong current password is **400**, never 401 (401 would log
  the admin out). Existing sessions stay valid after a password change.
- Passwords are hashed with `password_hash` (bcrypt); tokens are stored
  hashed, never in cleartext.

## Conventions

- **Base URL:** `/api` (the frontend's `RealAdminApi` defaults to it).
- **Same-origin, no CORS.** The admin panel and the API are served from the
  same host.
- **JSON in, JSON out.** Request bodies are JSON (`Content-Type:
  application/json`), except `POST /api/admin/upload` (multipart). Responses
  are `application/json; charset=utf-8`.
- **Errors** share one shape, with Persian messages mirroring the mock's
  wording where it has one:

  ```json
  { "error": { "code": "not_found", "message": "آیتم پیدا نشد." } }
  ```

  | Status | Code | Meaning |
  | --- | --- | --- |
  | 400 | `validation_error` | Missing/invalid fields, invalid JSON |
  | 400 | `wrong_password` | Current password is wrong (change-password) |
  | 401 | `unauthorized` | Missing/invalid/expired token |
  | 401 | `invalid_password` | Wrong password (login; body is `{ok:false, error}`) |
  | 403 | `setup_already_done` | Setup called after a password exists |
  | 404 | `not_found` | Unknown route, or PATCH target missing |
  | 409 | `conflict` | Category still has items |
  | 413 | `payload_too_large` | Upload over 5 MB |
  | 415 | `unsupported_media_type` | Upload is not WebP/PNG/JPEG |
  | 422 | `validation_error` / `password_too_short` | Password under 6 characters |
  | 500 | `server_error` | Internal error (details go to the PHP error log) |

- **Caching: API responses are never cached.** Every response carries
  `Cache-Control: no-store` from the PHP code itself, and `public/.htaccess`
  also sends `no-store` for all `.php` responses — the API entry point is a
  `.php` file, so production responses are no-store twice over.
- **IDs** are strings. Server-generated ids are `item-<16 hex>` and
  `cat-<16 hex>`. Ids are immutable: an `id` key in a PATCH body is ignored.

## Data shapes

Copied from `src/admin/types.ts` / `src/data/menuData.ts`. `?` = optional
(the key is omitted when unset, exactly like the mock's `JSON.stringify`).

```ts
type BackdropTone = 'navy' | 'midnight' | 'olive' | 'bronze' | 'plum';

interface AdminItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price?: number;            // single fixed price, full تومان
  priceBlend50?: number;     // 50/50 blend price, full تومان
  priceArabica100?: number;  // 100% Arabica price, full تومان
  supportsSyrup?: boolean;
  supportsMilkTemp?: boolean;
  highlight?: string;
  isHot?: boolean;
  image: string;             // overhead photo (rotary table)
  frontImage: string;        // front photo (simple menu, drawer)
  cutoutImage: string;       // transparent cutout (3D standing view)
  vesselType: 'tall' | 'cup';
  prefersFrontView?: boolean;
  plateAngle?: number;
  backdropTone: BackdropTone;
  available: boolean;        // false = hidden (ناموجود)
  sortOrder: number;         // 0-based order inside its category
}

interface AdminCategory {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  comingSoon?: boolean;
  comingSoonDescription?: string;
  defaultTone: BackdropTone;
  isHotCategory?: boolean;
  sortOrder: number;         // 0-based order in the category list
}

interface Syrup { id: string; name: string; price: number; }  // price: full تومان

type FeaturedPick = string[];  // item ids, max 3, display order

interface CafeInfoEditable {
  brandName: string; brandSubtitle: string; tagline: string;
  instagramHandle: string; instagramUrl: string; hours: string;
  milkTempNote: string; paymentNote: string; address: string;
  coordinatesLabel: string;
}

interface SeoMeta { title: string; description: string; }

interface PublishState { hasDraft: boolean; lastPublishedAt: string | null; }

interface MenuState {
  categories: AdminCategory[];
  items: AdminItem[];
  syrups: Syrup[];
  cafeInfo: CafeInfoEditable;
  featured: FeaturedPick;
  seo: SeoMeta;
}
```

## Endpoints

Auth = `Authorization: Bearer <token>` unless noted. All `/admin/*` routes
below require it.

### Public menu

#### `GET /api/menu` — public, no auth
The **PUBLISHED** menu state (what customers see). Response: `MenuState`.
`Cache-Control: no-store`.

### Auth

#### `POST /api/admin/setup` — no auth, first-run only
Request: `{ "password": "..." }` (min 6 characters).
Response 200: `{ "ok": true }`.
Fails with **403** `setup_already_done` when an admin password already
exists; **400** when the password is missing/empty; **422** when it is
shorter than 6 characters. (Extra endpoint, not in `AdminApi` — the CLI
equivalent is `php backend/setup.php --password '...'`).

#### `POST /api/admin/login` — no auth
Request: `{ "password": "..." }`.
Response 200: `{ "ok": true, "token": "<64 hex chars>" }`.
Response 401: `{ "ok": false, "error": { "code": "invalid_password", "message": "رمز عبور اشتباه است." } }`.

#### `POST /api/admin/change-password`
Request: `{ "current": "...", "next": "..." }`.
Response 200: `{ "ok": true }`.
**400** `wrong_password` when the current password is wrong or empty;
**422** `password_too_short` when the new password is shorter than 6
characters. (Deliberately never 401: the frontend treats 401 as a dead
session.)

### Menu (draft)

#### `GET /api/admin/menu`
The **DRAFT** menu state (edits land here). Response: `MenuState`.

#### `PATCH /api/admin/items/:id`
Request: a partial `AdminItem` (any subset of fields; `id` is ignored).
Response 200: the updated `AdminItem`. **404** `not_found` (`آیتم پیدا نشد.`)
when the id does not exist.

#### `POST /api/admin/items`
Request: `NewItemInput` — `categoryId` + `name` required, everything else
optional. Response **201**: the created `AdminItem` with a server-generated
id. Defaults mirror the mock's `createItem` exactly (see § Mock parity).

#### `DELETE /api/admin/items/:id`
Response **204** (no body). Also removes the id from `featured`, mirroring
the mock. Idempotent: deleting a missing id still returns 204.

#### `POST /api/admin/items/reorder`
Request: `{ "categoryId": "...", "orderedIds": ["...", "..."] }`.
Response 200: `{ "ok": true }`. Items in the category that are not listed
keep their current `sortOrder`.

#### `PATCH /api/admin/categories/:id`
Request: a partial `AdminCategory` (`id` ignored). Response 200: the updated
`AdminCategory`. **404** `not_found` (`دسته پیدا نشد.`) when missing.

#### `POST /api/admin/categories`
Request: `NewCategoryInput` — `name` + `shortName` required. Response
**201**: the created `AdminCategory` with a server-generated id.

#### `DELETE /api/admin/categories/:id`
Response **204** (no body). **409** `conflict`
(`این دسته آیتم دارد؛ اول آیتم‌هایش را جابه‌جا یا حذف کنید.`) when the
category still has items. Idempotent for a missing id (204).

#### `POST /api/admin/categories/reorder`
Request: `{ "orderedIds": ["...", "..."] }`. Response 200: `{ "ok": true }`.
Categories not listed keep their current `sortOrder`.

#### `PUT /api/admin/syrups`
Request: `Syrup[]` — replaces the whole list. Response 200: the stored
`Syrup[]`. Each syrup needs string `id` + `name` (400 otherwise).

#### `PUT /api/admin/featured`
Request: `string[]` (item ids). Response 200: the stored `FeaturedPick`.
Server applies the mock rule: keep the **first 3** ids, and only ids of
items that exist.

#### `PATCH /api/admin/cafe-info`
Request: a partial `CafeInfoEditable`. Response 200: the updated
`CafeInfoEditable`.

#### `PUT /api/admin/seo`
Request: `{ "title": "...", "description": "..." }` (both required).
Response 200: the stored `SeoMeta`.

### Publish

#### `GET /api/admin/publish-state`
Response 200: `PublishState` — `hasDraft` is true when the draft JSON
differs from the published JSON; `lastPublishedAt` is an ISO timestamp or
`null` (never published).

#### `POST /api/admin/publish`
Copies draft → published in one transaction and stamps `lastPublishedAt`
to ISO now. Response 200: `PublishState` (`hasDraft: false`).

#### `POST /api/admin/discard-draft`
Restores the draft from published. Response 200: the restored `MenuState`.

### Backup

#### `GET /api/admin/backup`
Response 200, `Content-Type: application/json` — the JSON backup object
(the TS client reads it as text, mirroring the mock's `exportBackup`):

```json
{
  "version": 1,
  "exportedAt": "2026-11-21T19:30:00.000Z",
  "draft": { "...MenuState..." },
  "published": { "...MenuState..." },
  "lastPublishedAt": "2026-11-21T19:30:00.000Z"
}
```

#### `GET /api/admin/backup-db` — extra, not in `AdminApi`
Downloads the raw SQLite file (`Content-Type: application/x-sqlite3`,
`Content-Disposition: attachment; filename="eyvan-backup-YYYYMMDD-HHMMSS.db"`).
The copy is produced with `VACUUM INTO`, so it is transactionally
consistent even while the admin panel is editing (falls back to a plain
file copy on SQLite versions without `VACUUM INTO`).

### Uploads

#### `POST /api/admin/upload`
Multipart form: `file` (the photo) + `slot` (`image` | `frontImage` |
`cutoutImage`). Response **201**: `{ "url": "/uploads/<unique-name>.webp" }`.

Rules:

- MIME must be `image/webp`, `image/png`, or `image/jpeg`, checked with
  `finfo` on the actual bytes (415 otherwise).
- Max **5 MB** (413 otherwise).
- The file is stored under a **unique filename** — `sha256(content)` +
  timestamp + random suffix + MIME-derived extension — never the
  user-supplied name, so re-uploads cannot collide or overwrite.
- The returned URL is `EYVAN_UPLOADS_URL` + filename.

> **Cutouts must be uploaded pre-cut with a transparent background
> (PNG/WebP). Background removal is NOT part of this backend** — the admin
> prepares the cutout (e.g. in a photo editor) before uploading.

## Storage

SQLite, one file (`EYVAN_DB_PATH`). Schema:

```sql
CREATE TABLE snapshots (
  state TEXT PRIMARY KEY,   -- 'draft' | 'published'
  data  TEXT NOT NULL       -- one full MenuState as JSON
);
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,   -- 'lastPublishedAt'
  value TEXT
);
CREATE TABLE admin_users (
  id            INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,  -- sha256(token)
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

- **Snapshot model:** each of `draft` and `published` holds one full
  `MenuState` JSON. All CRUD loads the draft snapshot, mutates it in PHP,
  and saves it back. `publish` copies the draft JSON string → published in
  one transaction + sets `meta.lastPublishedAt`. `hasDraft` is a plain
  string comparison of the two JSON blobs.
- **Seed:** on first run (empty `snapshots` table), `backend/seed/seed.json`
  — a single `MenuState` object — is loaded into **both** snapshots and
  `lastPublishedAt` stays `null`. A `{"draft": MenuState}` wrapper is also
  accepted. If the seed file is missing or malformed, the backend fails
  loudly (500) instead of serving an empty menu.
- **JSON encoding** is canonical (`JSON_UNESCAPED_UNICODE |
  JSON_UNESCAPED_SLASHES`) so a load/save round-trip without edits leaves
  the JSON byte-identical and `hasDraft` stays false.

## Mock parity

Where the mock (`MockAdminApi`) has a rule, the backend follows it:

| Behaviour | Rule |
| --- | --- |
| New item defaults | `description ''`, `supportsSyrup false`, `supportsMilkTemp false`, `isHot false`, `image/frontImage/cutoutImage ''`, `vesselType 'cup'`, `prefersFrontView false`, `plateAngle 0`, `backdropTone 'olive'`, `available true`, `sortOrder` = sibling count; `price`, `priceBlend50`, `priceArabica100`, `highlight` omitted when unset |
| New category defaults | `subtitle ''`, `defaultTone 'olive'`, `comingSoon false`, `isHotCategory false`, `sortOrder` = category count; `comingSoonDescription` omitted when unset |
| Featured | First 3 ids only, only ids of existing items |
| Delete item | Also removes the id from `featured`; no 404 for a missing id |
| Delete category | 409 while it has items; no 404 for a missing id |
| Reorder | Only listed ids get a new `sortOrder`; the rest keep theirs |
| Change password | Empty current or new password under 6 chars is rejected |
| Error messages | `آیتم پیدا نشد.` / `دسته پیدا نشد.` / `این دسته آیتم دارد؛ اول آیتم‌هایش را جابه‌جا یا حذف کنید.` |

Deliberate deviations from the mock (all safe, all documented):

- **Ids are immutable:** an `id` key in a PATCH body is ignored (the mock's
  `Object.assign` would let it change and break references).
- **Create validation:** `POST /admin/items` requires `categoryId` + `name`;
  `POST /api/admin/categories` requires `name` + `shortName` (400 otherwise).
  The mock never validates because the views always send them.
- **Password change keeps sessions:** the admin stays signed in after
  changing their password (the mock has no sessions at all).

## Smoke test

```bash
bash backend/tests/smoke.sh
```

Starts its own `php -S 127.0.0.1:8765` instance (using `index.php` itself as
the router script) with a throwaway database + uploads dir, then runs the
full round-trip with curl: first-run setup (works once, 403 the second
time), login (good + bad password), public + admin menu (401 without a
token), edit → publish → discard (verifying `hasDraft` flips and the
published content changes), photo upload (unique filename + URL), JSON
backup, SQLite backup download, 404/409 messages, change-password, and
create/delete + the remaining write endpoints. Exits non-zero on any
failure; nothing is written to the repo.

For manual exploration:

```bash
php -S 127.0.0.1:8765 -t backend/public backend/public/api/index.php
curl http://127.0.0.1:8765/api/menu
```
