<?php
/**
 * Eyvan menu API — front controller.
 *
 * Deployed to public_html/api/ (see DEPLOY.md). All /api/* requests are
 * rewritten here by the .htaccess next to this file.
 *
 * The backend app directory (backend/) is resolved in this order:
 *   1. config.php next to this file (deploy-time, NOT in the repo) returning
 *      ['app_dir' => ...] or defining the EYVAN_APP_DIR constant
 *   2. the EYVAN_APP_DIR environment variable
 *   3. the repo layout: backend/public/api/index.php → backend/
 */

declare(strict_types=1);

// Built-in server (php -S) dev use: this file doubles as the router script,
// so `php -S 127.0.0.1:8765 -t backend/public backend/public/api/index.php`
// routes /api/* here and serves everything else (e.g. /uploads/*) statically.
if (\PHP_SAPI === 'cli-server') {
    $requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', \PHP_URL_PATH);
    if (!is_string($requestPath)) {
        $requestPath = '/';
    }
    if ($requestPath !== '/api' && !str_starts_with($requestPath, '/api/')) {
        return false;
    }
}

$overrides = [];
$configFile = __DIR__ . '/config.php';
if (is_file($configFile)) {
    $loaded = require $configFile;
    if (is_array($loaded)) {
        $overrides = $loaded;
    }
}

$appDir = null;
foreach (['app_dir', 'EYVAN_APP_DIR'] as $key) {
    if (isset($overrides[$key]) && is_string($overrides[$key]) && $overrides[$key] !== '') {
        $appDir = $overrides[$key];
        break;
    }
}
if ($appDir === null && defined('EYVAN_APP_DIR')) {
    $constant = constant('EYVAN_APP_DIR');
    if (is_string($constant) && $constant !== '') {
        $appDir = $constant;
    }
}
if ($appDir === null) {
    $envAppDir = getenv('EYVAN_APP_DIR');
    if (is_string($envAppDir) && $envAppDir !== '') {
        $appDir = $envAppDir;
    }
}
if ($appDir === null) {
    $candidate = dirname(__DIR__, 2); // backend/public/api → backend/
    if (is_file($candidate . '/src/bootstrap.php')) {
        $appDir = $candidate;
    }
}
if ($appDir === null) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'code' => 'server_error',
            'message' => 'Backend is not configured: set EYVAN_APP_DIR or add a config.php next to index.php.',
        ],
    ]);
    exit(1);
}

require $appDir . '/src/bootstrap.php';

\Eyvan\Api::handle($appDir, $overrides);
