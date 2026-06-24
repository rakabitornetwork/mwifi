<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class DatabaseBackupService
{
    public const DISK = 'local';

    public const TEMP_BACKUP_PATH = 'backups/temp';

    public const PRE_UPDATE_BACKUP_PATH = 'backups/pre-update';

    /**
     * @return array<string, mixed>
     */
    public function getDatabaseInfo(): array
    {
        $connection = $this->connectionName();
        $config = Config::get("database.connections.{$connection}", []);
        $driver = $config['driver'] ?? 'unknown';

        return [
            'connection' => $connection,
            'driver' => $driver,
            'driver_label' => match ($driver) {
                'mysql' => 'MySQL',
                'mariadb' => 'MariaDB',
                'sqlite' => 'SQLite',
                default => strtoupper((string) $driver),
            },
            'database' => $this->databaseName($config),
            'host' => $config['host'] ?? null,
            'port' => $config['port'] ?? null,
            'mysqldump_available' => in_array($driver, ['mysql', 'mariadb'], true)
                && $this->findMysqlBinary('mysqldump') !== null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function createBackup(): array
    {
        return $this->createBackupInDirectory(self::TEMP_BACKUP_PATH);
    }

    /**
     * Cadangan permanen sebelum migrasi update — tidak dihapus otomatis.
     * Untuk MySQL/MariaDB, opsional membuat database salinan baru di server.
     *
     * @return array<string, mixed>
     */
    public function createPreUpdateBackup(): array
    {
        $result = $this->createBackupInDirectory(self::PRE_UPDATE_BACKUP_PATH);

        $clone = $this->cloneMysqlDatabaseSnapshot();
        if ($clone !== null) {
            $result['mysql_snapshot_database'] = $clone['database'];
            $result['mysql_source_database'] = $clone['source_database'];
        }

        $info = $this->getDatabaseInfo();
        if ($info['driver'] === 'sqlite') {
            $result['storage_path'] = 'storage/app/' . self::PRE_UPDATE_BACKUP_PATH;
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function createBackupInDirectory(string $directory): array
    {
        $this->ensureBackupDirectory($directory);

        $info = $this->getDatabaseInfo();
        $driver = $info['driver'];
        $timestamp = now()->format('Y-m-d_His');
        $appSlug = preg_replace('/[^a-z0-9\-_]+/i', '-', (string) config('app.name', 'mwifi')) ?: 'mwifi';

        if ($driver === 'sqlite') {
            $filename = "{$appSlug}_sqlite_{$timestamp}.sqlite";
            $filename = $this->createSqliteBackup($filename, $directory);
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            $filename = "{$appSlug}_mysql_{$timestamp}.sql";
            $this->createMysqlBackup($filename, $info, $directory);
        } else {
            throw new \RuntimeException("Driver database \"{$driver}\" belum didukung untuk backup.");
        }

        $path = $directory . '/' . $filename;

        return [
            'filename' => $filename,
            'absolute_path' => Storage::disk(self::DISK)->path($path),
            'relative_path' => $path,
            'size' => Storage::disk(self::DISK)->size($path),
            'size_human' => $this->formatBytes(Storage::disk(self::DISK)->size($path)),
            'created_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * Salin database MySQL/MariaDB aktif ke database baru di server yang sama.
     *
     * @return array{database: string, source_database: string}|null
     */
    public function cloneMysqlDatabaseSnapshot(): ?array
    {
        if (!config('update.clone_mysql_database_before_update', true)) {
            return null;
        }

        $info = $this->getDatabaseInfo();
        if (!in_array($info['driver'], ['mysql', 'mariadb'], true)) {
            return null;
        }

        $connection = $this->connectionName();
        $config = Config::get("database.connections.{$connection}", []);
        $sourceDb = (string) ($config['database'] ?? '');

        if ($sourceDb === '') {
            return null;
        }

        $snapshotDb = $this->generateSnapshotDatabaseName($sourceDb);

        DB::connection($connection)->statement(
            'CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '``', $snapshotDb) . '`'
            . ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        );

        $mysqldump = $this->findMysqlBinary('mysqldump');
        $mysql = $this->findMysqlBinary('mysql');

        if ($mysqldump !== null && $mysql !== null) {
            $this->cloneMysqlViaCli($mysqldump, $mysql, $config, $sourceDb, $snapshotDb);
        } else {
            $tempName = 'clone_' . uniqid('', true) . '.sql';
            $this->ensureBackupDirectory(self::TEMP_BACKUP_PATH);
            $tempPath = Storage::disk(self::DISK)->path(self::TEMP_BACKUP_PATH . '/' . $tempName);

            try {
                $this->createPhpSqlDumpToPath($tempPath);
                $this->importMysqlDumpToDatabase($tempPath, $snapshotDb, $config);
            } finally {
                if (File::exists($tempPath)) {
                    File::delete($tempPath);
                }
            }
        }

        return [
            'database' => $snapshotDb,
            'source_database' => $sourceDb,
        ];
    }

    /**
     * Wipe operational data while preserving administrator accounts and app settings.
     *
     * @return array<string, mixed>
     */
    public function resetApplicationData(User $actingAdmin, ?string $currentSessionId = null): array
    {
        if ($actingAdmin->customer()->exists() || !$actingAdmin->isStaff()) {
            throw new \RuntimeException('Hanya administrator yang dapat mereset database.');
        }

        $preservedAdminIds = User::query()
            ->whereNotNull('role')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (!in_array((int) $actingAdmin->id, $preservedAdminIds, true)) {
            throw new \RuntimeException('Akun administrator tidak valid untuk reset database.');
        }

        $customerUserIds = User::query()
            ->whereHas('customer')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $connection = $this->connectionName();
        $driver = DB::connection($connection)->getDriverName();
        $deleted = [];

        $disableForeignKeys = function () use ($connection, $driver): void {
            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                DB::connection($connection)->statement('SET FOREIGN_KEY_CHECKS=0');
            } elseif ($driver === 'sqlite') {
                DB::connection($connection)->getPdo()->exec('PRAGMA foreign_keys = OFF');
            }
        };

        $enableForeignKeys = function () use ($connection, $driver): void {
            if (in_array($driver, ['mysql', 'mariadb'], true)) {
                DB::connection($connection)->statement('SET FOREIGN_KEY_CHECKS=1');
            } elseif ($driver === 'sqlite') {
                DB::connection($connection)->getPdo()->exec('PRAGMA foreign_keys = ON');
            }
        };

        DB::connection($connection)->transaction(function () use (
            $connection,
            $currentSessionId,
            $customerUserIds,
            $preservedAdminIds,
            &$deleted,
            $disableForeignKeys,
            $enableForeignKeys
        ): void {
            $disableForeignKeys();

            try {
                $deleted['payments'] = $this->deleteAllFromTable('payments');
                $deleted['invoices'] = $this->deleteAllFromTable('invoices');
                $deleted['hotspot_sales'] = $this->deleteAllFromTable('hotspot_sales');
                $deleted['financial_expenses'] = $this->deleteAllFromTable('financial_expenses');
                $deleted['staff_advance_ledgers'] = $this->deleteAllFromTable('staff_advance_ledgers');
                $deleted['hotspot_vouchers'] = $this->deleteAllFromTable('hotspot_vouchers');
                $deleted['billing_activity_logs'] = $this->deleteAllFromTable('billing_activity_logs');
                $deleted['customers'] = $this->deleteAllFromTable('customers');

                $deleted['customer_users'] = 0;
                if ($customerUserIds !== []) {
                    $deleted['customer_users'] = User::query()
                        ->whereIn('id', $customerUserIds)
                        ->whereNotIn('id', $preservedAdminIds)
                        ->count();
                    User::query()
                        ->whereIn('id', $customerUserIds)
                        ->whereNotIn('id', $preservedAdminIds)
                        ->delete();
                }

                $deleted['odps'] = $this->deleteAllFromTable('odps');
                $deleted['inventory_movements'] = $this->deleteAllFromTable('inventory_movements');
                $deleted['inventory_items'] = $this->deleteAllFromTable('inventory_items');
                $deleted['packages'] = $this->deleteAllFromTable('packages');
                $deleted['routers'] = $this->deleteAllFromTable('routers');
                $deleted['jobs'] = $this->deleteAllFromTable('jobs');
                $deleted['failed_jobs'] = $this->deleteAllFromTable('failed_jobs');
                $deleted['job_batches'] = $this->deleteAllFromTable('job_batches');
                $deleted['password_reset_tokens'] = $this->deleteAllFromTable('password_reset_tokens');

                if ($this->tableExists('sessions')) {
                    $sessionQuery = DB::connection($connection)->table('sessions');
                    if ($currentSessionId) {
                        $deleted['sessions'] = (clone $sessionQuery)
                            ->where('id', '!=', $currentSessionId)
                            ->count();
                        (clone $sessionQuery)
                            ->where('id', '!=', $currentSessionId)
                            ->delete();
                    } else {
                        $deleted['sessions'] = $this->deleteAllFromTable('sessions');
                    }
                }
            } finally {
                $enableForeignKeys();
            }
        });

        $preservedAdmins = User::query()
            ->whereIn('id', $preservedAdminIds)
            ->get(['id', 'name', 'email']);

        return [
            'preserved_admin_count' => $preservedAdmins->count(),
            'preserved_admins' => $preservedAdmins
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ])
                ->values()
                ->all(),
            'deleted' => $deleted,
        ];
    }

    private function deleteAllFromTable(string $table): int
    {
        if (!$this->tableExists($table)) {
            return 0;
        }

        $count = DB::connection($this->connectionName())->table($table)->count();
        DB::connection($this->connectionName())->table($table)->delete();

        return $count;
    }

    private function tableExists(string $table): bool
    {
        return DB::connection($this->connectionName())->getSchemaBuilder()->hasTable($table);
    }

    public function restoreFromUpload(UploadedFile $file): void
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: '');
        if (!in_array($extension, ['sql', 'sqlite'], true)) {
            throw new \RuntimeException('Format file tidak didukung. Gunakan .sql atau .sqlite');
        }

        $tempName = 'restore_' . uniqid('', true) . '.' . $extension;
        $tempPath = Storage::disk(self::DISK)->path('backups/temp/' . $tempName);

        File::ensureDirectoryExists(dirname($tempPath));
        $file->move(dirname($tempPath), basename($tempPath));

        try {
            $this->restoreFromPath($tempPath);
        } finally {
            if (File::exists($tempPath)) {
                File::delete($tempPath);
            }
        }
    }

    private function restoreFromPath(string $absolutePath): void
    {
        $extension = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION));
        $driver = $this->getDatabaseInfo()['driver'];

        if ($extension === 'sqlite') {
            if ($driver !== 'sqlite') {
                throw new \RuntimeException('File .sqlite hanya dapat dipulihkan ke database SQLite.');
            }
            $this->restoreSqliteFile($absolutePath);

            return;
        }

        if ($extension === 'sql') {
            if (!in_array($driver, ['mysql', 'mariadb', 'sqlite'], true)) {
                throw new \RuntimeException('File .sql tidak dapat dipulihkan ke driver database saat ini.');
            }

            if ($driver === 'sqlite') {
                $this->restoreSqlDumpToSqlite($absolutePath);

                return;
            }

            $this->restoreMysqlDump($absolutePath);

            return;
        }

        throw new \RuntimeException('Format backup tidak dikenali.');
    }

    private function createSqliteBackup(string $filename, string $directory = self::TEMP_BACKUP_PATH): string
    {
        $config = Config::get('database.connections.' . $this->connectionName(), []);
        $databasePath = $config['database'] ?? '';

        if ($databasePath !== ':memory:' && is_string($databasePath) && File::exists($databasePath)) {
            Storage::disk(self::DISK)->put(
                $directory . '/' . $filename,
                File::get($databasePath)
            );

            return $filename;
        }

        $sqlFilename = preg_replace('/\.sqlite$/', '.sql', $filename) ?: ($filename . '.sql');
        $this->createPhpSqlDump($sqlFilename, $directory);

        return $sqlFilename;
    }

    private function createMysqlBackup(string $filename, array $info, string $directory = self::TEMP_BACKUP_PATH): void
    {
        $mysqldump = $this->findMysqlBinary('mysqldump');

        if ($mysqldump !== null) {
            $this->createMysqlBackupViaCli($filename, $mysqldump, $info, $directory);

            return;
        }

        $this->createPhpSqlDump($filename, $directory);
    }

    /**
     * @param array<string, mixed> $info
     */
    private function createMysqlBackupViaCli(string $filename, string $mysqldump, array $info, string $directory = self::TEMP_BACKUP_PATH): void
    {
        $connection = $this->connectionName();
        $config = Config::get("database.connections.{$connection}", []);
        $target = Storage::disk(self::DISK)->path($directory . '/' . $filename);

        $command = [
            $mysqldump,
            '--single-transaction',
            '--quick',
            '--lock-tables=false',
            '--default-character-set=utf8mb4',
            '--host=' . ($config['host'] ?? '127.0.0.1'),
            '--port=' . ($config['port'] ?? '3306'),
            '--user=' . ($config['username'] ?? 'root'),
            (string) ($config['database'] ?? ''),
        ];

        $env = $_ENV;
        if (!empty($config['password'])) {
            $env['MYSQL_PWD'] = (string) $config['password'];
        }

        $process = new Process($command, null, $env);
        $process->setTimeout(600);
        $process->run();

        if (!$process->isSuccessful()) {
            throw new \RuntimeException('Gagal membuat backup MySQL: ' . trim($process->getErrorOutput() ?: $process->getOutput()));
        }

        File::put($target, $process->getOutput());
    }

    private function createPhpSqlDump(string $filename, string $directory = self::TEMP_BACKUP_PATH): void
    {
        $target = Storage::disk(self::DISK)->path($directory . '/' . $filename);
        $this->createPhpSqlDumpToPath($target);
    }

    private function createPhpSqlDumpToPath(string $absolutePath): void
    {
        File::ensureDirectoryExists(dirname($absolutePath));
        File::put($absolutePath, $this->buildPhpSqlDump());
    }

    private function buildPhpSqlDump(): string
    {
        $driver = DB::connection($this->connectionName())->getDriverName();
        $lines = [
            '-- mWiFi database backup',
            '-- Generated at: ' . now()->toDateTimeString(),
            '-- Driver: ' . $driver,
            '',
        ];

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $lines[] = 'SET FOREIGN_KEY_CHECKS=0;';
            $lines[] = '';
        }

        if ($driver === 'sqlite') {
            $tables = DB::connection($this->connectionName())
                ->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
        } else {
            $tables = DB::connection($this->connectionName())
                ->select('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
        }

        foreach ($tables as $tableRow) {
            $tableName = $this->extractTableName($tableRow, $driver);
            if (!$tableName || $tableName === 'migrations') {
                continue;
            }

            $lines = array_merge($lines, $this->dumpTable($tableName, $driver));
        }

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $lines[] = 'SET FOREIGN_KEY_CHECKS=1;';
        }

        return implode(PHP_EOL, $lines) . PHP_EOL;
    }

    /**
     * @return array<int, string>
     */
    private function dumpTable(string $tableName, string $driver): array
    {
        $connection = $this->connectionName();
        $lines = [
            '',
            '-- Table: ' . $tableName,
        ];

        if ($driver === 'sqlite') {
            $lines[] = 'DROP TABLE IF EXISTS "' . $tableName . '";';
        } else {
            $lines[] = 'DROP TABLE IF EXISTS `' . $tableName . '`;';
        }

        if ($driver === 'sqlite') {
            $create = DB::connection($connection)->selectOne(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?",
                [$tableName]
            );
            if ($create && !empty($create->sql)) {
                $lines[] = $create->sql . ';';
            }
        } else {
            $create = DB::connection($connection)->selectOne('SHOW CREATE TABLE `' . $tableName . '`');
            $createSql = $create->{'Create Table'} ?? $create->{'Create View'} ?? null;
            if ($createSql) {
                $lines[] = $createSql . ';';
            }
        }

        $rows = DB::connection($connection)->table($tableName)->get();
        foreach ($rows as $row) {
            $columns = [];
            $values = [];

            foreach ((array) $row as $column => $value) {
                $columns[] = $driver === 'sqlite' ? '"' . $column . '"' : '`' . $column . '`';
                $values[] = $this->quoteValue($value);
            }

            if ($columns === []) {
                continue;
            }

            $columnList = implode(', ', $columns);
            $valueList = implode(', ', $values);
            $tableRef = $driver === 'sqlite' ? '"' . $tableName . '"' : '`' . $tableName . '`';
            $lines[] = "INSERT INTO {$tableRef} ({$columnList}) VALUES ({$valueList});";
        }

        return $lines;
    }

    private function quoteValue(mixed $value): string
    {
        if ($value === null) {
            return 'NULL';
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return DB::connection($this->connectionName())->getPdo()->quote((string) $value);
    }

    private function restoreMysqlDump(string $absolutePath): void
    {
        $mysql = $this->findMysqlBinary('mysql');

        if ($mysql !== null) {
            $this->restoreMysqlViaCli($absolutePath, $mysql);

            return;
        }

        $this->restoreSqlViaPhp($absolutePath);
    }

    private function restoreMysqlViaCli(string $absolutePath, string $mysql): void
    {
        $connection = $this->connectionName();
        $config = Config::get("database.connections.{$connection}", []);

        $command = [
            $mysql,
            '--default-character-set=utf8mb4',
            '--host=' . ($config['host'] ?? '127.0.0.1'),
            '--port=' . ($config['port'] ?? '3306'),
            '--user=' . ($config['username'] ?? 'root'),
            (string) ($config['database'] ?? ''),
        ];

        $env = $_ENV;
        if (!empty($config['password'])) {
            $env['MYSQL_PWD'] = (string) $config['password'];
        }

        $process = new Process($command, null, $env);
        $process->setInput(File::get($absolutePath));
        $process->setTimeout(600);
        $process->run();

        if (!$process->isSuccessful()) {
            throw new \RuntimeException('Gagal restore MySQL: ' . trim($process->getErrorOutput() ?: $process->getOutput()));
        }
    }

    private function restoreSqlViaPhp(string $absolutePath): void
    {
        $connection = $this->connectionName();
        $driver = DB::connection($connection)->getDriverName();
        $pdo = DB::connection($connection)->getPdo();
        $sql = File::get($absolutePath);
        $statements = preg_split('/;\s*[\r\n]+/', $sql) ?: [];

        if ($driver === 'sqlite') {
            $pdo->exec('PRAGMA foreign_keys = OFF');
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::connection($connection)->statement('SET FOREIGN_KEY_CHECKS=0');
        }

        try {
            foreach ($statements as $statement) {
                $statement = trim($statement);
                if ($statement === '' || str_starts_with($statement, '--')) {
                    continue;
                }

                $pdo->exec($statement);
            }
        } finally {
            if ($driver === 'sqlite') {
                $pdo->exec('PRAGMA foreign_keys = ON');
            } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
                DB::connection($connection)->statement('SET FOREIGN_KEY_CHECKS=1');
            }
        }
    }

    private function restoreSqliteFile(string $absolutePath): void
    {
        $config = Config::get('database.connections.' . $this->connectionName(), []);
        $databasePath = $config['database'] ?? '';

        if (!is_string($databasePath) || $databasePath === ':memory:') {
            throw new \RuntimeException('Restore SQLite tidak tersedia untuk database in-memory.');
        }

        DB::purge($this->connectionName());
        DB::disconnect($this->connectionName());

        File::ensureDirectoryExists(dirname($databasePath));
        File::copy($absolutePath, $databasePath, true);
    }

    private function restoreSqlDumpToSqlite(string $absolutePath): void
    {
        $connection = $this->connectionName();
        $pdo = DB::connection($connection)->getPdo();
        $pdo->exec('PRAGMA foreign_keys = OFF');

        $tables = DB::connection($connection)->select(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name DESC"
        );

        foreach ($tables as $table) {
            $name = $table->name ?? null;
            if ($name) {
                $pdo->exec('DROP TABLE IF EXISTS "' . str_replace('"', '""', $name) . '"');
            }
        }

        try {
            $this->restoreSqlViaPhp($absolutePath);
        } finally {
            $pdo->exec('PRAGMA foreign_keys = ON');
        }
    }

    private function extractTableName(object $row, string $driver): ?string
    {
        if ($driver === 'sqlite') {
            return $row->name ?? null;
        }

        $values = array_values((array) $row);

        return $values[0] ?? null;
    }

    private function connectionName(): string
    {
        return (string) Config::get('database.default', 'sqlite');
    }

    /**
     * @param array<string, mixed> $config
     */
    private function databaseName(array $config): string
    {
        $database = $config['database'] ?? '';

        if (($config['driver'] ?? '') === 'sqlite' && $database === ':memory:') {
            return ':memory:';
        }

        return (string) $database;
    }

    private function ensureBackupDirectory(string $directory): void
    {
        Storage::disk(self::DISK)->makeDirectory($directory);
    }

    private function generateSnapshotDatabaseName(string $sourceDb): string
    {
        $suffix = '_snap_' . now()->format('Ymd_His');
        $base = preg_replace('/[^a-zA-Z0-9_]/', '_', $sourceDb) ?: 'mwifi';
        $maxBaseLength = max(1, 64 - strlen($suffix));

        return substr($base, 0, $maxBaseLength) . $suffix;
    }

    /**
     * @param array<string, mixed> $config
     */
    private function cloneMysqlViaCli(
        string $mysqldump,
        string $mysql,
        array $config,
        string $sourceDb,
        string $snapshotDb
    ): void {
        $dumpCommand = [
            $mysqldump,
            '--single-transaction',
            '--quick',
            '--lock-tables=false',
            '--default-character-set=utf8mb4',
            '--host=' . ($config['host'] ?? '127.0.0.1'),
            '--port=' . ($config['port'] ?? '3306'),
            '--user=' . ($config['username'] ?? 'root'),
            $sourceDb,
        ];

        $importCommand = [
            $mysql,
            '--default-character-set=utf8mb4',
            '--host=' . ($config['host'] ?? '127.0.0.1'),
            '--port=' . ($config['port'] ?? '3306'),
            '--user=' . ($config['username'] ?? 'root'),
            $snapshotDb,
        ];

        $env = $_ENV;
        if (!empty($config['password'])) {
            $env['MYSQL_PWD'] = (string) $config['password'];
        }

        $dumpProcess = new Process($dumpCommand, null, $env);
        $dumpProcess->setTimeout(600);
        $dumpProcess->run();

        if (!$dumpProcess->isSuccessful()) {
            throw new \RuntimeException(
                'Gagal menyalin database MySQL: ' . trim($dumpProcess->getErrorOutput() ?: $dumpProcess->getOutput())
            );
        }

        $importProcess = new Process($importCommand, null, $env);
        $importProcess->setInput($dumpProcess->getOutput());
        $importProcess->setTimeout(600);
        $importProcess->run();

        if (!$importProcess->isSuccessful()) {
            throw new \RuntimeException(
                'Gagal mengimpor salinan database MySQL: ' . trim($importProcess->getErrorOutput() ?: $importProcess->getOutput())
            );
        }
    }

    /**
     * @param array<string, mixed> $config
     */
    private function importMysqlDumpToDatabase(string $absolutePath, string $databaseName, array $config): void
    {
        $mysql = $this->findMysqlBinary('mysql');

        if ($mysql !== null) {
            $command = [
                $mysql,
                '--default-character-set=utf8mb4',
                '--host=' . ($config['host'] ?? '127.0.0.1'),
                '--port=' . ($config['port'] ?? '3306'),
                '--user=' . ($config['username'] ?? 'root'),
                $databaseName,
            ];

            $env = $_ENV;
            if (!empty($config['password'])) {
                $env['MYSQL_PWD'] = (string) $config['password'];
            }

            $process = new Process($command, null, $env);
            $process->setInput(File::get($absolutePath));
            $process->setTimeout(600);
            $process->run();

            if (!$process->isSuccessful()) {
                throw new \RuntimeException(
                    'Gagal mengimpor dump ke database salinan: ' . trim($process->getErrorOutput() ?: $process->getOutput())
                );
            }

            return;
        }

        $connection = $this->connectionName();
        $originalDatabase = (string) ($config['database'] ?? '');
        Config::set("database.connections.{$connection}.database", $databaseName);
        DB::purge($connection);

        try {
            $this->restoreSqlViaPhp($absolutePath);
        } finally {
            Config::set("database.connections.{$connection}.database", $originalDatabase);
            DB::purge($connection);
        }
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }

        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }

        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }

        return $bytes . ' B';
    }

    private function findMysqlBinary(string $binary): ?string
    {
        $binaryFile = PHP_OS_FAMILY === 'Windows' ? $binary . '.exe' : $binary;

        $paths = [];

        if ($custom = env('MYSQL_BIN_PATH')) {
            $paths[] = rtrim($custom, '\\/') . DIRECTORY_SEPARATOR . $binaryFile;
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $laragonRoot = env('LARAGON_ROOT', 'C:\\laragon');
            foreach (glob($laragonRoot . '\\bin\\mysql\\mysql-*\\bin\\' . $binaryFile) ?: [] as $match) {
                $paths[] = $match;
            }
            foreach (glob($laragonRoot . '\\bin\\mariadb\\mariadb-*\\bin\\' . $binaryFile) ?: [] as $match) {
                $paths[] = $match;
            }
        }

        $which = PHP_OS_FAMILY === 'Windows'
            ? shell_exec('where ' . escapeshellarg($binary) . ' 2>nul')
            : shell_exec('which ' . escapeshellarg($binary) . ' 2>/dev/null');

        if (is_string($which) && trim($which) !== '') {
            foreach (preg_split('/\R/', trim($which)) ?: [] as $line) {
                $line = trim($line);
                if ($line !== '') {
                    $paths[] = $line;
                }
            }
        }

        foreach ($paths as $path) {
            if (is_string($path) && File::exists($path)) {
                return $path;
            }
        }

        return null;
    }
}
