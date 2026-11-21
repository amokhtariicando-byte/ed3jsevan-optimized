<?php
/**
 * HTTP front controller: route dispatch, JSON in/out, auth enforcement,
 * and the shared error shape {"error": {"code", "message"}} with Persian
 * messages (mirroring the mock's wording where it has one).
 *
 * The route table implements the AdminApi contract from src/admin/types.ts
 * plus the extras documented in API.md (setup, backup-db, upload).
 */

declare(strict_types=1);

namespace Eyvan;

/** API failure with the HTTP status + error code to answer with. */
final class ApiException extends \RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message);
    }
}

final class Api
{
    private Database $db;
    private MenuStore $store;
    private Uploads $uploads;

    public function __construct(private array $config)
    {
        $this->db = new Database($config['db_path'], $config['app_dir']);
        $this->store = new MenuStore($this->db);
        $this->uploads = new Uploads($config['uploads_dir'], $config['uploads_url']);
    }

    public static function handle(string $appDir, array $overrides = []): void
    {
        $config = eyvan_config($appDir, $overrides);
        $api = new self($config);
        $api->dispatch();
    }

    // ---- dispatch ----

    public function dispatch(): void
    {
        try {
            $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
            $path = $this->requestPath();
            $this->route($method, $path);
        } catch (NotFoundException $e) {
            $this->error(404, 'not_found', $e->getMessage());
        } catch (ConflictException $e) {
            $this->error(409, 'conflict', $e->getMessage());
        } catch (UploadException $e) {
            $this->error($e->status, $e->errorCode, $e->getMessage());
        } catch (ApiException $e) {
            $this->error($e->status, $e->errorCode, $e->getMessage());
        } catch (\Throwable $e) {
            error_log('[eyvan-api] ' . $e->getMessage());
            $this->error(500, 'server_error', 'خطای داخلی سرور؛ دوباره تلاش کنید.');
        }
    }

    private function route(string $method, string $path): void
    {
        // Public: the published menu customers see.
        if ($method === 'GET' && $path === '/menu') {
            $this->json(200, $this->store->getPublished());
            return;
        }

        // First-run setup + login are the only unauthenticated admin routes.
        if ($method === 'POST' && $path === '/admin/setup') {
            $this->setup();
            return;
        }
        if ($method === 'POST' && $path === '/admin/login') {
            $this->login();
            return;
        }

        // Everything else under /admin/* requires a valid bearer token.
        if (str_starts_with($path, '/admin/')) {
            $this->requireAuth();
            $this->routeAdmin($method, $path);
            return;
        }

        throw new ApiException(404, 'not_found', 'مسیر پیدا نشد.');
    }

    private function routeAdmin(string $method, string $path): void
    {
        // Menu + publish state + backup
        if ($method === 'GET' && $path === '/admin/menu') {
            $this->json(200, $this->store->getDraft());
            return;
        }
        if ($method === 'GET' && $path === '/admin/publish-state') {
            $this->json(200, $this->store->getPublishState());
            return;
        }
        if ($method === 'POST' && $path === '/admin/publish') {
            $this->json(200, $this->store->publish());
            return;
        }
        if ($method === 'POST' && $path === '/admin/discard-draft') {
            $this->json(200, $this->store->discardDraft());
            return;
        }
        if ($method === 'GET' && $path === '/admin/backup') {
            $this->json(200, $this->store->exportBackup());
            return;
        }
        if ($method === 'GET' && $path === '/admin/backup-db') {
            $this->downloadDatabase();
            return;
        }
        if ($method === 'POST' && $path === '/admin/change-password') {
            $this->changePassword();
            return;
        }
        if ($method === 'POST' && $path === '/admin/upload') {
            $this->upload();
            return;
        }

        // Items (literal /reorder first: it would also match the :id pattern)
        if ($method === 'POST' && $path === '/admin/items/reorder') {
            $this->reorderItems();
            return;
        }
        if ($method === 'POST' && $path === '/admin/items') {
            $this->createItem();
            return;
        }
        if ($method === 'PATCH' && preg_match('#^/admin/items/([^/]+)$#', $path, $m)) {
            $this->updateItem(rawurldecode($m[1]));
            return;
        }
        if ($method === 'DELETE' && preg_match('#^/admin/items/([^/]+)$#', $path, $m)) {
            $this->deleteItem(rawurldecode($m[1]));
            return;
        }

        // Categories
        if ($method === 'POST' && $path === '/admin/categories/reorder') {
            $this->reorderCategories();
            return;
        }
        if ($method === 'POST' && $path === '/admin/categories') {
            $this->createCategory();
            return;
        }
        if ($method === 'PATCH' && preg_match('#^/admin/categories/([^/]+)$#', $path, $m)) {
            $this->updateCategory(rawurldecode($m[1]));
            return;
        }
        if ($method === 'DELETE' && preg_match('#^/admin/categories/([^/]+)$#', $path, $m)) {
            $this->deleteCategory(rawurldecode($m[1]));
            return;
        }

        // Syrups / featured / cafe info / SEO
        if ($method === 'PUT' && $path === '/admin/syrups') {
            $this->updateSyrups();
            return;
        }
        if ($method === 'PUT' && $path === '/admin/featured') {
            $this->updateFeatured();
            return;
        }
        if ($method === 'PATCH' && $path === '/admin/cafe-info') {
            $this->updateCafeInfo();
            return;
        }
        if ($method === 'PUT' && $path === '/admin/seo') {
            $this->updateSeo();
            return;
        }

        throw new ApiException(404, 'not_found', 'مسیر پیدا نشد.');
    }

    // ---- auth endpoints ----

    private function setup(): void
    {
        $body = $this->jsonObjectBody();
        if (Auth::hasPassword($this->db)) {
            throw new ApiException(403, 'setup_already_done', 'رمز عبور مدیر قبلاً تنظیم شده است.');
        }
        $password = $body['password'] ?? null;
        if (!is_string($password) || trim($password) === '') {
            throw new ApiException(400, 'validation_error', 'رمز عبور را وارد کنید.');
        }
        if (mb_strlen(trim($password)) < MIN_PASSWORD_LENGTH) {
            throw new ApiException(422, 'validation_error', 'رمز عبور باید حداقل ۶ کاراکتر باشد.');
        }
        Auth::setInitialPassword($this->db, $password);
        $this->json(200, ['ok' => true]);
    }

    private function login(): void
    {
        $body = $this->jsonObjectBody();
        $password = $body['password'] ?? null;
        if (!is_string($password)) {
            $password = '';
        }
        $token = Auth::login($this->db, $password);
        if ($token === null) {
            $this->json(401, [
                'ok' => false,
                'error' => ['code' => 'invalid_password', 'message' => 'رمز عبور اشتباه است.'],
            ]);
            return;
        }
        $this->json(200, ['ok' => true, 'token' => $token]);
    }

    private function changePassword(): void
    {
        $body = $this->jsonObjectBody();
        $current = $body['current'] ?? null;
        $next = $body['next'] ?? null;
        if (!is_string($current) || !is_string($next)) {
            throw new ApiException(400, 'validation_error', 'رمز عبور فعلی و جدید را وارد کنید.');
        }
        // NOTE: a wrong current password is 400, never 401 — the frontend
        // treats 401 as "session expired" and would log the admin out.
        $result = Auth::changePassword($this->db, $current, $next);
        if ($result === 'wrong_current') {
            throw new ApiException(400, 'wrong_password', 'رمز عبور فعلی اشتباه است.');
        }
        if ($result === 'invalid_next') {
            throw new ApiException(422, 'password_too_short', 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
        }
        $this->json(200, ['ok' => true]);
    }

    // ---- item endpoints ----

    private function createItem(): void
    {
        $input = $this->jsonObjectBody();
        if (empty($input['categoryId']) || !is_string($input['categoryId'])
            || empty($input['name']) || !is_string($input['name'])) {
            throw new ApiException(400, 'validation_error', 'دسته و نام آیتم الزامی است.');
        }
        $this->json(201, $this->store->createItem($input));
    }

    private function updateItem(string $id): void
    {
        $patch = $this->jsonObjectBody();
        $this->json(200, $this->store->updateItem($id, $patch));
    }

    private function deleteItem(string $id): void
    {
        $this->store->deleteItem($id);
        $this->noContent();
    }

    private function reorderItems(): void
    {
        $body = $this->jsonObjectBody();
        $categoryId = $body['categoryId'] ?? null;
        $orderedIds = $body['orderedIds'] ?? null;
        if (!is_string($categoryId) || !is_array($orderedIds) || !array_is_list($orderedIds)) {
            throw new ApiException(400, 'validation_error', 'categoryId و orderedIds الزامی است.');
        }
        $this->store->reorderItems($categoryId, $orderedIds);
        $this->json(200, ['ok' => true]);
    }

    // ---- category endpoints ----

    private function createCategory(): void
    {
        $input = $this->jsonObjectBody();
        if (empty($input['name']) || !is_string($input['name'])
            || empty($input['shortName']) || !is_string($input['shortName'])) {
            throw new ApiException(400, 'validation_error', 'نام و نام کوتاه دسته الزامی است.');
        }
        $this->json(201, $this->store->createCategory($input));
    }

    private function updateCategory(string $id): void
    {
        $patch = $this->jsonObjectBody();
        $this->json(200, $this->store->updateCategory($id, $patch));
    }

    private function deleteCategory(string $id): void
    {
        $this->store->deleteCategory($id);
        $this->noContent();
    }

    private function reorderCategories(): void
    {
        $body = $this->jsonObjectBody();
        $orderedIds = $body['orderedIds'] ?? null;
        if (!is_array($orderedIds) || !array_is_list($orderedIds)) {
            throw new ApiException(400, 'validation_error', 'orderedIds الزامی است.');
        }
        $this->store->reorderCategories($orderedIds);
        $this->json(200, ['ok' => true]);
    }

    // ---- syrups / featured / cafe info / SEO ----

    private function updateSyrups(): void
    {
        $syrups = $this->jsonListBody();
        foreach ($syrups as $syrup) {
            if (!is_array($syrup) || !isset($syrup['id'], $syrup['name'])
                || !is_string($syrup['id']) || !is_string($syrup['name'])) {
                throw new ApiException(400, 'validation_error', 'هر سیروپ باید id و name داشته باشد.');
            }
        }
        $this->json(200, $this->store->updateSyrups($syrups));
    }

    private function updateFeatured(): void
    {
        $ids = $this->jsonListBody();
        $this->json(200, $this->store->updateFeatured($ids));
    }

    private function updateCafeInfo(): void
    {
        $patch = $this->jsonObjectBody();
        $this->json(200, $this->store->updateCafeInfo($patch));
    }

    private function updateSeo(): void
    {
        $seo = $this->jsonObjectBody();
        if (!isset($seo['title'], $seo['description'])
            || !is_string($seo['title']) || !is_string($seo['description'])) {
            throw new ApiException(400, 'validation_error', 'title و description الزامی است.');
        }
        $this->json(200, $this->store->updateSeo($seo));
    }

    // ---- upload + database backup ----

    private function upload(): void
    {
        $slot = $_POST['slot'] ?? '';
        $file = $_FILES['file'] ?? null;
        if (!is_array($file)) {
            throw new ApiException(400, 'validation_error', 'فایلی آپلود نشده است.');
        }
        $url = $this->uploads->handle($file, is_string($slot) ? $slot : '');
        $this->json(201, ['url' => $url]);
    }

    private function downloadDatabase(): void
    {
        // VACUUM INTO writes a transactionally consistent copy, so the
        // download is safe even while the admin panel is editing.
        $tmp = tempnam(sys_get_temp_dir(), 'eyvan-db-');
        if ($tmp === false) {
            throw new \RuntimeException('Cannot create temp file for database backup.');
        }
        // VACUUM INTO refuses to overwrite an existing file; tempnam just
        // created one, so remove it first.
        @unlink($tmp);
        try {
            $quoted = "'" . str_replace("'", "''", $tmp) . "'";
            try {
                $this->db->pdo()->exec("VACUUM INTO {$quoted}");
            } catch (\Throwable) {
                // Older SQLite without VACUUM INTO: fall back to a plain copy.
                if (!copy($this->db->dbPath(), $tmp)) {
                    throw new \RuntimeException('Database backup failed.');
                }
            }
            $size = filesize($tmp);
            if ($size === false) {
                throw new \RuntimeException('Database backup failed.');
            }
            $filename = 'eyvan-backup-' . gmdate('Ymd-His') . '.db';
            header('Content-Type: application/x-sqlite3');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . (string) $size);
            header('Cache-Control: no-store');
            readfile($tmp);
        } finally {
            @unlink($tmp);
        }
    }

    // ---- request helpers ----

    /** Path relative to the /api mount, e.g. '/admin/items/123'. */
    private function requestPath(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH);
        if (!is_string($path) || $path === '') {
            $path = '/';
        }
        // The API is mounted at /api (see public/api/.htaccess).
        if ($path === '/api' || str_starts_with($path, '/api/')) {
            $path = substr($path, 4);
            $path = $path === '' ? '/' : $path;
        }
        // Tolerate a direct hit on /api/index.php[/...].
        if ($path === '/index.php' || str_starts_with($path, '/index.php/')) {
            $path = substr($path, strlen('/index.php'));
            $path = $path === '' ? '/' : $path;
        }
        $path = trim($path, '/');
        return $path === '' ? '/' : '/' . $path;
    }

    /** Decode the JSON request body. Throws 400 on invalid JSON. */
    private function jsonBody(): mixed
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new ApiException(400, 'validation_error', 'بدنهٔ درخواست JSON معتبر نیست.');
        }
        return $data;
    }

    /** JSON body that must be an object ({} or {"k": ...}). */
    private function jsonObjectBody(): array
    {
        $data = $this->jsonBody();
        if (!is_array($data) || (array_is_list($data) && $data !== [])) {
            throw new ApiException(400, 'validation_error', 'بدنهٔ درخواست باید یک شیء JSON باشد.');
        }
        return $data;
    }

    /** JSON body that must be an array ([...]). */
    private function jsonListBody(): array
    {
        $data = $this->jsonBody();
        if (!is_array($data) || !array_is_list($data)) {
            throw new ApiException(400, 'validation_error', 'بدنهٔ درخواست باید یک آرایهٔ JSON باشد.');
        }
        return $data;
    }

    // ---- auth helpers ----

    private function requireAuth(): void
    {
        $token = $this->bearerToken();
        if (!Auth::authenticate($this->db, $token)) {
            throw new ApiException(401, 'unauthorized', 'نشست شما منقضی شده؛ دوباره وارد شوید.');
        }
    }

    private function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if ($header === '' && function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                if (strcasecmp((string) $name, 'Authorization') === 0) {
                    $header = (string) $value;
                    break;
                }
            }
        }
        if (preg_match('/^Bearer\s+(.+)$/i', trim((string) $header), $m)) {
            return trim($m[1]);
        }
        return null;
    }

    // ---- response helpers ----

    private function json(int $status, mixed $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        // API responses are never cached (also enforced by the .htaccess
        // no-store rule for .php responses in production).
        header('Cache-Control: no-store');
        echo Database::encode($data);
    }

    private function noContent(): void
    {
        http_response_code(204);
        header('Cache-Control: no-store');
    }

    private function error(int $status, string $code, string $message): void
    {
        $this->json($status, ['error' => ['code' => $code, 'message' => $message]]);
    }
}
