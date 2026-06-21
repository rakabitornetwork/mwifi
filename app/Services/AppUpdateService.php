<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;

class AppUpdateService
{
    /**
     * @return array<string, mixed>
     */
    public function getStatus(): array
    {
        $configuredRepo = (string) config('update.repository');
        $branch = (string) config('update.branch', 'main');
        $owner = (string) config('update.github_owner');
        $repo = (string) config('update.github_repo');

        $git = $this->getGitRequirement();
        $composer = $this->getBinaryRequirement('composer', 'Composer');
        $npm = $this->getBinaryRequirement('npm', 'NPM');
        $isRepo = $this->isGitRepository();
        $writable = $this->isProjectWritable();

        $local = $isRepo && $git['ok']
            ? $this->getLocalGitInfo($branch)
            : $this->emptyLocalInfo();

        $resolvedBranch = $this->resolveBranch(
            (string) ($local['branch'] ?? ''),
            $branch,
            $isRepo && $git['ok']
        );

        $remote = $this->getRemoteInfo($resolvedBranch, $isRepo && $git['ok'], $owner, $repo);

        $updateAvailable = false;
        $behindCount = 0;

        if (!empty($local['commit']) && !empty($remote['commit'])) {
            if ($local['commit'] !== $remote['commit']) {
                $updateAvailable = true;
                if ($isRepo && $git['ok']) {
                    $behindCount = $this->countCommitsBehind($resolvedBranch);
                } else {
                    $behindCount = 1;
                }
            }
        }

        $requirements = [
            'git' => $git,
            'composer' => $composer,
            'npm' => $npm,
            'php_cli' => $this->getPhpCliRequirement(),
            'is_git_repo' => [
                'ok' => $isRepo,
                'message' => $isRepo ? 'Folder aplikasi terdeteksi sebagai repositori Git.' : 'Folder aplikasi bukan repositori Git.',
            ],
            'writable' => [
                'ok' => $writable,
                'message' => $writable
                    ? 'Folder aplikasi dapat ditulis (pull/build).'
                    : 'Folder aplikasi tidak dapat ditulis. Periksa izin file.',
            ],
        ];

        $canUpdate = (bool) config('update.enabled', true)
            && $git['ok']
            && ($requirements['php_cli']['ok'] ?? false)
            && (!config('update.run_composer_on_update', false) || $composer['ok'])
            && (!config('update.run_npm_on_update', false) || $npm['ok'])
            && $isRepo
            && $writable
            && ($requirements['is_git_repo']['ok'] ?? false);

        if ($local['dirty'] && !config('update.allow_dirty_tree', false)) {
            $canUpdate = false;
        }

        $remoteReadable = !empty($remote['commit']);
        $canRunUpdate = (bool) config('update.enabled', true)
            && $updateAvailable
            && $remoteReadable
            && $git['ok']
            && ($requirements['php_cli']['ok'] ?? false)
            && $isRepo;

        $remoteVersionInfo = $this->getLatestGitHubVersion($owner, $repo, $isRepo && $git['ok']);
        $localVersionInfo = $this->resolveLocalVersionInfo($isRepo && $git['ok']);

        return [
            'enabled' => (bool) config('update.enabled', true),
            'available' => $canUpdate,
            'can_run_update' => $canRunUpdate,
            'requirements' => $requirements,
            'repository' => [
                'url' => $local['remote_url'] ?: $configuredRepo,
                'configured_url' => $configuredRepo,
                'branch' => $resolvedBranch,
                'github_url' => "https://github.com/{$owner}/{$repo}",
            ],
            'local' => array_merge($local, [
                'tag' => $localVersionInfo['tag'],
                'describe' => $localVersionInfo['describe'],
                'commits_since_tag' => $localVersionInfo['commits_since_tag'],
            ]),
            'remote' => $remote,
            'update_available' => $updateAvailable,
            'behind_count' => $behindCount,
            'release' => [
                'version' => $localVersionInfo['version'],
                'label' => $localVersionInfo['label'],
                'source' => $localVersionInfo['source'],
                'tag' => $localVersionInfo['tag'],
                'commits_since_tag' => $localVersionInfo['commits_since_tag'],
                'is_latest' => $remoteReadable ? !$updateAvailable : null,
                'remote_version' => $remoteVersionInfo['version'],
                'remote_version_source' => $remoteVersionInfo['source'],
            ],
        ];
    }

    /**
     * Status cepat untuk muat halaman (tanpa git fetch). Pakai cache bila ada.
     *
     * @return array<string, mixed>
     */
    public function getCachedStatus(): array
    {
        $ttl = max(0, (int) config('update.status_cache_seconds', 120));

        if ($ttl === 0) {
            return $this->getStatus();
        }

        return Cache::remember('app_update_status', $ttl, fn () => $this->getStatus());
    }

    public function forgetCachedStatus(): void
    {
        Cache::forget('app_update_status');
    }

    /**
     * @return array<string, mixed>
     */
    public function checkForUpdates(bool $fetch = true): array
    {
        $this->forgetCachedStatus();

        $status = $this->getStatus();
        $branch = (string) ($status['repository']['branch'] ?: config('update.branch', 'main'));

        if ($fetch && ($status['requirements']['git']['ok'] ?? false) && ($status['requirements']['is_git_repo']['ok'] ?? false)) {
            $branch = (string) ($status['repository']['branch'] ?: config('update.branch', 'main'));
            $fetchTimeout = max(15, (int) config('update.fetch_timeout', 45));
            $fetchSteps = null;
            $this->runGit(
                ['fetch', 'origin', $branch],
                'Memuat info pembaruan dari GitHub',
                $fetchSteps,
                null,
                $fetchTimeout
            );
            $status = $this->getStatus();
        }

        $ttl = max(0, (int) config('update.status_cache_seconds', 120));
        if ($ttl > 0) {
            Cache::put('app_update_status', $status, $ttl);
        }

        return $status;
    }

    /**
     * @param  callable(string, string): void|null  $onLog  (line, type: info|cmd|stdout|stderr|success|error)
     * @return array{message: string, steps: array<int, string>}
     */
    public function runUpdate(?callable $onLog = null): array
    {
        if (!config('update.enabled', true)) {
            throw new \RuntimeException('Pembaruan aplikasi dinonaktifkan di konfigurasi.');
        }

        $status = $this->checkForUpdates(true);

        if (!($status['enabled'] ?? true)) {
            throw new \RuntimeException('Pembaruan aplikasi dinonaktifkan di konfigurasi.');
        }

        if (!($status['update_available'] ?? false)) {
            throw new \RuntimeException('Aplikasi sudah versi terbaru.');
        }

        if (!($status['can_run_update'] ?? false)) {
            if (!($status['requirements']['git']['ok'] ?? false) || !($status['requirements']['is_git_repo']['ok'] ?? false)) {
                throw new \RuntimeException('Git tidak tersedia atau folder aplikasi bukan repositori Git.');
            }

            throw new \RuntimeException('Versi GitHub belum dapat dibaca. Muat ulang halaman update lalu coba lagi.');
        }

        $branch = (string) ($status['repository']['branch'] ?: config('update.branch', 'main'));
        $steps = [];

        $onLog?->__invoke('Memulai pembaruan mWiFi dari GitHub...', 'info');

        $this->syncGitFromRemote($branch, $steps, $onLog);

        $isProduction = app()->environment('production');

        if (config('update.run_composer_on_update', false)) {
            $composerArgs = ['install', '--no-interaction', '--prefer-dist', '--optimize-autoloader'];
            if ($isProduction) {
                $composerArgs[] = '--no-dev';
            }
            $this->runProcess(array_merge(['composer'], $composerArgs), 'Composer install', $steps, $onLog);
        } else {
            $onLog?->__invoke('Lewati Composer — jalankan composer install manual jika ada dependency PHP baru.', 'info');
            $steps[] = 'Composer install dilewati ✓';
        }

        if (config('update.run_npm_on_update', false)) {
            if (file_exists(base_path('package-lock.json'))) {
                $this->runProcess(['npm', 'ci', '--ignore-scripts'], 'NPM ci', $steps, $onLog);
            } else {
                $this->runProcess(['npm', 'install', '--ignore-scripts'], 'NPM install', $steps, $onLog);
            }

            $this->runProcess(['npm', 'run', 'build'], 'Build frontend (Vite)', $steps, $onLog);
        } else {
            $onLog?->__invoke('Lewati NPM — public/build sudah dibuild di lokal dan di-commit ke Git.', 'info');
            $steps[] = 'NPM build dilewati ✓';
        }

        $phpCli = $this->resolveCliPhpBinary();
        $onLog?->__invoke("Menggunakan PHP CLI: {$phpCli}", 'info');

        if (config('update.backup_database_before_update', true)) {
            $this->backupDatabaseBeforeMigrate($steps, $onLog);
        }

        $this->runProcess([$phpCli, 'artisan', 'migrate', '--force'], 'Migrasi database', $steps, $onLog);
        $this->runProcess([$phpCli, 'artisan', 'optimize:clear'], 'Bersihkan cache', $steps, $onLog);
        $this->runProcess([$phpCli, 'artisan', 'optimize'], 'Optimasi aplikasi', $steps, $onLog);

        if ($isProduction) {
            $this->runProcess([$phpCli, 'artisan', 'config:cache'], 'Cache konfigurasi', $steps, $onLog);
            $this->runProcess([$phpCli, 'artisan', 'route:cache'], 'Cache route', $steps, $onLog);
            $this->runProcess([$phpCli, 'artisan', 'view:cache'], 'Cache view', $steps, $onLog);
        }

        $newStatus = $this->getStatus();
        $version = $newStatus['local']['commit_short'] ?? 'terbaru';
        $message = "Pembaruan berhasil. Versi lokal sekarang {$version}. Refresh halaman jika UI belum berubah.";

        $onLog?->__invoke($message, 'success');

        return [
            'message' => $message,
            'steps' => $steps,
        ];
    }

    /**
     * @param array<int, string>|null $steps
     * @param callable(string, string): void|null $onLog
     */
    private function backupDatabaseBeforeMigrate(?array &$steps, ?callable $onLog = null): void
    {
        $onLog?->__invoke('Membuat cadangan database sebelum migrasi...', 'info');

        $backup = app(DatabaseBackupService::class)->createPreUpdateBackup();

        $onLog?->__invoke(
            "File cadangan: {$backup['filename']} ({$backup['size_human']}) — {$backup['relative_path']}",
            'success'
        );

        if (!empty($backup['mysql_snapshot_database'])) {
            $source = $backup['mysql_source_database'] ?? 'aktif';
            $onLog?->__invoke(
                "Database salinan MySQL dibuat: {$backup['mysql_snapshot_database']} (database \"{$source}\" tetap utuh)",
                'success'
            );
        } elseif (($backup['storage_path'] ?? null) !== null) {
            $onLog?->__invoke(
                'Salinan file SQLite disimpan — database aktif tidak diganti, hanya dicadangkan.',
                'success'
            );
        }

        $steps[] = 'Cadangan database: ' . $backup['filename'] . ' ✓';

        if (!empty($backup['mysql_snapshot_database'])) {
            $steps[] = 'Salinan MySQL: ' . $backup['mysql_snapshot_database'] . ' ✓';
        }
    }

    /**
     * @param array<int, string>|null $steps
     * @param callable(string, string): void|null $onLog
     */
    private function syncGitFromRemote(string $branch, ?array &$steps = null, ?callable $onLog = null): void
    {
        $this->runGit(['fetch', 'origin', $branch], 'Fetch dari GitHub', $steps, $onLog);

        if (config('update.pull_strategy', 'hard_reset') === 'ff_only') {
            $this->runGit(['pull', 'origin', $branch, '--ff-only'], 'Pull kode terbaru', $steps, $onLog);

            return;
        }

        $onLog?->__invoke(
            'Menyesuaikan file lokal ke versi GitHub (perubahan lokal pada file Git akan diganti).',
            'info'
        );
        $this->runGit(['reset', '--hard', "origin/{$branch}"], 'Sinkronkan ke versi GitHub', $steps, $onLog);
    }

    /**
     * @return array<string, mixed>
     */
    private function getLocalGitInfo(string $defaultBranch): array
    {
        $branchProcess = $this->runGit(['branch', '--show-current']);
        $branch = trim($branchProcess->getOutput()) ?: $defaultBranch;

        $remoteProcess = $this->runGit(['remote', 'get-url', 'origin']);
        $remoteUrl = $remoteProcess->isSuccessful() ? trim($remoteProcess->getOutput()) : null;

        $commit = $this->parseCommitLog('HEAD');

        $statusProcess = $this->runGit(['status', '--porcelain']);
        $dirtyLines = array_filter(explode("\n", trim($statusProcess->getOutput())));

        return [
            'commit' => $commit['commit'] ?? null,
            'commit_short' => $commit['commit_short'] ?? null,
            'commit_date' => $commit['commit_date'] ?? null,
            'commit_message' => $commit['commit_message'] ?? null,
            'branch' => $branch,
            'remote_url' => $remoteUrl,
            'dirty' => count($dirtyLines) > 0,
            'dirty_files_count' => count($dirtyLines),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyLocalInfo(): array
    {
        return [
            'commit' => null,
            'commit_short' => null,
            'commit_date' => null,
            'commit_message' => null,
            'branch' => (string) config('update.branch', 'main'),
            'remote_url' => (string) config('update.repository'),
            'dirty' => false,
            'dirty_files_count' => 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function getRemoteInfo(string $branch, bool $canUseGit, string $owner, string $repo): array
    {
        if ($canUseGit) {
            $fromGit = $this->getRemoteFromGit($branch);
            if ($fromGit !== null) {
                return $fromGit;
            }
        }

        // GitHub API lebih cepat daripada git ls-remote untuk muat halaman.
        $fromApi = $this->getRemoteGitHubCommit($owner, $repo, $branch);
        if (!empty($fromApi['commit'])) {
            return $fromApi;
        }

        if ($canUseGit) {
            $fromLsRemote = $this->getRemoteFromLsRemote($branch);
            if ($fromLsRemote !== null) {
                return $fromLsRemote;
            }
        }

        return $fromApi;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getRemoteFromLsRemote(string $branch): ?array
    {
        $process = $this->runGit(['ls-remote', 'origin', "refs/heads/{$branch}"]);
        if (!$process->isSuccessful()) {
            return null;
        }

        $line = trim(strtok($process->getOutput(), "\n"));
        if ($line === '') {
            return null;
        }

        [$fullHash] = preg_split('/\s+/', $line) ?: [];
        if (!is_string($fullHash) || strlen($fullHash) < 7) {
            return null;
        }

        return [
            'commit' => $fullHash,
            'commit_short' => substr($fullHash, 0, 7),
            'commit_date' => null,
            'commit_message' => 'Commit terbaru branch ' . $branch,
            'author' => null,
            'source' => 'git_ls_remote',
            'error' => null,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getRemoteFromGit(string $branch): ?array
    {
        $ref = "origin/{$branch}";
        $verify = $this->runGit(['rev-parse', '--verify', $ref]);
        if (!$verify->isSuccessful()) {
            return null;
        }

        $commit = $this->parseCommitLog($ref);
        if ($commit === null) {
            return null;
        }

        return [
            'commit' => $commit['commit'],
            'commit_short' => $commit['commit_short'],
            'commit_date' => $commit['commit_date'],
            'commit_message' => $commit['commit_message'],
            'author' => null,
            'source' => 'git',
            'error' => null,
        ];
    }

    private function resolveBranch(string $localBranch, string $configuredBranch, bool $canUseGit): string
    {
        if ($canUseGit && $localBranch !== '') {
            $verify = $this->runGit(['rev-parse', '--verify', "origin/{$localBranch}"]);
            if ($verify->isSuccessful()) {
                return $localBranch;
            }
        }

        return $configuredBranch;
    }

    private function getLatestGitHubReleaseVersion(string $owner, string $repo): ?string
    {
        try {
            $response = $this->githubApiRequest($owner, $repo)->get("https://api.github.com/repos/{$owner}/{$repo}/releases/latest");

            if (!$response->successful()) {
                return null;
            }

            $tagName = $response->json('tag_name');
            if (!is_string($tagName) || $tagName === '') {
                return null;
            }

            return $this->normalizeVersionTag($tagName);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array{version: ?string, source: ?string}
     */
    private function getLatestGitHubVersion(string $owner, string $repo, bool $canUseGit): array
    {
        $fromRelease = $this->getLatestGitHubReleaseVersion($owner, $repo);
        if ($fromRelease !== null) {
            return [
                'version' => $fromRelease,
                'source' => 'github_release',
            ];
        }

        $fromTagApi = $this->getLatestGitHubTagVersion($owner, $repo);
        if ($fromTagApi !== null) {
            return [
                'version' => $fromTagApi,
                'source' => 'github_tag',
            ];
        }

        if ($canUseGit) {
            $fromGitTags = $this->getLatestRemoteTagFromGit();
            if ($fromGitTags !== null) {
                return [
                    'version' => $fromGitTags,
                    'source' => 'git_remote_tag',
                ];
            }
        }

        return [
            'version' => null,
            'source' => null,
        ];
    }

    private function getLatestGitHubTagVersion(string $owner, string $repo): ?string
    {
        try {
            $response = $this->githubApiRequest($owner, $repo)->get(
                "https://api.github.com/repos/{$owner}/{$repo}/tags",
                ['per_page' => 100]
            );

            if (!$response->successful()) {
                return null;
            }

            return $this->pickHighestSemverVersion(
                collect($response->json())
                    ->pluck('name')
                    ->filter(fn ($name) => is_string($name) && $name !== '')
                    ->all()
            );
        } catch (\Throwable) {
            return null;
        }
    }

    private function getLatestRemoteTagFromGit(): ?string
    {
        $process = $this->runGit(['ls-remote', '--tags', 'origin']);
        if (!$process->isSuccessful()) {
            return null;
        }

        $tagNames = [];
        foreach (preg_split('/\R/', trim($process->getOutput())) ?: [] as $line) {
            if (!preg_match('/refs\/tags\/(.+)$/', $line, $matches)) {
                continue;
            }

            $tag = trim($matches[1]);
            if ($tag === '' || str_ends_with($tag, '^{}')) {
                continue;
            }

            $tagNames[] = $tag;
        }

        return $this->pickHighestSemverVersion($tagNames);
    }

    /**
     * @param  list<string>  $tagNames
     */
    private function pickHighestSemverVersion(array $tagNames): ?string
    {
        $best = null;

        foreach ($tagNames as $tagName) {
            $normalized = $this->normalizeVersionTag($tagName);
            if ($normalized === null) {
                continue;
            }

            if ($best === null || version_compare($normalized, $best, '>')) {
                $best = $normalized;
            }
        }

        return $best;
    }

    private function normalizeVersionTag(string $tagName): ?string
    {
        $tagName = ltrim(trim($tagName), 'vV');
        if ($tagName === '' || !preg_match('/^\d+(?:\.\d+)*$/', $tagName)) {
            return null;
        }

        return $tagName;
    }

    /**
     * @return array{
     *     version: string,
     *     label: string,
     *     tag: ?string,
     *     describe: ?string,
     *     commits_since_tag: int,
     *     source: string
     * }
     */
    private function resolveLocalVersionInfo(bool $canUseGit): array
    {
        $fallback = (string) config('update.app_version', '1.0');

        if (!$canUseGit) {
            return [
                'version' => $fallback,
                'label' => $fallback,
                'tag' => null,
                'describe' => null,
                'commits_since_tag' => 0,
                'source' => 'config',
            ];
        }

        $describeProcess = $this->runGit(['describe', '--tags', '--always']);
        if (!$describeProcess->isSuccessful()) {
            return [
                'version' => $fallback,
                'label' => $fallback,
                'tag' => null,
                'describe' => null,
                'commits_since_tag' => 0,
                'source' => 'config',
            ];
        }

        $describe = trim($describeProcess->getOutput());
        if ($describe === '') {
            return [
                'version' => $fallback,
                'label' => $fallback,
                'tag' => null,
                'describe' => null,
                'commits_since_tag' => 0,
                'source' => 'config',
            ];
        }

        if (preg_match('/^v?(\d+(?:\.\d+)*)(?:-(\d+)-g[0-9a-f]+)?$/i', $describe, $matches)) {
            $tag = $matches[1];
            $commitsSinceTag = isset($matches[2]) ? (int) $matches[2] : 0;
            $label = $commitsSinceTag > 0 ? "{$tag} (+{$commitsSinceTag})" : $tag;

            return [
                'version' => $tag,
                'label' => $label,
                'tag' => $tag,
                'describe' => $describe,
                'commits_since_tag' => $commitsSinceTag,
                'source' => 'git_tag',
            ];
        }

        $exactTagProcess = $this->runGit(['describe', '--tags', '--exact-match']);
        if ($exactTagProcess->isSuccessful()) {
            $tag = $this->normalizeVersionTag(trim($exactTagProcess->getOutput()));
            if ($tag !== null) {
                return [
                    'version' => $tag,
                    'label' => $tag,
                    'tag' => $tag,
                    'describe' => $describe,
                    'commits_since_tag' => 0,
                    'source' => 'git_tag',
                ];
            }
        }

        return [
            'version' => $fallback,
            'label' => $fallback,
            'tag' => null,
            'describe' => $describe,
            'commits_since_tag' => 0,
            'source' => 'config',
        ];
    }

    private function githubApiRequest(string $owner, string $repo): \Illuminate\Http\Client\PendingRequest
    {
        $request = Http::timeout(8)
            ->withHeaders([
                'Accept' => 'application/vnd.github+json',
                'User-Agent' => 'mWiFi-Update-Checker',
            ]);

        $token = config('update.github_token');
        if (is_string($token) && $token !== '') {
            $request = $request->withToken($token);
        }

        return $request;
    }

    /**
     * @return array<string, mixed>
     */
    private function getRemoteGitHubCommit(string $owner, string $repo, string $branch): array
    {
        try {
            $response = $this->githubApiRequest($owner, $repo)->get("https://api.github.com/repos/{$owner}/{$repo}/commits/{$branch}");

            if (!$response->successful()) {
                $message = $response->json('message') ?? 'Gagal memuat commit dari GitHub API.';

                return array_merge($this->emptyRemoteInfo(), [
                    'source' => 'github_api',
                    'error' => $message,
                ]);
            }

            $data = $response->json();
            $commit = is_array($data['commit'] ?? null) ? $data['commit'] : [];

            return [
                'commit' => $data['sha'] ?? null,
                'commit_short' => isset($data['sha']) ? substr((string) $data['sha'], 0, 7) : null,
                'commit_date' => $commit['committer']['date'] ?? null,
                'commit_message' => isset($commit['message']) ? strtok((string) $commit['message'], "\n") : null,
                'author' => $commit['author']['name'] ?? null,
                'source' => 'github_api',
                'error' => null,
            ];
        } catch (\Throwable $e) {
            return array_merge($this->emptyRemoteInfo(), [
                'source' => 'github_api',
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyRemoteInfo(): array
    {
        return [
            'commit' => null,
            'commit_short' => null,
            'commit_date' => null,
            'commit_message' => null,
            'author' => null,
            'source' => null,
            'error' => null,
        ];
    }

    /**
     * @return array<string, string|null>|null
     */
    private function parseCommitLog(string $ref): ?array
    {
        $process = $this->runGit(['log', '-1', '--format=%H|%h|%s|%ci', $ref]);
        if (!$process->isSuccessful()) {
            return null;
        }

        $parts = explode('|', trim($process->getOutput()), 4);
        if (count($parts) < 4) {
            return null;
        }

        return [
            'commit' => $parts[0],
            'commit_short' => $parts[1],
            'commit_message' => $parts[2],
            'commit_date' => $parts[3],
        ];
    }

    private function countCommitsBehind(string $branch): int
    {
        $ref = "origin/{$branch}";
        $verify = $this->runGit(['rev-parse', '--verify', $ref]);
        if (!$verify->isSuccessful()) {
            return 1;
        }

        $process = $this->runGit(['rev-list', '--count', "HEAD..{$ref}"]);
        if (!$process->isSuccessful()) {
            return 1;
        }

        return max(0, (int) trim($process->getOutput()));
    }

    /**
     * Resolve PHP CLI binary for artisan commands (not php-fpm).
     */
    public function resolveCliPhpBinary(): string
    {
        $configured = trim((string) config('update.php_cli_binary', ''));
        if ($configured !== '') {
            if (str_contains(strtolower($configured), 'fpm')) {
                throw new \RuntimeException(
                    'php_cli_binary tidak boleh menunjuk ke php-fpm. Gunakan PHP CLI, mis. /usr/bin/php8.4'
                );
            }

            if (!is_executable($configured)) {
                throw new \RuntimeException("PHP CLI tidak dapat dieksekusi: {$configured}");
            }

            return $configured;
        }

        $phpBinary = PHP_BINARY;
        if ($phpBinary !== '' && is_executable($phpBinary) && !str_contains(strtolower($phpBinary), 'fpm')) {
            return $phpBinary;
        }

        foreach ([
            '/usr/bin/php8.4',
            '/usr/bin/php84',
            '/usr/bin/php8.3',
            '/usr/bin/php83',
            '/usr/bin/php8.2',
            '/usr/bin/php',
        ] as $candidate) {
            if (is_executable($candidate) && !str_contains(strtolower($candidate), 'fpm')) {
                return $candidate;
            }
        }

        foreach (['php8.4', 'php84', 'php8.3', 'php83', 'php'] as $command) {
            $process = new Process(PHP_OS_FAMILY === 'Windows'
                ? ['where', $command]
                : ['which', $command]);
            $process->run();

            if (!$process->isSuccessful()) {
                continue;
            }

            foreach (preg_split('/\R/', trim($process->getOutput())) ?: [] as $line) {
                $path = trim($line);
                if ($path === '' || !is_executable($path) || str_contains(strtolower($path), 'fpm')) {
                    continue;
                }

                return $path;
            }
        }

        throw new \RuntimeException(
            'PHP CLI tidak ditemukan. Server web memakai php-fpm — set php_cli_binary di config/update.php (mis. /usr/bin/php8.4).'
        );
    }

    /**
     * @return array{ok: bool, message: string, version: string|null, path: string|null}
     */
    private function getPhpCliRequirement(): array
    {
        try {
            $binary = $this->resolveCliPhpBinary();
            $process = new Process([$binary, '--version']);
            $process->setTimeout(30);
            $process->run();

            if (!$process->isSuccessful()) {
                return [
                    'ok' => false,
                    'message' => 'PHP CLI ditemukan tetapi gagal dijalankan.',
                    'version' => null,
                    'path' => $binary,
                ];
            }

            $output = trim($process->getOutput() ?: $process->getErrorOutput());

            return [
                'ok' => true,
                'message' => 'PHP CLI tersedia untuk migrate/optimize.',
                'version' => $output !== '' ? strtok($output, "\n") : null,
                'path' => $binary,
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => $e->getMessage(),
                'version' => null,
                'path' => null,
            ];
        }
    }

    /**
     * @return array{ok: bool, message: string, version: string|null}
     */
    private function getGitRequirement(): array
    {
        $process = new Process(['git', '--version']);
        $process->setTimeout(30);
        $process->run();

        if (!$process->isSuccessful()) {
            return [
                'ok' => false,
                'message' => 'Git tidak ditemukan di PATH server.',
                'version' => null,
            ];
        }

        return [
            'ok' => true,
            'message' => 'Git tersedia.',
            'version' => trim($process->getOutput()),
        ];
    }

    /**
     * @return array{ok: bool, message: string, version: string|null}
     */
    private function getBinaryRequirement(string $binary, string $label): array
    {
        $process = new Process([$binary, '--version']);
        $process->setTimeout(30);
        $process->run();

        if (!$process->isSuccessful()) {
            return [
                'ok' => false,
                'message' => "{$label} tidak ditemukan di PATH server.",
                'version' => null,
            ];
        }

        $output = trim($process->getOutput() ?: $process->getErrorOutput());

        return [
            'ok' => true,
            'message' => "{$label} tersedia.",
            'version' => $output !== '' ? strtok($output, "\n") : null,
        ];
    }

    private function isGitRepository(): bool
    {
        $process = $this->runGit(['rev-parse', '--is-inside-work-tree']);

        return $process->isSuccessful() && trim($process->getOutput()) === 'true';
    }

    private function isProjectWritable(): bool
    {
        return is_writable(base_path()) && is_writable(storage_path()) && is_writable(base_path('bootstrap/cache'));
    }

    /**
     * @param array<int, string> $args
     */
    private function runGit(array $args, ?string $label = null, ?array &$steps = null, ?callable $onLog = null, ?int $timeout = null): Process
    {
        return $this->runProcess(array_merge(['git'], $args), $label ?? 'Git', $steps, $onLog, $timeout);
    }

    /**
     * @param array<int, string> $command
     * @param array<int, string>|null $steps
     * @param callable(string, string): void|null $onLog
     */
    private function runProcess(array $command, string $label, ?array &$steps = null, ?callable $onLog = null, ?int $timeout = null): Process
    {
        $onLog?->__invoke('$ ' . $this->formatCommand($command), 'cmd');
        $onLog?->__invoke('→ ' . $label, 'info');

        $process = new Process($command, base_path());
        $process->setTimeout($timeout ?? (int) config('update.timeout', 600));
        $process->run(function ($type, $buffer) use ($onLog) {
            if (!$onLog) {
                return;
            }

            foreach (preg_split('/\r?\n/', $buffer) ?: [] as $line) {
                $line = rtrim($line, "\r");
                if ($line === '') {
                    continue;
                }

                $onLog($line, $type === Process::ERR ? 'stderr' : 'stdout');
            }
        });

        if ($steps !== null) {
            $steps[] = $label . ($process->isSuccessful() ? ' ✓' : ' ✗');
        }

        if (!$process->isSuccessful()) {
            $error = trim($process->getErrorOutput() ?: $process->getOutput());
            $onLog?->__invoke('✗ ' . $label . ': ' . ($error ?: 'Proses gagal.'), 'error');
            throw new \RuntimeException("Gagal pada langkah \"{$label}\": " . ($error ?: 'Proses gagal.'));
        }

        $onLog?->__invoke('✓ ' . $label, 'success');

        return $process;
    }

    /**
     * @param array<int, string> $command
     */
    private function formatCommand(array $command): string
    {
        return implode(' ', array_map(function (string $part): string {
            if ($part === '') {
                return "''";
            }

            if (preg_match('/^[A-Za-z0-9_@%+=:,.\/-]+$/', $part)) {
                return $part;
            }

            return escapeshellarg($part);
        }, $command));
    }
}
