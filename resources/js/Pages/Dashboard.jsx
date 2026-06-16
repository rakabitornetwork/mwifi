import React from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    Users, 
    Wifi, 
    CreditCard, 
    MessageSquare, 
    Layers, 
    Settings, 
    LogOut, 
    Activity, 
    TrendingUp, 
    AlertCircle, 
    CheckCircle2 
} from 'lucide-react';

export default function Dashboard({ auth }) {
    const handleLogout = () => {
        router.post('/logout');
    };

    // Mock statistics data
    const stats = [
        { name: 'Pelanggan Aktif', value: '248', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { name: 'Pelanggan Terisolir', value: '12', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        { name: 'Tagihan Terbayar', value: 'Rp 28.450.000', icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        { name: 'Router Terkoneksi', value: '3 / 4', icon: Wifi, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    ];

    // Mock customer list
    const recentCustomers = [
        { id: 1, name: 'Budi Santoso', username: 'budi_pppoe', type: 'PPPoE', package: 'Family 20 Mbps', status: 'active' },
        { id: 2, name: 'Siti Rahma', username: 'siti_hotspot', type: 'Hotspot', package: 'Voucher 5 Mbps', status: 'active' },
        { id: 3, name: 'Joko Widodo', username: 'joko_pppoe', type: 'PPPoE', package: 'Family 10 Mbps', status: 'isolated' },
        { id: 4, name: 'Dewi Lestari', username: 'dewi_pppoe', type: 'PPPoE', package: 'SOHO 50 Mbps', status: 'active' },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex">
                
                {/* Sidebar */}
                <aside className="w-64 border-r border-slate-900 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between p-6 hidden md:flex">
                    <div className="space-y-8">
                        {/* Logo */}
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h3a2.25 2.25 0 0 1 2.25 2.25V9M1.5 13.5h21m-21 0a2.25 2.25 0 0 0-2.25 2.25v5.25a2.25 2.25 0 0 0 2.25 2.25h21a2.25 2.25 0 0 0 2.25-2.25v-5.25a2.25 2.25 0 0 0-2.25-2.25m-21 0V9a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 9v4.5m-2.25 0a2.25 2.25 0 0 1-2.25 2.25h-12a2.25 2.25 0 0 1-2.25-2.25" />
                                </svg>
                            </div>
                            <span className="font-extrabold text-xl tracking-tight text-emerald-400">mWiFi</span>
                        </div>

                        {/* Navigation Links */}
                        <nav className="space-y-1">
                            <a href="/dashboard" className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-semibold text-sm transition-all duration-200">
                                <Activity className="w-5 h-5" />
                                <span>Dashboard</span>
                            </a>
                            <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 font-medium text-sm transition-all duration-200">
                                <Wifi className="w-5 h-5" />
                                <span>Router Mikrotik</span>
                            </a>
                            <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 font-medium text-sm transition-all duration-200">
                                <Layers className="w-5 h-5" />
                                <span>GenieACS (ONU)</span>
                            </a>
                            <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 font-medium text-sm transition-all duration-200">
                                <Users className="w-5 h-5" />
                                <span>Pelanggan</span>
                            </a>
                            <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 font-medium text-sm transition-all duration-200">
                                <CreditCard className="w-5 h-5" />
                                <span>Tagihan / Billing</span>
                            </a>
                            <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 font-medium text-sm transition-all duration-200">
                                <MessageSquare className="w-5 h-5" />
                                <span>WhatsApp API</span>
                            </a>
                            <a href="#" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 font-medium text-sm transition-all duration-200">
                                <Settings className="w-5 h-5" />
                                <span>Pengaturan</span>
                            </a>
                        </nav>
                    </div>

                    {/* User Profile & Logout */}
                    <div className="border-t border-slate-900 pt-6 space-y-4">
                        <div className="flex items-center space-x-3 px-2">
                            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm">
                                SA
                            </div>
                            <div className="truncate">
                                <p className="text-sm font-semibold text-white">{auth.user.name}</p>
                                <p className="text-xs text-slate-500 truncate">{auth.user.email}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/5 font-semibold text-sm transition-all duration-200 cursor-pointer"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Keluar</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
                    {/* Header */}
                    <header className="h-16 border-b border-slate-900 flex items-center justify-between px-8 bg-slate-950/40 backdrop-blur-md">
                        <div className="flex items-center space-x-2">
                            <h2 className="text-lg font-bold text-white">Ringkasan Sistem</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> WA Connected
                            </span>
                        </div>
                        <div className="text-sm text-slate-400 font-medium">
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </header>

                    {/* Content Body */}
                    <div className="p-8 space-y-8 max-w-7xl w-full mx-auto">
                        
                        {/* Welcome Banner */}
                        <div className="bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))] from-emerald-900/15 via-slate-900 to-slate-900 border border-slate-800/60 rounded-3xl p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="space-y-2">
                                <h1 className="text-3xl font-extrabold tracking-tight text-white">Halo, {auth.user.name}!</h1>
                                <p className="text-slate-400 font-medium max-w-lg">Panel kontrol mWiFi RT RW NET Anda aktif. Semua gateway pembayaran otomatis dan daemon WhatsApp berjalan lancar.</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-400/20 transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-sm">
                                    + Tambah Pelanggan
                                </button>
                                <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700/50 transition-all duration-200 cursor-pointer text-sm">
                                    Lihat Tagihan
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {stats.map((stat, idx) => {
                                const Icon = stat.icon;
                                return (
                                    <div key={idx} className={`p-6 rounded-2xl border ${stat.bg} shadow-lg space-y-4`}>
                                        <div className="flex justify-between items-start">
                                            <span className="text-slate-400 text-sm font-semibold tracking-wide uppercase">{stat.name}</span>
                                            <div className={`p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 ${stat.color}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-black text-white">{stat.value}</h3>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Data Sections */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            
                            {/* Recent Activity Table */}
                            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white">Aktivitas Pelanggan Baru</h3>
                                    <a href="#" className="text-emerald-400 hover:text-emerald-300 text-sm font-bold">Semua Pelanggan →</a>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-900 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                                <th className="pb-4">Nama / Username</th>
                                                <th className="pb-4">Tipe / Layanan</th>
                                                <th className="pb-4">Paket Internet</th>
                                                <th className="pb-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-900/50 text-sm font-medium">
                                            {recentCustomers.map((customer) => (
                                                <tr key={customer.id} className="hover:bg-slate-900/20">
                                                    <td className="py-4">
                                                        <p className="text-white">{customer.name}</p>
                                                        <p className="text-slate-500 text-xs mt-0.5">{customer.username}</p>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className="px-2.5 py-0.5 rounded-md text-xs bg-slate-950 border border-slate-800 text-slate-400">
                                                            {customer.type}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-slate-300">{customer.package}</td>
                                                    <td className="py-4 text-right">
                                                        {customer.status === 'active' ? (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                Aktif
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                                                Terisolir
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Router Status Widget */}
                            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-xl space-y-6">
                                <h3 className="text-lg font-bold text-white">Monitoring OLT / Router</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm text-white">Mikrotik CHR - Core</p>
                                            <p className="text-slate-500 text-xs">IP: 103.84.12.98</p>
                                        </div>
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    </div>
                                    <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm text-white">Mikrotik OLT - Wilayah A</p>
                                            <p className="text-slate-500 text-xs">IP: 10.12.44.1</p>
                                        </div>
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    </div>
                                    <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm text-white">Router Wilayah B (Socket v6)</p>
                                            <p className="text-slate-500 text-xs">IP: 10.12.45.1</p>
                                        </div>
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </main>

            </div>
        </>
    );
}
