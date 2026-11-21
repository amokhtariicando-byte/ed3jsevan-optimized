<?php
/**
 * Admin authentication: one password (bcrypt via password_hash), bearer
 * tokens stored as SHA-256 hashes with a 12-hour expiry. No password is
 * ever hard-coded; the first password is set by POST /api/admin/setup or
 * by `php backend/setup.php`.
 */

declare(strict_types=1);

namespace Eyvan;

final class Auth
{
    public static function hasPassword(Database $db): bool
    {
        $count = (int) $db->pdo()->query('SELECT COUNT(*) FROM admin_users')->fetchColumn();
        return $count > 0;
    }

    /** First-run only: refuses when a password already exists. */
    public static function setInitialPassword(Database $db, string $password): void
    {
        if (self::hasPassword($db)) {
            throw new \RuntimeException('Admin password already set.');
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new \RuntimeException('Failed to hash password.');
        }
        $db->pdo()->prepare(
            'INSERT INTO admin_users (password_hash, created_at) VALUES (:hash, :now)'
        )->execute([':hash' => $hash, ':now' => eyvan_now_iso()]);
    }

    public static function verifyPassword(Database $db, string $password): bool
    {
        $row = $db->pdo()->query(
            'SELECT password_hash FROM admin_users ORDER BY id ASC LIMIT 1'
        )->fetch(\PDO::FETCH_ASSOC);
        if ($row === false) {
            return false;
        }
        return password_verify($password, (string) $row['password_hash']);
    }

    /**
     * Change the admin password. Mirrors the mock rule: an empty current
     * password or a new password shorter than 6 characters is rejected.
     * Returns 'ok' | 'wrong_current' | 'invalid_next'.
     *
     * Note: existing sessions are NOT invalidated, matching the mock UX
     * (the admin stays signed in after changing their password); tokens
     * still expire 12 hours after login.
     */
    public static function changePassword(Database $db, string $current, string $next): string
    {
        if (trim($current) === '') {
            return 'wrong_current';
        }
        if (mb_strlen(trim($next)) < MIN_PASSWORD_LENGTH) {
            return 'invalid_next';
        }
        if (!self::verifyPassword($db, $current)) {
            return 'wrong_current';
        }
        $hash = password_hash($next, PASSWORD_DEFAULT);
        if ($hash === false) {
            throw new \RuntimeException('Failed to hash password.');
        }
        $db->pdo()->prepare('UPDATE admin_users SET password_hash = :hash')
            ->execute([':hash' => $hash]);
        return 'ok';
    }

    /** Verify a password and, on success, issue a bearer token (12h). */
    public static function login(Database $db, string $password): ?string
    {
        if (!self::verifyPassword($db, $password)) {
            return null;
        }
        $token = bin2hex(random_bytes(32));
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $expires = $now->modify('+' . SESSION_TTL_SECONDS . ' seconds');
        $db->pdo()->prepare(
            'INSERT INTO sessions (token_hash, created_at, expires_at)
             VALUES (:hash, :created, :expires)'
        )->execute([
            ':hash' => hash('sha256', $token),
            ':created' => $now->format('Y-m-d\TH:i:s.v\Z'),
            ':expires' => $expires->format('Y-m-d\TH:i:s.v\Z'),
        ]);
        return $token;
    }

    /** Validate a bearer token (must exist and be unexpired). Prunes expired sessions. */
    public static function authenticate(Database $db, ?string $token): bool
    {
        if ($token === null || $token === '') {
            return false;
        }
        // Best-effort cleanup of expired sessions.
        $db->pdo()->prepare('DELETE FROM sessions WHERE expires_at <= :now')
            ->execute([':now' => eyvan_now_iso()]);
        $stmt = $db->pdo()->prepare(
            'SELECT 1 FROM sessions WHERE token_hash = :hash AND expires_at > :now LIMIT 1'
        );
        $stmt->execute([':hash' => hash('sha256', $token), ':now' => eyvan_now_iso()]);
        return $stmt->fetchColumn() !== false;
    }
}
