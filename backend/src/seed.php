<?php
/**
 * Seed loader. Reads backend/seed/seed.json — a single MenuState object
 * (produced from src/data/menuData.ts) — and returns it as a PHP array.
 * A {"draft": MenuState, ...} wrapper is also accepted.
 *
 * @throws \RuntimeException when the file is missing or malformed.
 */

declare(strict_types=1);

namespace Eyvan;

function eyvan_load_seed(string $appDir): array
{
    $path = $appDir . '/seed/seed.json';
    if (!is_file($path)) {
        throw new \RuntimeException('Seed file missing: ' . $path);
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        throw new \RuntimeException('Seed file unreadable: ' . $path);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new \RuntimeException('Seed file is not valid JSON: ' . $path);
    }
    // Tolerate a {"draft": MenuState, ...} wrapper.
    if (isset($data['draft']) && is_array($data['draft'])) {
        $data = $data['draft'];
    }
    foreach (['categories', 'items', 'syrups', 'cafeInfo', 'featured', 'seo'] as $key) {
        if (!array_key_exists($key, $data)) {
            throw new \RuntimeException("Seed file is missing the '{$key}' key: {$path}");
        }
    }
    return $data;
}
