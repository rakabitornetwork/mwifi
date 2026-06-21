import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Edit, PlugZap, Plus, RefreshCw, Save, Wifi, X } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';

function RoutersPageContent({ routers = [] }) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const [showRouterModal, setShowRouterModal] = useState(false);
    const [editingRouter, setEditingRouter] = useState(null);
    const [isTestingRouter, setIsTestingRouter] = useState(null);
    const [isSyncingRouter, setIsSyncingRouter] = useState(null);

    const themeInnerWidget = theme.isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = theme.isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = theme.isDarkMode ? 'text-zinc-400' : 'text-zinc-650';

    const handleTestConnection = async (routerId) => {
        setIsTestingRouter(routerId);
        try {
            const response = await fetch('/admin/routers/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ router_id: routerId }),
            });
            const result = await response.json();
            showToast(result.message, result.success ? 'success' : 'error');
        } catch {
            showToast('Gagal melakukan tes koneksi: Jaringan error atau IP Router tidak dapat dihubungi.', 'error');
        } finally {
            setIsTestingRouter(null);
        }
    };

    const handleSyncRouter = async (routerId) => {
        const id = routerId || (routers && routers[0] ? routers[0].id : null);
        if (!id) {
            showToast('Tidak ada router yang dapat disinkronkan.', 'warning');
            return;
        }

        setIsSyncingRouter(id);
        try {
            const response = await fetch('/admin/routers/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ router_id: id }),
            });
            const result = await response.json();
            showToast(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                router.reload();
            }
        } catch {
            showToast('Error: Gagal menghubungi server saat melakukan sinkronisasi.', 'error');
        } finally {
            setIsSyncingRouter(null);
        }
    };

    const handleSaveRouter = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        router.post('/admin/routers/save', payload, {
            onSuccess: () => {
                setShowRouterModal(false);
                setEditingRouter(null);
            },
        });
    };

    const openCreateModal = () => {
        setEditingRouter(null);
        setShowRouterModal(true);
    };

    const openEditModal = (routerItem) => {
        setEditingRouter(routerItem);
        setShowRouterModal(true);
    };

    const closeRouterModal = () => {
        setShowRouterModal(false);
    };

    return (
        <>
            <div className={`${theme.themeCard} border rounded-2xl p-5 space-y-4`}>
                <div className={`flex justify-between items-center border-b ${theme.isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                    <div className="flex items-center space-x-2">
                        <Wifi className="w-5 h-5 text-emerald-500" />
                        <h2 className={`text-sm font-bold ${theme.themeTextTitle}`}>Manajemen Router Mikrotik</h2>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        title="Tambah Router"
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${theme.themeTextSub}`}>
                                <th className="py-3 px-2">Nama Router</th>
                                <th className="py-3 px-2">IP / Host</th>
                                <th className="py-3 px-2">Port</th>
                                <th className="py-3 px-2">Protokol</th>
                                <th className="py-3 px-2">Status</th>
                                <th className="py-3 px-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                            {routers.map((routerItem) => (
                                <tr key={routerItem.id} className={`${theme.themeTextSub} hover:bg-zinc-900/10`}>
                                    <td className={`py-3 px-2 font-bold ${theme.themeTextTitle}`}>{routerItem.name}</td>
                                    <td className="py-3 px-2 font-mono">{routerItem.host}</td>
                                    <td className="py-3 px-2">{routerItem.port}</td>
                                    <td className="py-3 px-2 uppercase font-semibold">{routerItem.protocol_type}</td>
                                    <td className="py-3 px-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${routerItem.status ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                            {routerItem.status ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-right space-x-1">
                                        <button
                                            type="button"
                                            onClick={() => handleTestConnection(routerItem.id)}
                                            disabled={isTestingRouter === routerItem.id}
                                            title={isTestingRouter === routerItem.id ? 'Memeriksa koneksi...' : 'Tes Koneksi'}
                                            className="inline-block p-1 text-amber-500 hover:text-amber-400 cursor-pointer transition-colors disabled:opacity-50"
                                        >
                                            <PlugZap className={`w-4 h-4 ${isTestingRouter === routerItem.id ? 'animate-pulse' : ''}`} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSyncRouter(routerItem.id)}
                                            disabled={isSyncingRouter === routerItem.id}
                                            title={isSyncingRouter === routerItem.id ? 'Sinkronisasi...' : 'Sync Pelanggan'}
                                            className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isSyncingRouter === routerItem.id ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(routerItem)}
                                            title="Edit"
                                            className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransitionModal show={showRouterModal} themeCard={theme.themeCard} maxWidth="md">
                <div className={`flex justify-between items-center pb-2 border-b ${theme.isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${theme.themeTextTitle}`}>
                        {editingRouter ? 'Edit Router Mikrotik' : 'Tambah Router Mikrotik'}
                    </h3>
                    <button type="button" onClick={closeRouterModal} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSaveRouter} className="space-y-3 text-xs">
                    <input type="hidden" name="id" value={editingRouter ? editingRouter.id : ''} />
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Nama Router</label>
                        <input required name="name" type="text" defaultValue={editingRouter ? editingRouter.name : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>IP Address / Host</label>
                        <input required name="host" type="text" defaultValue={editingRouter ? editingRouter.host : ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Port API</label>
                            <input required name="port" type="number" defaultValue={editingRouter ? editingRouter.port : 8728} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Protokol</label>
                            <select name="protocol_type" defaultValue={editingRouter ? editingRouter.protocol_type : 'rest_api'} className={`p-2 border rounded-lg ${themeInput}`}>
                                <option value="rest_api">REST API (v7)</option>
                                <option value="legacy_socket">Socket API (v6)</option>
                            </select>
                        </div>
                    </div>
                    <div className={`p-2.5 ${themeInnerWidget} rounded-xl text-[10px] ${theme.themeTextSub} leading-normal space-y-1`}>
                        <div>💡 <strong className={theme.themeTextTitle}>REST API (v7):</strong> Menggunakan port layanan web Mikrotik (<strong className={theme.themeTextTitle}>WWW</strong>, default <strong className={theme.themeTextTitle}>80</strong> atau <strong className={theme.themeTextTitle}>443</strong>).</div>
                        <div>💡 <strong className={theme.themeTextTitle}>Socket API (v6):</strong> Menggunakan port layanan API binary Mikrotik (<strong className={theme.themeTextTitle}>api</strong>, default <strong className={theme.themeTextTitle}>8728</strong> atau <strong className={theme.themeTextTitle}>8729 SSL</strong>).</div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Username</label>
                        <input required name="username" type="text" defaultValue={editingRouter ? editingRouter.username : 'admin'} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Password</label>
                        <input name="password" type="password" placeholder={editingRouter ? 'Kosongkan jika tidak diubah' : 'Password router'} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Status</label>
                        <select name="status" defaultValue={editingRouter ? (editingRouter.status ? 1 : 0) : 1} className={`p-2 border rounded-lg ${themeInput}`}>
                            <option value={1}>Aktif / Hubungkan</option>
                            <option value={0}>Non-Aktifkan</option>
                        </select>
                    </div>
                    <div className="flex justify-end pt-3 gap-2">
                        <button
                            type="button"
                            onClick={closeRouterModal}
                            title="Batal"
                            className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${theme.isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button type="submit" title="Simpan" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center">
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </TransitionModal>
        </>
    );
}

export default function RoutersIndex({ routers }) {
    return (
        <AdminLayout title="Router Mikrotik">
            <RoutersPageContent routers={routers} />
        </AdminLayout>
    );
}
