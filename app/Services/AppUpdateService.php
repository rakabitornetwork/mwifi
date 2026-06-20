<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
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
            && $composer['ok']
            && $npm['ok']
            && $isRepo
            && $writable
            && ($requirements['is_git_repo']['ok'] ?? false);

        if ($local['dirty'] && !config('update.allow_dirty_tree', false)) {
            $canUpdate = false;
        }

        return [
            'enabled' => (bool) config('update.enabled', true),
            'available' => $canUpdate,
            'requirements' => $requirements,
            'repository' => [
                'url' => $local['remote_url'] ?: $configuredRepo,
                'configured_url' => $configuredRepo,
                'branch' => $resolvedBranch,
                'github_url' => "https://github.com/{$owner}/{$repo}",
            ],
            'local' => $local,
            'remote' => $remote,
            'update_available' => $updateAvailable,
            'behind_count' => $behindCount,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function checkForUpdates(bool $fetch = true): array
    {
        $status = $this->getStatus();
        $branch = (string) ($status['repository']['branch'] ?: config('update.branch', 'main'));

        if ($fetch && ($status['requirements']['git']['ok'] ?? false) && ($status['requirements']['is_git_repo']['ok'] ?? false)) {
            $branch = (string) ($status['repository']['branch'] ?: config('update.branch', 'main'));
            $this->runGit(['fetch', 'origin', $branch], 'Memuat info pembaruan dari GitHub');
            $status = $this->getStatus();
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

        if (!($status['available'] ?? false)) {
            if ($status['local']['dirty'] ?? false) {
                throw new \RuntimeException('Ada perubahan lokal yang belum di-commit. Commit/stash dulu atau set allow_dirty_tree=true di config/update.php.');
            }

            throw new \RuntimeException('Server belum memenuhi syarat pembaruan (Git, Composer, NPM, atau izin folder).');
        }

        if (!($status['update_available'] ?? false)) {
            throw new \RuntimeException('Aplikasi sudah versi terbaru.');
        }

        $branch = (string) ($status['repository']['branch'] ?: config('update.branch', 'main'));
        $steps = [];

        $onLog?->__invoke('Memulai pembaruan mWiFi dari GitHub...', 'info');

        $this->runGit(['fetch', 'origin', $branch], 'Fetch dari GitHub', $steps, $onLog);
        $this->runGit(['pull', 'origin', $branch, '--ff-only'], 'Pull kode terbaru', $steps, $onLog);

        $isProduction = app()->environment('production');
        $composerArgs = ['install', '--no-interaction', '--prefer-dist', '--optimize-autoloader'];
        if ($isProduction) {
            $composerArgs[] = '--no-dev';
        }
        $this->runProcess(array_merge(['composer'], $composerArgs), 'Composer install', $steps, $onLog);

        if (file_exists(base_path('package-lock.json'))) {
            $this->runProcess(['npm', 'ci', '--ignore-scripts'], 'NPM ci', $steps, $onLog);
        } else {
            $this->runProcess(['npm', 'install', '--ignore-scripts'], 'NPM install', $steps, $onLog);
        }

        $this->runProcess(['npm', 'run', 'build'], 'Build frontend (Vite)', $steps, $onLog);

        $this->runProcess([PHP_BINARY, 'artisan', 'migrate', '--force'], 'Migrasi database', $steps, $onLog);
        $this->runProcess([PHP_BINARY, 'artisan', 'optimize:clear'], 'Bersihkan cache', $steps, $onLog);
        $this->runProcess([PHP_BINARY, 'artisan', 'optimize'], 'Optimasi aplikasi', $steps, $onLog);

        if ($isProduction) {
            $this->runProcess([PHP_BINARY, 'artisan', 'config:cache'], 'Cache konfigurasi', $steps, $onLog);
            $this->runProcess([PHP_BINARY, 'artisan', 'route:cache'], 'Cache route', $steps, $onLog);
            $this->runProcess([PHP_BINARY, 'artisan', 'view:cache'], 'Cache view', $steps, $onLog);
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

        return $this->getRemoteGitHubCommit($owner, $repo, $branch);
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

    /**
     * @return array<string, mixed>
     */
    private function getRemoteGitHubCommit(string $owner, string $repo, string $branch): array
    {
        try {
            $request = Http::timeout(15)
                ->withHeaders([
                    'Accept' => 'application/vnd.github+json',
                    'User-Agent' => 'mWiFi-Update-Checker',
                ]);

            $token = config('update.github_token');
            if (is_string($token) && $token !== '') {
                $request = $request->withToken($token);
            }

            $response = $request->get("https://api.github.com/repos/{$owner}/{$repo}/commits/{$branch}");

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
    private function runGit(array $args, ?string $label = null, ?array &$steps = null, ?callable $onLog = null): Process
    {
        return $this->runProcess(array_merge(['git'], $args), $label ?? 'Git', $steps, $onLog);
    }

    /**
     * @param array<int, string> $command
     * @param array<int, string>|null $steps
     * @param callable(string, string): void|null $onLog
     */
    private function runProcess(array $command, string $label, ?array &$steps = null, ?callable $onLog = null): Process
    {
        $onLog?->__invoke('$ ' . $this->formatCommand($command), 'cmd');
        $onLog?->__invoke('→ ' . $label, 'info');

        $process = new Process($command, base_path());
        $process->setTimeout((int) config('update.timeout', 600));
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
