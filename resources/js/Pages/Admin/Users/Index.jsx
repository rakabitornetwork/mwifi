import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Edit,
    Plus,
    Save,
    Search,
    Shield,
    ShieldCheck,
    Trash2,
    UserCheck,
    UserX,
    X,
} from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import AdminPageCard from '../../../Components/Admin/AdminPageCard';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';

const TAB_LABELS = {
    dashboard: 'Dashboard',
    routers: 'Router',
    'network-map': 'Peta Jaringan',
    packages: 'Paket',
    customers: 'PPPoE',
    hotspot: 'Hotspot',
    invoices: 'Tagihan',
    'finance-income': 'Laporan Pemasukan',
    'finance-expenses': 'Laporan Pengeluaran',
    inventory: 'Inventaris',
    messaging: 'WhatsApp',
    settings: 'Pengaturan',
    database: 'Database',
    update: 'Update',
    users: 'Manajemen User',
};

const ROLE_BADGE_CLASS = {
    super_admin: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    admin: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    technician: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    finance: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    operator: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

function UsersPageContent({
    staffUsers = [],
    roles = {},
    assignableRoles = [],
    routers = [],
    currentUserId,
}) {
    const { auth } = usePage().props;
    const theme = useAdminTheme();
    const {
        isDarkMode,
        themeCard,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
    } = theme;

    const themeInput = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = isDarkMode ? 'text-zinc-400' : 'text-zinc-650';
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [formRole, setFormRole] = useState('operator');

    useEffect(() => {
        if (showUserModal) {
            setFormRole(editingUser?.role || assignableRoles[0]?.value || 'operator');
        }
    }, [showUserModal, editingUser, assignableRoles]);

    useEffect(() => {
        if (!showUserModal) {
            setEditingUser(null);
        }
    }, [showUserModal]);

    const stats = useMemo(() => ({
        total: staffUsers.length,
        active: staffUsers.filter((user) => user.is_active).length,
        superAdmins: staffUsers.filter((user) => user.role === 'super_admin').length,
    }), [staffUsers]);

    const filteredUsers = useMemo(() => staffUsers.filter((user) => {
        if (roleFilter !== 'all' && user.role !== roleFilter) {
            return false;
        }

        if (statusFilter === 'active' && !user.is_active) {
            return false;
        }

        if (statusFilter === 'inactive' && user.is_active) {
            return false;
        }

        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return true;
        }

        return (
            user.name?.toLowerCase().includes(term)
            || user.email?.toLowerCase().includes(term)
            || user.role_label?.toLowerCase().includes(term)
            || user.profile_title?.toLowerCase().includes(term)
        );
    }), [staffUsers, roleFilter, statusFilter, searchTerm]);

    const statCards = useMemo(() => [
        {
            label: 'Total Staff',
            value: stats.total.toLocaleString('id-ID'),
            icon: ShieldCheck,
            cardClass: 'bg-gradient-to-br from-violet-500 to-indigo-600 border-violet-400/20 text-white shadow-md shadow-violet-500/10',
            labelClass: 'text-violet-100/90',
            iconClass: 'text-violet-100/80',
        },
        {
            label: 'Akun Aktif',
            value: stats.active.toLocaleString('id-ID'),
            icon: UserCheck,
            cardClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/20 text-white shadow-md shadow-emerald-500/10',
            labelClass: 'text-emerald-100/90',
            iconClass: 'text-emerald-100/80',
        },
        {
            label: 'Super Admin',
            value: stats.superAdmins.toLocaleString('id-ID'),
            icon: Shield,
            cardClass: 'bg-gradient-to-br from-sky-500 to-cyan-600 border-sky-400/20 text-white shadow-md shadow-sky-500/10',
            labelClass: 'text-sky-100/90',
            iconClass: 'text-sky-100/80',
        },
    ], [stats]);

    const openCreateModal = () => {
        setEditingUser(null);
        setShowUserModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setShowUserModal(true);
    };

    const closeUserModal = () => setShowUserModal(false);

    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setTimeout(() => setUserToDelete(null), 300);
    };

    const handleSaveUser = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());
        payload.is_active = data.get('is_active') ? '1' : '0';

        router.post('/admin/users/save', payload, {
            onSuccess: () => setShowUserModal(false),
        });
    };

    const confirmDeleteUser = () => {
        if (!userToDelete) return;

        router.post('/admin/users/delete', { id: userToDelete.id }, {
            onSuccess: () => {
                setShowDeleteModal(false);
                setTimeout(() => setUserToDelete(null), 300);
            },
        });
    };

    const toggleUserActive = (user) => {
        router.post('/admin/users/toggle-active', { id: user.id });
    };

    const roleEntries = useMemo(() => Object.entries(roles), [roles]);

    return (
        <>
            <AdminPageCard
                icon={ShieldCheck}
                accent="violet"
                title="Manajemen User"
                description="Kelola akun staff dengan role dan hak akses menu yang sesuai fungsinya."
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextDesc={themeTextDesc}
                actions={(
                    <button
                        type="button"
                        onClick={openCreateModal}
                        title="Tambah User"
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {statCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={card.label}
                                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] ${card.cardClass}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-[10px] font-bold uppercase tracking-wide ${card.labelClass}`}>{card.label}</p>
                                    <Icon className={`w-4 h-4 shrink-0 ${card.iconClass}`} />
                                </div>
                                <p className="text-2xl font-black mt-2 tracking-tight leading-none text-white">{card.value}</p>
                            </div>
                        );
                    })}
                </div>

                <div className={`rounded-xl border p-3 space-y-2 ${isDarkMode ? 'border-zinc-800/80 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/80'}`}>
                    <p className={`text-xs font-bold ${themeTextTitle}`}>Hak Akses per Role</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {roleEntries.map(([roleKey, roleMeta]) => (
                            <div key={roleKey} className={`rounded-lg border p-2.5 ${themeInnerWidget}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ROLE_BADGE_CLASS[roleKey] || ROLE_BADGE_CLASS.admin}`}>
                                        {roleMeta.label}
                                    </span>
                                </div>
                                <p className={`text-[10px] mt-1.5 leading-snug ${themeTextDesc}`}>{roleMeta.description}</p>
                                <p className={`text-[10px] mt-1.5 ${themeTextSub}`}>
                                    Menu: {(roleMeta.tabs || []).map((tab) => TAB_LABELS[tab] || tab).join(' · ') || '—'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeTextDesc}`} />
                        <input
                            type="text"
                            placeholder="Cari nama, email, atau jabatan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${themeInput}`}
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className={`lg:w-48 shrink-0 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${themeInput}`}
                    >
                        <option value="all">Semua role</option>
                        {assignableRoles.map((role) => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`lg:w-40 shrink-0 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${themeInput}`}
                    >
                        <option value="all">Semua status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                    </select>
                </div>

                <div className="admin-table-scroll">
                    <table>
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                <th className="py-3 px-2">User</th>
                                <th className="py-3 px-2">Email</th>
                                <th className="py-3 px-2">Role</th>
                                <th className="py-3 px-2">Router</th>
                                <th className="py-3 px-2">Status</th>
                                <th className="py-3 px-2">Diperbarui</th>
                                <th className="py-3 px-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`py-8 text-center ${themeTextDesc}`}>
                                        {searchTerm.trim() || roleFilter !== 'all' || statusFilter !== 'all'
                                            ? 'Tidak ada user staff yang cocok dengan filter.'
                                            : 'Belum ada user staff. Klik + untuk menambah.'}
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user) => {
                                const isSelf = user.id === currentUserId;

                                return (
                                    <tr key={user.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                        <td className="py-3 px-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-zinc-700/30" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-500 border border-violet-500/20 flex items-center justify-center text-[10px] font-black shrink-0">
                                                        {user.initials}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className={`font-bold truncate ${themeTextTitle}`}>
                                                        {user.name}
                                                        {isSelf && <span className={`ml-1 text-[10px] ${themeTextDesc}`}>(Anda)</span>}
                                                    </p>
                                                    <p className={`text-[10px] truncate ${themeTextDesc}`}>{user.profile_title || user.role_label}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 font-mono text-[10px]">{user.email}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${ROLE_BADGE_CLASS[user.role] || ROLE_BADGE_CLASS.admin}`}>
                                                {user.role_label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-[10px]">
                                            {user.role === 'technician' ? (
                                                user.assigned_router_name
                                                    ? <span className={`font-bold ${themeTextTitle}`}>{user.assigned_router_name}</span>
                                                    : <span className="text-amber-500 font-bold">Belum diatur</span>
                                            ) : (
                                                <span className={themeTextDesc}>—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${user.is_active
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'}`}
                                            >
                                                {user.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-[10px] tabular-nums whitespace-nowrap">{user.updated_at || '—'}</td>
                                        <td className="py-3 px-2 text-right">
                                            <div className="admin-table-actions">
                                                {!isSelf && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleUserActive(user)}
                                                        title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                        className={`inline-block p-1 cursor-pointer transition-colors ${user.is_active ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'}`}
                                                    >
                                                        {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(user)}
                                                    title="Edit"
                                                    className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {!isSelf && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteModal(user)}
                                                        title="Hapus"
                                                        className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <p className={`text-[10px] ${themeTextDesc}`}>
                    Login staff: gunakan email dan password. Menu sidebar otomatis menyesuaikan role masing-masing user.
                    {auth?.user?.role_label && (
                        <> Anda login sebagai <span className="font-bold">{auth.user.role_label}</span>.</>
                    )}
                </p>
            </AdminPageCard>

            <TransitionModal show={showUserModal} onClose={closeUserModal} themeCard={themeCard} maxWidth="lg">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {editingUser ? 'Edit User Staff' : 'Tambah User Staff'}
                    </h3>
                    <button type="button" onClick={closeUserModal} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSaveUser} className="space-y-3 text-xs mt-3">
                    <input type="hidden" name="id" value={editingUser?.id || ''} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className={`font-bold ${themeLabel}`}>Nama Lengkap</label>
                            <input required name="name" type="text" defaultValue={editingUser?.name || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className={`font-bold ${themeLabel}`}>Email Login</label>
                            <input required name="email" type="email" defaultValue={editingUser?.email || ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Role</label>
                            <select
                                name="role"
                                required
                                value={formRole}
                                onChange={(e) => setFormRole(e.target.value)}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                {assignableRoles.map((role) => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                        </div>
                        {formRole === 'technician' && (
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className={`font-bold ${themeLabel}`}>Router Mikrotik (wajib)</label>
                                <select
                                    name="assigned_router_id"
                                    required
                                    defaultValue={editingUser?.assigned_router_id || ''}
                                    className={`p-2 border rounded-lg ${themeInput}`}
                                >
                                    <option value="">Pilih router area kerja teknisi...</option>
                                    {routers.map((routerItem) => (
                                        <option key={routerItem.id} value={routerItem.id}>
                                            {routerItem.name}{routerItem.status ? '' : ' (nonaktif)'}
                                        </option>
                                    ))}
                                </select>
                                <p className={`text-[10px] ${themeTextDesc}`}>
                                    Teknisi hanya melihat menu Dashboard, Peta Jaringan, PPPoE (tambah pelanggan), dan Tagihan untuk router ini.
                                </p>
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Jabatan (opsional)</label>
                            <input name="profile_title" type="text" defaultValue={editingUser?.profile_title || ''} placeholder="Contoh: NOC Engineer" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className={`font-bold ${themeLabel}`}>
                                Password {editingUser ? '(kosongkan jika tidak diubah)' : ''}
                            </label>
                            <input
                                name="password"
                                type="password"
                                minLength={6}
                                required={!editingUser}
                                autoComplete="new-password"
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                        <label className={`sm:col-span-2 flex items-center gap-2 cursor-pointer ${themeTextSub}`}>
                            <input
                                type="checkbox"
                                name="is_active"
                                defaultChecked={editingUser ? editingUser.is_active : true}
                                className="rounded border-zinc-600"
                            />
                            <span className="font-bold">Akun aktif (dapat login)</span>
                        </label>
                    </div>

                    <div className="flex justify-end pt-3 gap-2">
                        <button type="button" onClick={closeUserModal} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>
                            <X className="w-4 h-4" />
                        </button>
                        <button type="submit" title="Simpan" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center">
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={showDeleteModal} onClose={closeDeleteModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className="text-sm font-bold text-rose-500">Hapus User Staff</h3>
                    <button type="button" onClick={closeDeleteModal} className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className={`text-xs mt-3 ${themeTextTitle}`}>
                    Hapus user <strong>{userToDelete?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={closeDeleteModal} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>
                        <X className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={confirmDeleteUser} title="Konfirmasi Hapus" className="p-2 rounded-lg text-white bg-rose-500 hover:bg-rose-600 cursor-pointer inline-flex items-center justify-center">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </TransitionModal>
        </>
    );
}

export default function UsersIndex(props) {
    return (
        <AdminLayout title="Manajemen User">
            <UsersPageContent {...props} />
        </AdminLayout>
    );
}
