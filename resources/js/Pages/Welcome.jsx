import React from 'react';

export default function Welcome() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans p-6">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {/* Placeholder custom logo */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h3a2.25 2.25 0 0 1 2.25 2.25V9M1.5 13.5h21m-21 0a2.25 2.25 0 0 0-2.25 2.25v5.25a2.25 2.25 0 0 0 2.25 2.25h21a2.25 2.25 0 0 0 2.25-2.25v-5.25a2.25 2.25 0 0 0-2.25-2.25m-21 0V9a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 9v4.5m-2.25 0a2.25 2.25 0 0 1-2.25 2.25h-12a2.25 2.25 0 0 1-2.25-2.25" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-emerald-400">mWiFi RT RW NET</h1>
                    <p className="text-slate-400 mt-2 font-medium">Aplikasi Manajemen Pelanggan & Billing Terintegrasi</p>
                </div>
                <div className="border-t border-slate-800 pt-6">
                    <p className="text-sm text-slate-500">
                        Pilar arsitektur Laravel 13 + Inertia + React + Tailwind CSS v4
                    </p>
                </div>
            </div>
        </div>
    );
}
