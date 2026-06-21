import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { ArrowUpCircle, GitBranch, RefreshCw } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';

function toTerminalSessionLabel(name) {
    const slug = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug ? `${slug}-update` : 'app-update';
}

function UpdatePageContent({ appUpdateInfo: initialUpdateInfo = {} }) {
    const { branding = {} } = usePage().props;
    const companyName = branding.company_name || branding.display_name || branding.app_name || 'mWiFi';
    const terminalSessionLabel = toTerminalSessionLabel(companyName);
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const [updateInfo, setUpdateInfo] = useState(initialUpdateInfo);
    const [isCheckingRemote, setIsCheckingRemote] = useState(false);
    const [isRunningUpdate, setIsRunningUpdate] = useState(false);
    const [updateTerminalLines, setUpdateTerminalLines] = useState([]);
    const [updateTerminalStatus, setUpdateTerminalStatus] = useState('idle');
    const updateTerminalRef = useRef(null);
    const updateFinishedRef = useRef(false);

    const canRunAppUpdate = Boolean(
        updateInfo.can_run_update
        ?? (
            updateInfo.update_available
            && updateInfo.enabled !== false
            && updateInfo.remote?.commit
        )
    );

    const refreshRemoteStatus = async (fetchFromGit = true) => {
        setIsCheckingRemote(true);
        try {
            const url = fetchFromGit ? '/admin/update/status?fetch=1' : '/admin/update/status';
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error(`Gagal memuat status (${response.status}).`);
            }

            const data = await response.json();
            if (data?.error) {
                throw new Error(data.error);
            }

            setUpdateInfo(data);
        } catch (error) {
            showToast(error?.message || 'Gagal memeriksa pembaruan dari GitHub.', 'error');
        } finally {
            setIsCheckingRemote(false);
        }
    };

    useEffect(() => {
        refreshRemoteStatus(true);
    }, []);

    useEffect(() => {
        setUpdateInfo(initialUpdateInfo);
    }, [initialUpdateInfo]);

    useEffect(() => {
        if (updateTerminalRef.current) {
            updateTerminalRef.current.scrollTop = updateTerminalRef.current.scrollHeight;
        }
    }, [updateTerminalLines, updateTerminalStatus]);

    const handleRunUpdate = async () => {
        if (!canRunAppUpdate) {
            return;
        }

        if (!confirm(
            'Pembaruan akan menarik kode terbaru dari GitHub, membuat cadangan database otomatis, lalu migrasi dan optimasi cache.\n\n' +
            'Database lama tidak dihapus — file cadangan disimpan di storage/app/backups/pre-update/' +
            ' (MySQL: salinan database baru juga dibuat di server).\n\n' +
            'Composer & NPM tidak dijalankan di server — pastikan vendor/public/build sudah di-commit dari lokal.\n\n' +
            'Proses bisa memakan beberapa menit.\n\nLanjutkan?'
        )) return;

        setIsRunningUpdate(true);
        updateFinishedRef.current = false;
        setUpdateTerminalStatus('running');
        setUpdateTerminalLines([
            { text: 'Menghubungkan ke server update...', type: 'info' },
        ]);

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const appendLine = (line, type = 'stdout') => {
            setUpdateTerminalLines((prev) => [...prev, { text: line, type }]);
        };

        const parseSseChunk = (chunk, onEvent) => {
            const blocks = chunk.split('\n\n');
            blocks.forEach((block) => {
                if (!block.trim()) return;

                let eventName = 'message';
                let dataStr = '';

                block.split('\n').forEach((line) => {
                    if (line.startsWith('event:')) {
                        eventName = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        dataStr += line.slice(5).trim();
                    }
                });

                if (dataStr) {
                    try {
                        onEvent(eventName, JSON.parse(dataStr));
                    } catch {
                        // ignore malformed chunks
                    }
                }
            });
        };

        const handleStreamDone = (data) => {
            if (updateFinishedRef.current) {
                return;
            }

            setUpdateTerminalStatus(data?.success ? 'success' : 'error');

            if (data?.success) {
                updateFinishedRef.current = true;
                showToast(data.message || 'Pembaruan berhasil.', 'success');
                appendLine('Pembaruan selesai. Memuat ulang halaman...', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                return;
            }

            showToast(data?.message || 'Gagal memperbarui aplikasi.', 'error');
        };

        try {
            const response = await fetch('/admin/update/run-stream', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'text/event-stream',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error(`Server merespons ${response.status}.`);
            }

            if (!response.body) {
                throw new Error('Stream update tidak tersedia di browser ini.');
            }

            appendLine('Terhubung. Menjalankan perintah shell...', 'info');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';

                parts.forEach((part) => {
                    parseSseChunk(part + '\n\n', (eventName, data) => {
                        if (eventName === 'log' && data?.line) {
                            appendLine(data.line, data.type || 'stdout');
                        } else if (eventName === 'done') {
                            handleStreamDone(data);
                        }
                    });
                });
            }

            if (buffer.trim()) {
                parseSseChunk(buffer + '\n\n', (eventName, data) => {
                    if (eventName === 'log' && data?.line) {
                        appendLine(data.line, data.type || 'stdout');
                    } else if (eventName === 'done') {
                        handleStreamDone(data);
                    }
                });
            }
        } catch (error) {
            const message = error?.message || 'Gagal memperbarui aplikasi.';
            appendLine(message, 'error');
            setUpdateTerminalStatus('error');
            showToast(message, 'error');
        } finally {
            setIsRunningUpdate(false);
        }
    };

    const hasUpdate = Boolean(updateInfo.update_available) && !isCheckingRemote;
    const mainCardShell = hasUpdate
        ? (theme.isDarkMode
            ? 'border border-amber-500/45 bg-gradient-to-br from-amber-950/90 via-orange-950/70 to-rose-950/60 shadow-xl shadow-amber-500/15 ring-1 ring-amber-400/20'
            : 'border border-amber-300/90 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 shadow-xl shadow-amber-300/40 ring-1 ring-amber-400/30')
        : isCheckingRemote
            ? (theme.isDarkMode
                ? 'border border-violet-500/35 bg-gradient-to-br from-violet-950/80 via-indigo-950/60 to-violet-900/50 shadow-lg shadow-violet-500/10'
                : 'border border-violet-200 bg-gradient-to-br from-violet-100 via-indigo-50 to-violet-50 shadow-md shadow-violet-200/50')
            : (theme.isDarkMode
                ? 'border border-emerald-500/30 bg-gradient-to-br from-emerald-950/70 via-teal-950/50 to-violet-950/40 shadow-lg shadow-emerald-500/10'
                : 'border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-teal-50/80 to-violet-50 shadow-md shadow-emerald-200/40');

    const mainCardAccent = hasUpdate
        ? 'h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
        : isCheckingRemote
            ? (theme.isDarkMode
                ? 'h-1 bg-gradient-to-r from-violet-500 via-indigo-400 to-violet-500 animate-pulse'
                : 'h-1 bg-gradient-to-r from-violet-500 via-indigo-400 to-violet-500 animate-pulse')
            : (theme.isDarkMode
                ? 'h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-violet-500'
                : 'h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-violet-400');

    const localVersionCard = theme.isDarkMode
        ? 'border border-emerald-500/35 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-emerald-950/30'
        : 'border border-emerald-300/80 bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-50/90';

    const remoteVersionCard = hasUpdate
        ? (theme.isDarkMode
            ? 'border border-amber-400/50 bg-gradient-to-br from-amber-500/25 via-orange-500/20 to-rose-600/15 ring-1 ring-amber-400/25'
            : 'border border-amber-400/70 bg-gradient-to-br from-amber-200/90 via-orange-100 to-rose-100 ring-1 ring-amber-300/50')
        : (theme.isDarkMode
            ? 'border border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-violet-950/25'
            : 'border border-violet-200 bg-gradient-to-br from-violet-100 via-indigo-50 to-violet-50/90');

    const updateActionButton = hasUpdate && canRunAppUpdate
        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 shadow-lg shadow-orange-500/30'
        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/20';

    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-2">
            <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${mainCardShell}`}>
                <div className={mainCardAccent} />
                <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 border ${
                                hasUpdate
                                    ? (theme.isDarkMode ? 'bg-gradient-to-br from-amber-500/25 to-orange-600/20 border-amber-400/40' : 'bg-gradient-to-br from-amber-200 to-orange-100 border-amber-300')
                                    : (theme.isDarkMode ? 'bg-violet-500/15 border-violet-500/25' : 'bg-violet-50 border-violet-100')
                            }`}>
                                <GitBranch className={`w-5 h-5 ${hasUpdate ? 'text-amber-500' : 'text-violet-500'}`} />
                            </div>
                            <div className="min-w-0">
                                <h2 className={`text-sm font-bold tracking-tight ${theme.themeTextTitle}`}>Pembaruan Aplikasi</h2>
                                <p className={`text-[11px] leading-relaxed mt-0.5 ${theme.themeTextSub}`}>
                                    Halaman dibuka instan; versi GitHub diperbarui di background (branch: {updateInfo.repository?.branch || 'main'}).
                                </p>
                            </div>
                        </div>
                        <span className={`self-start shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isCheckingRemote
                                ? (theme.isDarkMode ? 'bg-violet-500/20 text-violet-200 border border-violet-400/30' : 'bg-violet-100 text-violet-800 border border-violet-300')
                                : hasUpdate
                                ? (theme.isDarkMode ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/25 text-amber-100 border border-amber-400/40 shadow-sm shadow-amber-500/20' : 'bg-gradient-to-r from-amber-200 to-orange-200 text-amber-950 border border-amber-400/60 shadow-sm')
                                : (theme.isDarkMode ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/15 text-emerald-200 border border-emerald-400/30' : 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-300')
                        }`}>
                            {isCheckingRemote
                                ? 'Memeriksa GitHub...'
                                : updateInfo.update_available
                                ? (updateInfo.behind_count > 0 ? `${updateInfo.behind_count} commit baru` : 'Pembaruan tersedia')
                                : 'Sudah versi terbaru'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={`rounded-xl p-3 transition-colors duration-300 ${localVersionCard}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Versi lokal</p>
                            <p className={`text-base font-black font-mono mt-1 ${theme.isDarkMode ? 'text-emerald-100' : 'text-emerald-950'}`}>{updateInfo.local?.commit_short || '—'}</p>
                            <p className={`text-[10px] mt-1 line-clamp-2 ${theme.isDarkMode ? 'text-emerald-300/80' : 'text-emerald-800/70'}`}>{updateInfo.local?.commit_message || '—'}</p>
                        </div>
                        <div className={`rounded-xl p-3 transition-all duration-300 ${remoteVersionCard}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${
                                hasUpdate
                                    ? (theme.isDarkMode ? 'text-amber-300' : 'text-amber-800')
                                    : (theme.isDarkMode ? 'text-violet-300' : 'text-violet-700')
                            }`}>
                                Versi GitHub
                                {updateInfo.remote?.source === 'git' && (
                                    <span className={`ml-1 font-normal normal-case ${theme.themeTextDesc}`}>(origin/{updateInfo.repository?.branch || 'main'})</span>
                                )}
                                {updateInfo.remote?.source === 'github_api' && (
                                    <span className={`ml-1 font-normal normal-case ${theme.themeTextDesc}`}>(GitHub API)</span>
                                )}
                            </p>
                            <p className={`text-base font-black font-mono mt-1 ${
                                hasUpdate
                                    ? (theme.isDarkMode ? 'text-amber-50' : 'text-amber-950')
                                    : (theme.isDarkMode ? 'text-violet-100' : 'text-violet-950')
                            }`}>
                                {isCheckingRemote && !updateInfo.remote?.commit_short ? (
                                    <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ...
                                    </span>
                                ) : (
                                    updateInfo.remote?.commit_short || '—'
                                )}
                            </p>
                            <p className={`text-[10px] mt-1 line-clamp-2 ${
                                hasUpdate
                                    ? (theme.isDarkMode ? 'text-amber-200/90' : 'text-amber-900/80')
                                    : (theme.isDarkMode ? 'text-violet-300/80' : 'text-violet-800/70')
                            }`}>{updateInfo.remote?.commit_message || updateInfo.remote?.error || 'Belum dapat memuat versi remote.'}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <p className={`text-[10px] ${theme.themeTextSub}`}>
                            Sebelum migrasi, cadangan otomatis disimpan di <span className="font-semibold">storage/app/backups/pre-update/</span>
                            {' '}(MySQL: database salinan baru di server). Cadangan manual tetap tersedia di menu <span className="font-semibold">Database</span>.
                            {updateInfo.repository?.github_url && (
                                <>
                                    {' · '}
                                    <a href={updateInfo.repository.github_url} target="_blank" rel="noopener noreferrer" className={`font-semibold hover:underline ${theme.isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                                        GitHub
                                    </a>
                                </>
                            )}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => refreshRemoteStatus(true)}
                                disabled={isCheckingRemote || isRunningUpdate}
                                title={isCheckingRemote ? 'Memeriksa...' : 'Cek Ulang'}
                                className="p-2.5 disabled:opacity-45 border rounded-xl cursor-pointer inline-flex items-center justify-center transition-colors border-violet-300/60 text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-200 dark:hover:bg-violet-500/10"
                            >
                                <RefreshCw className={`w-4 h-4 ${isCheckingRemote ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={handleRunUpdate}
                                disabled={isRunningUpdate || isCheckingRemote || !canRunAppUpdate}
                                title={isRunningUpdate ? 'Memperbarui...' : 'Update Sekarang'}
                                className={`p-2.5 disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-xl cursor-pointer inline-flex items-center justify-center transition-all duration-300 ${updateActionButton}`}
                            >
                                {isRunningUpdate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {updateTerminalStatus !== 'idle' && (
                <div className="rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl shadow-black/30">
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/90" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                        <span className="ml-2 text-[10px] font-mono text-zinc-500 truncate">
                            {terminalSessionLabel} — bash
                            {updateTerminalStatus === 'running' && (
                                <span className="ml-2 text-violet-400 animate-pulse">running</span>
                            )}
                            {updateTerminalStatus === 'success' && (
                                <span className="ml-2 text-emerald-400">done</span>
                            )}
                            {updateTerminalStatus === 'error' && (
                                <span className="ml-2 text-red-400">failed</span>
                            )}
                        </span>
                    </div>
                    <div
                        ref={updateTerminalRef}
                        className="bg-[#0b0f14] p-3 sm:p-4 max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed scroll-smooth"
                    >
                        {updateTerminalLines.map((entry, index) => (
                            <div
                                key={`${index}-${entry.text.slice(0, 24)}`}
                                className={`whitespace-pre-wrap break-all ${
                                    entry.type === 'cmd'
                                        ? 'text-emerald-400'
                                        : entry.type === 'info'
                                            ? 'text-sky-400/90'
                                            : entry.type === 'stderr'
                                                ? 'text-amber-300/85'
                                                : entry.type === 'success'
                                                    ? 'text-emerald-300 font-semibold'
                                                    : entry.type === 'error'
                                                        ? 'text-red-400 font-semibold'
                                                        : 'text-zinc-300/90'
                                }`}
                            >
                                {entry.text}
                            </div>
                        ))}
                        {updateTerminalStatus === 'running' && (
                            <div className="flex items-center gap-1 mt-1 text-emerald-400">
                                <span className="text-zinc-500">$</span>
                                <span className="inline-block w-2 h-3.5 bg-emerald-400/90 animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function UpdateIndex({ appUpdateInfo }) {
    return (
        <AdminLayout title="Update">
            <UpdatePageContent appUpdateInfo={appUpdateInfo} />
        </AdminLayout>
    );
}
