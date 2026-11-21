<?php
/**
 * SQLite storage. Schema (see API.md § Storage):
 *   snapshots(state TEXT PRIMARY KEY, data TEXT NOT NULL)  — 'draft' | 'published'
 *   meta(key TEXT PRIMARY KEY, value TEXT)                 — lastPublishedAt
 *   admin_users(id INTEGER PRIMARY KEY, password_hash TEXT NOT NULL, created_at TEXT)
 *   sessions(token_hash TEXT PRIMARY KEY, created_at TEXT, expires_at TEXT)
 *
 * On first run (empty snapshots table) the seed is loaded into BOTH snapshots
 * and lastPublishedAt stays null.
 */

declare(strict_types=1);

namespace Eyvan;

final class Database
{
    private \PDO $pdo;
    private string $dbPath;

    public function __construct(string $dbPath, string $appDir)
    {
        $this->dbPath = $dbPath;
        $dir = dirname($dbPath);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException('Cannot create database directory: ' . $dir);
        }
        $this->pdo = new \PDO('sqlite:' . $dbPath);
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        // Avoid "database is locked" on shared hosting under concurrent edits.
        $this->pdo->exec('PRAGMA busy_timeout = 5000');
        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->createSchema();
        $this->seedIfEmpty($appDir);
    }

    public function pdo(): \PDO
    {
        return $this->pdo;
    }

    public function dbPath(): string
    {
        return $this->dbPath;
    }

    private function createSchema(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS snapshots (
                state TEXT PRIMARY KEY,
                data  TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS meta (
                key   TEXT PRIMARY KEY,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS admin_users (
                id            INTEGER PRIMARY KEY,
                password_hash TEXT NOT NULL,
                created_at    TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );'
        );
    }

    private function seedIfEmpty(string $appDir): void
    {
        $count = (int) $this->pdo->query('SELECT COUNT(*) FROM snapshots')->fetchColumn();
        if ($count > 0) {
            return;
        }
        $state = eyvan_load_seed($appDir);
        $json = self::encode($state);
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('INSERT INTO snapshots (state, data) VALUES (:state, :data)');
            $stmt->execute([':state' => 'draft', ':data' => $json]);
            $stmt->execute([':state' => 'published', ':data' => $json]);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /** Canonical JSON encoding (stable round-trips, so hasDraft compares cleanly). */
    public static function encode(mixed $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Failed to encode value as JSON.');
        }
        return $json;
    }

    public static function decode(string $json): array
    {
        $value = json_decode($json, true);
        if (!is_array($value)) {
            throw new \RuntimeException('Stored menu state is not valid JSON.');
        }
        return $value;
    }

    public function getSnapshotJson(string $state): ?string
    {
        $stmt = $this->pdo->prepare('SELECT data FROM snapshots WHERE state = :state');
        $stmt->execute([':state' => $state]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row === false ? null : (string) $row['data'];
    }

    public function setSnapshotJson(string $state, string $json): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO snapshots (state, data) VALUES (:state, :data)
             ON CONFLICT(state) DO UPDATE SET data = excluded.data'
        );
        $stmt->execute([':state' => $state, ':data' => $json]);
    }

    public function getMeta(string $key): ?string
    {
        $stmt = $this->pdo->prepare('SELECT value FROM meta WHERE key = :key');
        $stmt->execute([':key' => $key]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $row === false || $row['value'] === null ? null : (string) $row['value'];
    }

    public function setMeta(string $key, ?string $value): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO meta (key, value) VALUES (:key, :value)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        );
        $stmt->execute([':key' => $key, ':value' => $value]);
    }

    public function transaction(callable $fn): mixed
    {
        $this->pdo->beginTransaction();
        try {
            $result = $fn();
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
