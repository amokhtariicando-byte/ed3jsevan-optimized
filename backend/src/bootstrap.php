<?php
/**
 * Eyvan menu backend — bootstrap.
 *
 * Resolves configuration and loads the backend classes. No framework, no
 * Composer: plain PHP 8.1+ with PDO + SQLite only.
 *
 * Config resolution order for each setting:
 *   1. $overrides passed by the entry point (from a deploy-time config.php)
 *   2. a PHP constant of the same name (also settable from config.php)
 *   3. an environment variable
 *   4. the repo-layout default derived from $appDir
 */

declare(strict_types=1);

namespace Eyvan;

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/MenuStore.php';
require_once __DIR__ . '/Uploads.php';
require_once __DIR__ . '/Api.php';
require_once __DIR__ . '/seed.php';

/** Default admin session lifetime: 12 hours. */
const SESSION_TTL_SECONDS = 12 * 3600;
/** Minimum admin password length (mirrors the mock's change-password rule). */
const MIN_PASSWORD_LENGTH = 6;
/** Maximum uploaded photo size: 5 MB. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Resolve the backend configuration.
 *
 * @param string $appDir    Absolute path of the backend/ directory.
 * @param array  $overrides Deploy-time overrides (from config.php). Keys may
 *                          be 'app_dir'/'db_path'/'uploads_dir'/'uploads_url'
 *                          or the 'EYVAN_*' names.
 * @return array{app_dir:string, db_path:string, uploads_dir:string, uploads_url:string}
 */
function eyvan_config(string $appDir, array $overrides = []): array
{
    // Normalise EYVAN_* keys to the short names.
    foreach ([
        'EYVAN_APP_DIR' => 'app_dir',
        'EYVAN_DB_PATH' => 'db_path',
        'EYVAN_UPLOADS_DIR' => 'uploads_dir',
        'EYVAN_UPLOADS_URL' => 'uploads_url',
    ] as $envName => $key) {
        if (isset($overrides[$envName]) && !isset($overrides[$key])) {
            $overrides[$key] = $overrides[$envName];
        }
    }

    $resolve = static function (string $key, string $envName, ?string $default) use ($overrides): ?string {
        if (isset($overrides[$key]) && is_string($overrides[$key]) && $overrides[$key] !== '') {
            return $overrides[$key];
        }
        if (defined($envName)) {
            $constant = constant($envName);
            if (is_string($constant) && $constant !== '') {
                return $constant;
            }
        }
        $env = getenv($envName);
        if (is_string($env) && $env !== '') {
            return $env;
        }
        return $default;
    };

    return [
        'app_dir' => $appDir,
        'db_path' => $resolve('db_path', 'EYVAN_DB_PATH', $appDir . '/data/eyvan.db'),
        'uploads_dir' => $resolve('uploads_dir', 'EYVAN_UPLOADS_DIR', eyvan_default_uploads_dir($appDir)),
        'uploads_url' => rtrim(
            (string) $resolve('uploads_url', 'EYVAN_UPLOADS_URL', '/uploads/'),
            '/'
        ) . '/',
    ];
}

/**
 * Default uploads directory, resolved sensibly for the layout in use:
 *   - dev/repo layout:  <repo>/public/uploads  (backend/ sits next to public/)
 *   - shared hosting:   <app>/../public_html/uploads (app/ next to public_html/)
 *   - otherwise:        <app>/data/uploads (set EYVAN_UPLOADS_DIR explicitly)
 */
function eyvan_default_uploads_dir(string $appDir): string
{
    $parent = dirname($appDir);
    if (is_dir($parent . '/public')) {
        return $parent . '/public/uploads';
    }
    if (is_dir($parent . '/public_html')) {
        return $parent . '/public_html/uploads';
    }
    return $appDir . '/data/uploads';
}

/** ISO-8601 UTC timestamp with milliseconds, like JS Date.toISOString(). */
function eyvan_now_iso(): string
{
    return (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))
        ->format('Y-m-d\TH:i:s.v\Z');
}
