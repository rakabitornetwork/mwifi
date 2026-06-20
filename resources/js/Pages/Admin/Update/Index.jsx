import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowUpCircle, GitBranch, RefreshCw } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';

function UpdatePageContent({ appUpdateInfo = {} }) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const [isRunningUpdate, setIsRunningUpdate] = useState(false);
    const [updateTerminalLines, setUpdateTerminalLines] = useState([]);
    const [updateTerminalStatus, setUpdateTerminalStatus] = useState('idle');
    const updateTerminalRef = useRef(null);

    const canRunAppUpdate = Boolean(
        appUpdateInfo.can_run_update
        ?? (
            appUpdateInfo.update_available
            && appUpdateInfo.enabled !== false
            && appUpdateInfo.remote?.commit
        )
    );

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
            'Pembaruan akan menarik kode terbaru dari GitHub, lalu migrasi database dan optimasi cache.\n\n' +
            'Composer & NPM tidak dijalankan di server — pastikan vendor/public/build sudah di-commit dari lokal.\n\n' +
            'Disarankan buat backup database dulu. Proses bisa memakan beberapa menit.\n\nLanjutkan?'
        )) return;

        setIsRunningUpdate(true);
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
                            setUpdateTerminalStatus(data?.success ? 'success' : 'error');
                            if (data?.success) {
                                showToast(data.message || 'Pembaruan berhasil.', 'success');
                                setTimeout(() => router.reload(), 1800);
                            } else {
                                showToast(data?.message || 'Gagal memperbarui aplikasi.', 'error');
                            }
                        }
                    });
                });
            }

            if (buffer.trim()) {
                parseSseChunk(buffer + '\n\n', (eventName, data) => {
                    if (eventName === 'log' && data?.line) {
                        appendLine(data.line, data.type || 'stdout');
                    } else if (eventName === 'done') {
                        setUpdateTerminalStatus(data?.success ? 'success' : 'error');
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

    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-2">
            <div className={`${theme.themeCard} border rounded-2xl overflow-hidden`}>
                <div className={`h-0.5 ${theme.isDarkMode ? 'bg-gradient-to-r from-violet-500/70 via-indigo-400/50 to-violet-500/70' : 'bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-400'}`} />
                <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${theme.isDarkMode ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-100'}`}>
                                <GitBranch className="w-5 h-5 text-violet-500" />
                            </div>
                            <div className="min-w-0">
                                <h2 className={`text-sm font-bold tracking-tight ${theme.themeTextTitle}`}>Pembaruan Aplikasi</h2>
                                <p className={`text-[11px] leading-relaxed mt-0.5 ${theme.themeTextSub}`}>
                                    Status dicek otomatis via <span className="font-semibold">git fetch</span> saat halaman dibuka (branch: {appUpdateInfo.repository?.branch || 'main'}).
                                </p>
                            </div>
                        </div>
                        <span className={`self-start shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            appUpdateInfo.update_available
                                ? (theme.isDarkMode ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200')
                                : (theme.isDarkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                        }`}>
                            {appUpdateInfo.update_available
                                ? (appUpdateInfo.behind_count > 0 ? `${appUpdateInfo.behind_count} commit baru` : 'Pembaruan tersedia')
                                : 'Sudah versi terbaru'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className={`rounded-xl border p-3 ${theme.isDarkMode ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.themeTextSub}`}>Versi lokal</p>
                            <p className={`text-base font-black font-mono mt-1 ${theme.themeTextTitle}`}>{appUpdateInfo.local?.commit_short || '—'}</p>
                            <p className={`text-[10px] mt-1 line-clamp-2 ${theme.themeTextSub}`}>{appUpdateInfo.local?.commit_message || '—'}</p>
                        </div>
                        <div className={`rounded-xl border p-3 ${appUpdateInfo.update_available ? (theme.isDarkMode ? 'border-violet-500/20 bg-violet-500/5' : 'border-violet-200 bg-violet-50/50') : (theme.isDarkMode ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/80')}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${theme.themeTextSub}`}>
                                Versi GitHub
                                {appUpdateInfo.remote?.source === 'git' && (
                                    <span className={`ml-1 font-normal normal-case ${theme.themeTextDesc}`}>(origin/{appUpdateInfo.repository?.branch || 'main'})</span>
                                )}
                            </p>
                            <p className={`text-base font-black font-mono mt-1 ${theme.themeTextTitle}`}>{appUpdateInfo.remote?.commit_short || '—'}</p>
                            <p className={`text-[10px] mt-1 line-clamp-2 ${theme.themeTextSub}`}>{appUpdateInfo.remote?.commit_message || appUpdateInfo.remote?.error || 'Belum dapat memuat versi remote.'}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <p className={`text-[10px] ${theme.themeTextSub}`}>
                            Backup database dulu via menu <span className="font-semibold">Database</span>.
                            {appUpdateInfo.repository?.github_url && (
                                <>
                                    {' · '}
                                    <a href={appUpdateInfo.repository.github_url} target="_blank" rel="noopener noreferrer" className={`font-semibold hover:underline ${theme.isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                                        GitHub
                                    </a>
                                </>
                            )}
                        </p>
                        <button
                            type="button"
                            onClick={handleRunUpdate}
                            disabled={isRunningUpdate || !canRunAppUpdate}
                            className="w-full sm:w-auto px-5 py-2.5 disabled:opacity-45 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                        >
                            {isRunningUpdate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                            <span>{isRunningUpdate ? 'Memperbarui...' : 'Update Sekarang'}</span>
                        </button>
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
                            mwifi-update — bash
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
