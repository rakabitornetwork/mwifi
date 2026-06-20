import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Database,
    Download,
    HardDrive,
    RefreshCw,
    RotateCcw,
    ShieldOff,
    Trash2,
    Upload,
} from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';

function DatabasePageContent({ databaseInfo = {}, databaseBackups = [] }) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [isRestoringDatabase, setIsRestoringDatabase] = useState(false);
    const [restoreSource, setRestoreSource] = useState('existing');
    const [selectedRestoreFilename, setSelectedRestoreFilename] = useState('');
    const [restoreConfirmText, setRestoreConfirmText] = useState('');
    const [restoreUploadName, setRestoreUploadName] = useState('');
    const [isResettingDatabase, setIsResettingDatabase] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');

    const themeInnerWidget = theme.isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';

    const handleCreateBackup = () => {
        if (!confirm('Buat backup database sekarang?\n\nFile akan disimpan di server (storage/app/backups/database).')) return;

        setIsCreatingBackup(true);
        router.post('/admin/database/backup', {}, {
            preserveScroll: true,
            onFinish: () => setIsCreatingBackup(false),
            onSuccess: () => router.reload(),
        });
    };

    const handleDeleteBackup = (filename) => {
        if (!confirm(`Hapus file backup "${filename}"?\n\nTindakan ini tidak dapat dibatalkan.`)) return;

        router.post('/admin/database/backups/delete', { filename }, {
            preserveScroll: true,
            onSuccess: () => router.reload(),
        });
    };

    const handleRestoreDatabase = (e) => {
        e.preventDefault();

        if (restoreConfirmText !== 'RESTORE') {
            showToast('Ketik RESTORE untuk mengonfirmasi pemulihan database.', 'warning');
            return;
        }

        if (restoreSource === 'existing' && !selectedRestoreFilename) {
            showToast('Pilih file backup yang akan dipulihkan.', 'warning');
            return;
        }

        if (restoreSource === 'upload' && !restoreUploadName) {
            showToast('Unggah file backup (.sql atau .sqlite).', 'warning');
            return;
        }

        if (!confirm('PERINGATAN: Restore akan MENIMPA seluruh data database saat ini.\n\nPastikan Anda sudah punya backup terbaru. Lanjutkan?')) return;

        const form = e.target;
        const formData = new FormData(form);
        formData.set('source', restoreSource);
        formData.set('confirm', restoreConfirmText);

        if (restoreSource === 'existing') {
            formData.set('filename', selectedRestoreFilename);
        } else {
            const fileInput = form.querySelector('input[name="backup_file"]');
            if (fileInput?.files?.[0]) {
                formData.set('backup_file', fileInput.files[0]);
            }
        }

        setIsRestoringDatabase(true);
        router.post('/admin/database/restore', formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setIsRestoringDatabase(false),
            onSuccess: () => {
                setRestoreConfirmText('');
                setRestoreUploadName('');
                router.reload();
            },
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal restore database.', 'error');
            },
        });
    };

    const handleResetDatabase = (e) => {
        e.preventDefault();

        if (resetConfirmText !== 'RESET') {
            showToast('Ketik RESET untuk mengonfirmasi reset database.', 'warning');
            return;
        }

        if (!confirm(
            'PERINGATAN: Semua data operasional akan dihapus:\n' +
            '• Pelanggan & akun portal pelanggan\n' +
            '• Tagihan, pembayaran, log billing\n' +
            '• Router, paket, ODP, voucher hotspot\n\n' +
            'Yang TETAP AMAN:\n' +
            '• Akun administrator (Super Admin)\n' +
            '• Pengaturan aplikasi (branding, payment, WA, dll)\n' +
            '• File backup di server\n\n' +
            'Disarankan buat backup dulu. Lanjutkan reset?'
        )) return;

        setIsResettingDatabase(true);
        router.post('/admin/database/reset', { confirm: resetConfirmText }, {
            preserveScroll: true,
            onFinish: () => setIsResettingDatabase(false),
            onSuccess: () => {
                setResetConfirmText('');
                router.reload();
            },
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal reset database.', 'error');
            },
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-2">
            <div className={`${theme.themeCard} border rounded-2xl overflow-hidden`}>
                <div className={`h-0.5 ${theme.isDarkMode ? 'bg-gradient-to-r from-emerald-500/80 via-indigo-400/60 to-emerald-500/80' : 'bg-gradient-to-r from-emerald-500 via-indigo-400 to-emerald-500'}`} />
                <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${theme.isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                                <Database className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                                <h2 className={`text-sm font-bold tracking-tight ${theme.themeTextTitle}`}>Manajemen Database</h2>
                                <p className={`text-[11px] leading-relaxed mt-0.5 ${theme.themeTextSub}`}>
                                    Cadangkan, pulihkan, atau kosongkan data operasional — aman untuk akun admin & pengaturan.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateBackup}
                            disabled={isCreatingBackup}
                            className="shrink-0 w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                        >
                            {isCreatingBackup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span>{isCreatingBackup ? 'Memproses...' : 'Backup Baru'}</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {[
                            { label: databaseInfo.driver_label || databaseInfo.driver || '—', tone: 'neutral' },
                            { label: databaseInfo.database || '—', tone: 'neutral' },
                            {
                                label: databaseInfo.host
                                    ? `${databaseInfo.host}${databaseInfo.port ? ':' + databaseInfo.port : ''}`
                                    : 'Lokal',
                                tone: 'neutral',
                            },
                            {
                                label: databaseInfo.mysqldump_available ? 'mysqldump OK' : 'Export PHP',
                                tone: databaseInfo.mysqldump_available ? 'ok' : 'neutral',
                            },
                        ].map(({ label, tone }) => (
                            <span
                                key={label}
                                className={`inline-flex max-w-full truncate px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                    tone === 'ok'
                                        ? (theme.isDarkMode ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-emerald-200 text-emerald-700 bg-emerald-50')
                                        : (theme.isDarkMode ? 'border-zinc-700/80 text-zinc-400 bg-zinc-900/50' : 'border-zinc-200 text-zinc-600 bg-zinc-50')
                                }`}
                                title={label}
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className={`${theme.themeCard} border rounded-2xl p-4 sm:p-5`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-indigo-500" />
                        <h3 className={`text-xs font-bold uppercase tracking-wide ${theme.themeTextTitle}`}>
                            File Backup
                        </h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                        {databaseBackups.length} file
                    </span>
                </div>

                {databaseBackups.length === 0 ? (
                    <p className={`text-[11px] text-center py-6 rounded-xl border border-dashed ${themeInnerWidget} ${theme.themeTextSub}`}>
                        Belum ada backup. Simpan cadangan sebelum restore atau reset.
                    </p>
                ) : (
                    <div className={`rounded-xl border divide-y ${theme.isDarkMode ? 'border-zinc-800 divide-zinc-800/80' : 'border-zinc-200 divide-zinc-100'}`}>
                        {databaseBackups.map((backup) => (
                            <div key={backup.filename} className="flex items-center gap-2 p-2.5 sm:p-3">
                                <div className="min-w-0 flex-1">
                                    <p className={`text-xs font-semibold truncate ${theme.themeTextTitle}`} title={backup.filename}>
                                        {backup.filename}
                                    </p>
                                    <p className={`text-[10px] mt-0.5 ${theme.themeTextSub}`}>
                                        {backup.size_human} · {backup.created_at}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <a
                                        href={`/admin/database/backups/${encodeURIComponent(backup.filename)}/download`}
                                        className={`p-1.5 rounded-lg border transition-colors ${theme.isDarkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                                        title="Unduh"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteBackup(backup.filename)}
                                        className="p-1.5 rounded-lg border border-rose-500/25 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                        title="Hapus"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <p className={`text-[10px] mt-2.5 ${theme.themeTextDesc}`}>
                    Disimpan di <code className="font-mono opacity-80">storage/app/backups/database</code>
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <form
                    onSubmit={handleRestoreDatabase}
                    className={`rounded-2xl overflow-hidden border shadow-md transition-colors ${
                        theme.isDarkMode
                            ? 'border-indigo-500/10 bg-gradient-to-br from-slate-800 via-indigo-900/55 to-slate-900 shadow-black/15'
                            : 'border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-sky-100/60 shadow-indigo-900/5'
                    }`}
                >
                    <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border ${
                                theme.isDarkMode
                                    ? 'bg-white/8 border-white/12'
                                    : 'bg-indigo-500/8 border-indigo-200/80'
                            }`}>
                                <RotateCcw className={`w-4 h-4 ${theme.isDarkMode ? 'text-indigo-200' : 'text-indigo-600'}`} />
                            </div>
                            <div>
                                <h3 className={`text-xs font-bold ${theme.isDarkMode ? 'text-indigo-50' : 'text-indigo-900'}`}>Restore</h3>
                                <p className={`text-[10px] ${theme.isDarkMode ? 'text-indigo-200/75' : 'text-indigo-700/70'}`}>Menimpa seluruh database. Backup dulu.</p>
                            </div>
                        </div>

                        <div className={`inline-flex w-full rounded-lg border p-0.5 ${
                            theme.isDarkMode
                                ? 'border-white/10 bg-white/5'
                                : 'border-indigo-200/60 bg-white/50'
                        }`}>
                            {[
                                { id: 'existing', label: 'Dari server' },
                                { id: 'upload', label: 'Upload file' },
                            ].map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setRestoreSource(id)}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                                        restoreSource === id
                                            ? (theme.isDarkMode
                                                ? 'bg-indigo-500/25 text-indigo-50 shadow-sm ring-1 ring-white/10'
                                                : 'bg-white text-indigo-800 shadow-sm ring-1 ring-indigo-100')
                                            : (theme.isDarkMode
                                                ? 'text-indigo-200/70 hover:text-indigo-100 hover:bg-white/5'
                                                : 'text-indigo-600/70 hover:text-indigo-800 hover:bg-indigo-50/80')
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {restoreSource === 'existing' ? (
                            <select
                                value={selectedRestoreFilename}
                                onChange={(e) => setSelectedRestoreFilename(e.target.value)}
                                className={`w-full p-2 border rounded-lg text-xs focus:outline-none focus:ring-2 ${
                                    theme.isDarkMode
                                        ? 'border-white/12 bg-slate-900/40 text-indigo-50 focus:ring-indigo-400/25'
                                        : 'border-indigo-200/80 bg-white/90 text-slate-800 focus:ring-indigo-300/40'
                                }`}
                            >
                                <option value="">Pilih file backup...</option>
                                {databaseBackups.map((backup) => (
                                    <option key={backup.filename} value={backup.filename}>
                                        {backup.filename}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <label className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed text-xs font-semibold cursor-pointer transition-colors duration-200 ${
                                theme.isDarkMode
                                    ? 'border-white/15 bg-white/5 text-indigo-100/90 hover:bg-white/8'
                                    : 'border-indigo-300/50 bg-white/60 text-indigo-800/80 hover:bg-white/90'
                            }`}>
                                <Upload className="w-3.5 h-3.5" />
                                <span className="truncate">{restoreUploadName || 'Pilih .sql / .sqlite'}</span>
                                <input
                                    type="file"
                                    name="backup_file"
                                    accept=".sql,.sqlite"
                                    className="sr-only"
                                    onChange={(e) => setRestoreUploadName(e.target.files?.[0]?.name || '')}
                                />
                            </label>
                        )}

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={restoreConfirmText}
                                onChange={(e) => setRestoreConfirmText(e.target.value)}
                                placeholder="Ketik RESTORE"
                                className={`flex-1 min-w-0 p-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 ${
                                    theme.isDarkMode
                                        ? 'border-white/12 bg-slate-900/40 text-indigo-50 placeholder:text-indigo-200/40 focus:ring-indigo-400/25'
                                        : 'border-indigo-200/80 bg-white/90 text-slate-800 placeholder:text-slate-400 focus:ring-indigo-300/40'
                                }`}
                                autoComplete="off"
                            />
                            <button
                                type="submit"
                                disabled={isRestoringDatabase || restoreConfirmText !== 'RESTORE'}
                                className={`shrink-0 px-3 py-2 disabled:opacity-45 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all duration-200 shadow-sm ${
                                    theme.isDarkMode
                                        ? 'bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-50 ring-1 ring-white/10'
                                        : 'bg-indigo-600/85 hover:bg-indigo-600 text-white'
                                }`}
                            >
                                {isRestoringDatabase ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                Pulihkan
                            </button>
                        </div>
                    </div>
                </form>

                <form
                    onSubmit={handleResetDatabase}
                    className={`rounded-2xl overflow-hidden border shadow-md transition-colors ${
                        theme.isDarkMode
                            ? 'border-rose-500/10 bg-gradient-to-br from-slate-800 via-rose-950/45 to-red-950/40 shadow-black/15'
                            : 'border-rose-200/60 bg-gradient-to-br from-rose-50/90 via-red-50/70 to-rose-100/50 shadow-rose-900/5'
                    }`}
                >
                    <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg border ${
                                theme.isDarkMode
                                    ? 'bg-white/8 border-white/12'
                                    : 'bg-rose-500/8 border-rose-200/80'
                            }`}>
                                <ShieldOff className={`w-4 h-4 ${theme.isDarkMode ? 'text-rose-200' : 'text-rose-600'}`} />
                            </div>
                            <div>
                                <h3 className={`text-xs font-bold ${theme.isDarkMode ? 'text-rose-50' : 'text-rose-900'}`}>Reset Data</h3>
                                <p className={`text-[10px] ${theme.isDarkMode ? 'text-rose-200/75' : 'text-rose-700/70'}`}>Kosongkan pelanggan, tagihan, router & voucher.</p>
                            </div>
                        </div>

                        <p className={`text-[10px] leading-relaxed rounded-lg px-2.5 py-2 border ${
                            theme.isDarkMode
                                ? 'bg-black/12 border-white/8 text-rose-100/85'
                                : 'bg-white/45 border-rose-200/50 text-rose-800/75'
                        }`}>
                            <span className={`font-semibold ${theme.isDarkMode ? 'text-rose-100' : 'text-rose-900'}`}>Aman:</span>{' '}
                            admin, pengaturan & file backup.{' '}
                            <span className={`font-semibold ${theme.isDarkMode ? 'text-rose-100/90' : 'text-rose-900/90'}`}>Mikrotik tidak terpengaruh.</span>
                        </p>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={resetConfirmText}
                                onChange={(e) => setResetConfirmText(e.target.value)}
                                placeholder="Ketik RESET"
                                className={`flex-1 min-w-0 p-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 ${
                                    theme.isDarkMode
                                        ? 'border-white/12 bg-slate-900/40 text-rose-50 placeholder:text-rose-200/40 focus:ring-rose-400/25'
                                        : 'border-rose-200/80 bg-white/90 text-slate-800 placeholder:text-slate-400 focus:ring-rose-300/40'
                                }`}
                                autoComplete="off"
                            />
                            <button
                                type="submit"
                                disabled={isResettingDatabase || resetConfirmText !== 'RESET'}
                                className={`shrink-0 px-3 py-2 disabled:opacity-45 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all duration-200 shadow-sm ${
                                    theme.isDarkMode
                                        ? 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-50 ring-1 ring-white/10'
                                        : 'bg-rose-600/85 hover:bg-rose-600 text-white'
                                }`}
                            >
                                {isResettingDatabase ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                Reset
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function DatabaseIndex({ databaseInfo, databaseBackups }) {
    return (
        <AdminLayout title="Database">
            <DatabasePageContent databaseInfo={databaseInfo} databaseBackups={databaseBackups} />
        </AdminLayout>
    );
}
