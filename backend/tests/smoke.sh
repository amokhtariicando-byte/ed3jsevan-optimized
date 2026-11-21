#!/usr/bin/env bash
# Eyvan backend smoke test — full API round-trip against a local `php -S`
# instance with a throwaway database + uploads dir.
#
# Usage: bash backend/tests/smoke.sh
#
# Uses backend/seed/seed.json (the real seed in the repo, or a fixture in a
# scratch copy). Requires: php, curl. Starts its own php -S server on
# 127.0.0.1:8765 and stops it afterwards; nothing is written to the repo.
set -u

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BASE="http://127.0.0.1:8765/api"
PASSWORD='SmokeTest123'
NEWPASSWORD='SmokeTest456'

PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); printf 'PASS  %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf 'FAIL  %s\n' "$1"; }
expect_eq() { # name expected actual
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected [$2], got [$3])"; fi
}
expect_contains() { # name file needle
  if grep -F -q "$3" "$2"; then ok "$1"; else bad "$1 (missing [$3])"; fi
}
expect_not_contains() { # name file needle
  if grep -F -q "$3" "$2"; then bad "$1 (unexpected [$3])"; else ok "$1"; fi
}

# --- prerequisites ---------------------------------------------------------
command -v php >/dev/null 2>&1 || { echo "php not found on PATH"; exit 2; }
command -v curl >/dev/null 2>&1 || { echo "curl not found on PATH"; exit 2; }
[ -f "$BACKEND_DIR/seed/seed.json" ] || { echo "seed.json missing: $BACKEND_DIR/seed/seed.json"; exit 2; }

WORK="$(mktemp -d)"
DB_PATH="$WORK/eyvan.db"
UPLOADS_DIR="$WORK/uploads"
mkdir -p "$UPLOADS_DIR"
BODY="$WORK/body"
SERVER_LOG="$WORK/server.log"

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

# --- start server ----------------------------------------------------------
EYVAN_DB_PATH="$DB_PATH" EYVAN_UPLOADS_DIR="$UPLOADS_DIR" EYVAN_UPLOADS_URL="/uploads/" \
  php -S 127.0.0.1:8765 -t "$BACKEND_DIR/public" "$BACKEND_DIR/public/api/index.php" \
  >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

READY=0
for _ in $(seq 1 50); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/menu" 2>/dev/null || true)"
  if [ "$code" = "200" ]; then READY=1; break; fi
  sleep 0.2
done
if [ "$READY" != "1" ]; then
  echo "Server did not become ready; last lines of the server log:"
  tail -20 "$SERVER_LOG"
  exit 2
fi

# --- helpers ---------------------------------------------------------------
# req METHOD PATH [BODY] [TOKEN] — response body lands in $BODY, prints HTTP code
req() {
  local method="$1" path="$2" data="${3:-}" token="${4:-}"
  local args=(-s -o "$BODY" -w '%{http_code}' -X "$method")
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' -d "$data")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  curl "${args[@]}" "$BASE$path"
}

# jget FILE dotted.path — extract a scalar from a JSON file via php
jget() {
  php -r '$d=json_decode(file_get_contents($argv[1]),true); $v=$d; foreach(explode(".",$argv[2]) as $k){ $v=(is_array($v)&&array_key_exists($k,$v))?$v[$k]:null; } echo is_bool($v)?($v?"true":"false"):(is_scalar($v)?(string)$v:"");' "$1" "$2"
}

# --- 1. public menu, no auth ----------------------------------------------
code="$(req GET /menu)"
expect_eq "1. GET /api/menu (public) -> 200" "200" "$code"
expect_contains "1. public menu has categories" "$BODY" '"categories"'
expect_contains "1. public menu has items" "$BODY" '"items"'

# --- 2. first-run setup works once ----------------------------------------
code="$(req POST /admin/setup "{\"password\":\"$PASSWORD\"}")"
expect_eq "2. POST /admin/setup (first run) -> 200" "200" "$code"
expect_contains "2. setup returns ok:true" "$BODY" '"ok":true'

# --- 3. setup a second time -> 403 ----------------------------------------
code="$(req POST /admin/setup "{\"password\":\"$PASSWORD\"}")"
expect_eq "3. POST /admin/setup (second run) -> 403" "403" "$code"

# --- 4. login with wrong password -> 401 ----------------------------------
code="$(req POST /admin/login '{"password":"wrong-password"}')"
expect_eq "4. login (wrong password) -> 401" "401" "$code"

# --- 5. login with correct password -> 200 + token ------------------------
code="$(req POST /admin/login "{\"password\":\"$PASSWORD\"}")"
expect_eq "5. login (correct password) -> 200" "200" "$code"
TOKEN="$(jget "$BODY" token)"
if [ -n "$TOKEN" ]; then ok "5. login returns a token"; else bad "5. login returns a token"; fi

# --- 6. admin menu without token -> 401 -----------------------------------
code="$(req GET /admin/menu)"
expect_eq "6. GET /admin/menu (no token) -> 401" "401" "$code"

# --- 7. admin menu with token -> 200 --------------------------------------
code="$(req GET /admin/menu "" "$TOKEN")"
expect_eq "7. GET /admin/menu (with token) -> 200" "200" "$code"
ITEM_ID="$(jget "$BODY" items.0.id)"
CAT_ID="$(jget "$BODY" categories.0.id)"
if [ -n "$ITEM_ID" ] && [ -n "$CAT_ID" ]; then ok "7. draft menu has an item + a category"; else bad "7. draft menu has an item + a category"; fi

# --- 8. edit an item -------------------------------------------------------
code="$(req PATCH "/admin/items/$ITEM_ID" '{"name":"نام آزمایشی"}' "$TOKEN")"
expect_eq "8. PATCH item -> 200" "200" "$code"
expect_contains "8. PATCH returns the new name" "$BODY" 'نام آزمایشی'

# --- 9. hasDraft flips to true --------------------------------------------
code="$(req GET /admin/publish-state "" "$TOKEN")"
expect_eq "9. GET /admin/publish-state -> 200" "200" "$code"
expect_eq "9. hasDraft is true after edit" "true" "$(jget "$BODY" hasDraft)"

# --- 10. publish -----------------------------------------------------------
code="$(req POST /admin/publish "" "$TOKEN")"
expect_eq "10. POST /admin/publish -> 200" "200" "$code"
expect_eq "10. hasDraft is false after publish" "false" "$(jget "$BODY" hasDraft)"
PUBLISHED_AT="$(jget "$BODY" lastPublishedAt)"
if [ -n "$PUBLISHED_AT" ]; then ok "10. lastPublishedAt is set"; else bad "10. lastPublishedAt is set"; fi

# --- 11. public menu now shows the edit -----------------------------------
code="$(req GET /menu)"
expect_eq "11. GET /api/menu after publish -> 200" "200" "$code"
expect_contains "11. published menu has the new name" "$BODY" 'نام آزمایشی'

# --- 12. edit again, then discard -----------------------------------------
code="$(req PATCH "/admin/items/$ITEM_ID" '{"name":"نام دوم"}' "$TOKEN")"
expect_eq "12. PATCH item again -> 200" "200" "$code"
code="$(req GET /admin/publish-state "" "$TOKEN")"
expect_eq "12. hasDraft is true after second edit" "true" "$(jget "$BODY" hasDraft)"
code="$(req POST /admin/discard-draft "" "$TOKEN")"
expect_eq "12. POST /admin/discard-draft -> 200" "200" "$code"
expect_contains "12. draft restored to the published name" "$BODY" 'نام آزمایشی'
expect_not_contains "12. discarded draft lost the second name" "$BODY" 'نام دوم'
code="$(req GET /admin/publish-state "" "$TOKEN")"
expect_eq "12. hasDraft is false after discard" "false" "$(jget "$BODY" hasDraft)"

# --- 13. photo upload ------------------------------------------------------
PNG="$WORK/test.png"
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=' | base64 -d >"$PNG"
code="$(curl -s -o "$BODY" -w '%{http_code}' -X POST "$BASE/admin/upload" \
  -H "Authorization: Bearer $TOKEN" -F "file=@$PNG;type=image/png" -F "slot=image")"
expect_eq "13. POST /admin/upload -> 201" "201" "$code"
URL="$(jget "$BODY" url)"
if [[ "$URL" == /uploads/* ]]; then ok "13. upload returns a /uploads/ URL"; else bad "13. upload returns a /uploads/ URL (got [$URL])"; fi
BASENAME="$(basename "$URL")"
if [ -f "$UPLOADS_DIR/$BASENAME" ]; then ok "13. uploaded file exists on disk"; else bad "13. uploaded file exists on disk ($BASENAME)"; fi
if [[ "$BASENAME" =~ ^[0-9a-f]{64}-[0-9]+-[0-9a-f]{8}\.png$ ]]; then ok "13. filename is sha256-timestamp-random"; else bad "13. filename is sha256-timestamp-random (got [$BASENAME])"; fi

# --- 14. JSON backup -------------------------------------------------------
code="$(req GET /admin/backup "" "$TOKEN")"
expect_eq "14. GET /admin/backup -> 200" "200" "$code"
expect_eq "14. backup version is 1" "1" "$(jget "$BODY" version)"
expect_contains "14. backup has draft + published" "$BODY" '"published"'
expect_contains "14. backup has lastPublishedAt" "$BODY" '"lastPublishedAt"'

# --- 15. SQLite backup download -------------------------------------------
DBFILE="$WORK/backup.db"
code="$(curl -s -o "$DBFILE" -w '%{http_code}' "$BASE/admin/backup-db" -H "Authorization: Bearer $TOKEN")"
expect_eq "15. GET /admin/backup-db -> 200" "200" "$code"
HEADER="$(head -c 15 "$DBFILE")"
expect_eq "15. backup-db is a SQLite file" "SQLite format 3" "$HEADER"
SNAPSHOTS="$(php -r '$p=new PDO("sqlite:".$argv[1]); echo (int)$p->query("SELECT COUNT(*) FROM snapshots")->fetchColumn();' "$DBFILE")"
expect_eq "15. backup-db holds both snapshots" "2" "$SNAPSHOTS"

# --- 16. PATCH a missing item -> 404 ---------------------------------------
code="$(req PATCH /admin/items/no-such-item '{"name":"x"}' "$TOKEN")"
expect_eq "16. PATCH missing item -> 404" "404" "$code"
expect_contains "16. 404 message matches the mock" "$BODY" 'آیتم پیدا نشد.'

# --- 17. DELETE a category that still has items -> 409 --------------------
code="$(req DELETE "/admin/categories/$CAT_ID" "" "$TOKEN")"
expect_eq "17. DELETE category with items -> 409" "409" "$code"
expect_contains "17. 409 message matches the mock" "$BODY" 'این دسته آیتم دارد'

# --- 18. change-password round trip ---------------------------------------
code="$(req POST /admin/change-password '{"current":"wrong","next":"SmokeTest456"}' "$TOKEN")"
expect_eq "18. change-password (wrong current) -> 400" "400" "$code"
code="$(req POST /admin/change-password "{\"current\":\"$PASSWORD\",\"next\":\"$NEWPASSWORD\"}" "$TOKEN")"
expect_eq "18. change-password (correct current) -> 200" "200" "$code"
code="$(req POST /admin/change-password "{\"current\":\"$NEWPASSWORD\",\"next\":\"abc\"}" "$TOKEN")"
expect_eq "18. change-password (short next) -> 422" "422" "$code"
code="$(req POST /admin/login "{\"password\":\"$PASSWORD\"}")"
expect_eq "18. old password no longer works -> 401" "401" "$code"
code="$(req POST /admin/login "{\"password\":\"$NEWPASSWORD\"}")"
expect_eq "18. new password works -> 200" "200" "$code"

# --- 19. create + delete an item ------------------------------------------
code="$(req POST /admin/items "{\"categoryId\":\"$CAT_ID\",\"name\":\"آیتم تستی\",\"price\":100}" "$TOKEN")"
expect_eq "19. POST /admin/items -> 201" "201" "$code"
NEW_ID="$(jget "$BODY" id)"
if [[ "$NEW_ID" == item-* ]]; then ok "19. new item has a server-generated id"; else bad "19. new item has a server-generated id (got [$NEW_ID])"; fi
expect_eq "19. new item defaults available=true" "true" "$(jget "$BODY" available)"
expect_eq "19. new item defaults vesselType=cup" "cup" "$(jget "$BODY" vesselType)"
expect_eq "19. new item defaults backdropTone=olive" "olive" "$(jget "$BODY" backdropTone)"
code="$(req DELETE "/admin/items/$NEW_ID" "" "$TOKEN")"
expect_eq "19. DELETE /admin/items/:id -> 204" "204" "$code"

# --- 20. remaining write endpoints ----------------------------------------
code="$(req PUT /admin/featured "[\"$ITEM_ID\"]" "$TOKEN")"
expect_eq "20. PUT /admin/featured -> 200" "200" "$code"
code="$(req PUT /admin/syrups '[{"id":"s1","name":"تستی","price":10}]' "$TOKEN")"
expect_eq "20. PUT /admin/syrups -> 200" "200" "$code"
code="$(req PATCH /admin/cafe-info '{"hours":"تست"}' "$TOKEN")"
expect_eq "20. PATCH /admin/cafe-info -> 200" "200" "$code"
code="$(req PUT /admin/seo '{"title":"تست","description":"تست"}' "$TOKEN")"
expect_eq "20. PUT /admin/seo -> 200" "200" "$code"
code="$(req POST /admin/items/reorder "{\"categoryId\":\"$CAT_ID\",\"orderedIds\":[\"$ITEM_ID\"]}" "$TOKEN")"
expect_eq "20. POST /admin/items/reorder -> 200" "200" "$code"
code="$(req POST /admin/categories/reorder "{\"orderedIds\":[\"$CAT_ID\"]}" "$TOKEN")"
expect_eq "20. POST /admin/categories/reorder -> 200" "200" "$code"

echo
echo "Smoke test: $PASS passed, $FAIL failed."
[ "$FAIL" -eq 0 ]
