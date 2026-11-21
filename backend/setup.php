#!/usr/bin/env php
<?php
/**
 * Eyvan menu backend — first-run admin password setup (CLI).
 *
 * Usage: php backend/setup.php --password '...'
 *        php backend/setup.php            (prompts for the password)
 *
 * Refuses when an admin password already exists (use the admin panel's
 * change-password instead). The web equivalent is POST /api/admin/setup.
 * Config comes from the environment (EYVAN_DB_PATH, EYVAN_APP_DIR, ...);
 * see API.md § Configuration.
 */

declare(strict_types=1);

namespace Eyvan;

use Throwable;

require __DIR__ . '/src/bootstrap.php';

function cli_usage(): void
{
    fwrite(STDERR, "Usage: php setup.php --password '...'\n");
    fwrite(STDERR, "Sets the FIRST admin password. Refuses when one already exists.\n");
}

function cli_prompt_password(): string
{
    fwrite(STDOUT, 'New admin password (min 6 characters): ');
    if (function_exists('readline')) {
        $input = readline('');
    } else {
        $input = fgets(STDIN);
    }
    return $input === false ? '' : rtrim($input, "\r\n");
}

function cli_main(array $argv): int
{
    $password = null;
    $args = array_slice($argv, 1);
    for ($i = 0; $i < count($args); $i++) {
        $arg = $args[$i];
        if ($arg === '--help' || $arg === '-h') {
            cli_usage();
            return 0;
        }
        if ($arg === '--password' && isset($args[$i + 1])) {
            $password = $args[$i + 1];
            $i++;
            continue;
        }
        if (str_starts_with($arg, '--password=')) {
            $password = substr($arg, strlen('--password='));
            continue;
        }
        fwrite(STDERR, "Unknown argument: {$arg}\n");
        cli_usage();
        return 2;
    }

    $appDir = __DIR__;
    try {
        $config = eyvan_config($appDir);
        $db = new Database($config['db_path'], $appDir);
    } catch (Throwable $e) {
        fwrite(STDERR, 'Error: ' . $e->getMessage() . "\n");
        return 1;
    }

    if (Auth::hasPassword($db)) {
        fwrite(STDERR, "An admin password already exists. Use the admin panel to change it.\n");
        return 1;
    }

    if ($password === null) {
        $password = cli_prompt_password();
    }
    if (trim($password) === '' || mb_strlen(trim($password)) < MIN_PASSWORD_LENGTH) {
        fwrite(STDERR, "Password must be at least 6 characters.\n");
        return 1;
    }

    Auth::setInitialPassword($db, $password);
    fwrite(STDOUT, "Admin password set.\n");
    return 0;
}

exit(cli_main($argv));
