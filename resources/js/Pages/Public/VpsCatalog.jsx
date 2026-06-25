import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Check,
    Cpu,
    HardDrive,
    LogIn,
    Network,
    Server,
    Shield,
    Zap,
} from 'lucide-react';
import SeoHead from '../../Components/SeoHead';
import AppFooter from '../../Components/AppFooter';
import BrandingTagline from '../../Components/BrandingTagline';
import { formatRupiah } from '../../utils/formatRupiah';

const features = [
  'SSD NVMe performa tinggi',
  'Panel manajemen server',
  'IPv4 dedicated',
  'Backup mingguan',
  'Monitoring 24/7',
  'Dukungan teknis via WhatsApp',
];

export default function VpsCatalog({
  pageTitle,
  pageDescription,
  plans = [],
  canOrder = false,
  isLoggedIn = false,
  customerName = null,
  activeGateway = 'midtrans',
  catalogUrl = '/layanan/vps',
}) {
  const { branding = {} } = usePage().props;
  const [orderingPlan, setOrderingPlan] = useState(null);

  const handleOrder = async (planId) => {
    if (!isLoggedIn) {
      window.location.href = `/portal?redirect=${encodeURIComponent(catalogUrl)}`;
      return;
    }

    if (!canOrder) {
      alert('Akun Anda belum diizinkan memesan layanan VPS ini. Hubungi administrator.');
      return;
    }

    setOrderingPlan(planId);

    try {
      const response = await fetch('/customer/vps/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          plan_id: planId,
          payment_method: activeGateway === 'midtrans' || activeGateway === 'duitku' ? 'all' : 'qris',
        }),
      });

      const result = await response.json();

      if (response.status === 401 && result.login_url) {
        window.location.href = result.login_url;
        return;
      }

      if (result.success && result.payment_url) {
        window.location.href = result.payment_url;
        return;
      }

      alert(result.message || 'Gagal memproses pembayaran.');
    } catch {
      alert('Terjadi kesalahan koneksi. Coba lagi.');
    } finally {
      setOrderingPlan(null);
    }
  };

  return (
    <>
      <SeoHead title={pageTitle} description={pageDescription} branding={branding} />
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
        <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{branding.company_name || 'Cloud VPS'}</p>
                <p className="text-[11px] text-slate-500 truncate">Layanan Sewa Virtual Private Server</p>
              </div>
            </div>
            {!isLoggedIn ? (
              <Link
                href={`/portal?redirect=${encodeURIComponent(catalogUrl)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold shrink-0"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
            ) : (
              <div className="text-right text-xs text-slate-400 shrink-0">
                <p>Halo, <span className="text-slate-200 font-semibold">{customerName}</span></p>
                {canOrder ? (
                  <p className="text-emerald-400">Akun diizinkan memesan</p>
                ) : (
                  <p className="text-amber-400">Hanya melihat katalog</p>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1">
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/30 via-slate-950 to-slate-950" />
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
              <div className="max-w-3xl">
                <p className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3">Cloud Infrastructure</p>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  {pageTitle}
                </h1>
                <BrandingTagline lines={3} className="text-slate-400 mt-4 text-base sm:text-lg leading-relaxed">
                  {pageDescription}
                </BrandingTagline>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-10">
                {[
                  { icon: Zap, label: 'Deploy cepat', desc: 'Server siap dalam hitungan menit' },
                  { icon: Shield, label: 'Aman & stabil', desc: 'Infrastruktur data center tier-3' },
                  { icon: Network, label: 'Jaringan cepat', desc: 'Low latency untuk aplikasi produksi' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                    <Icon className="w-5 h-5 text-violet-400 mb-2" />
                    <p className="font-bold text-sm text-white">{label}</p>
                    <p className="text-xs text-slate-500 mt-1">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Pilih Paket VPS</h2>
              <p className="text-slate-400 mt-2 text-sm">Tagihan bulanan · Bayar via Midtrans (QRIS, e-wallet, VA)</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    plan.featured
                      ? 'border-violet-500/50 bg-gradient-to-b from-violet-500/10 to-slate-900/80 shadow-xl shadow-violet-500/10'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold uppercase tracking-wide">
                      Paling Populer
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[2.5rem]">{plan.description}</p>
                  <p className="mt-5 text-3xl font-extrabold text-white">
                    {formatRupiah(plan.price)}
                    <span className="text-sm font-medium text-slate-500">/bln</span>
                  </p>

                  <ul className="mt-6 space-y-2.5 text-sm text-slate-300 flex-1">
                    <li className="flex items-center gap-2"><Cpu className="w-4 h-4 text-violet-400" />{plan.cpu}</li>
                    <li className="flex items-center gap-2"><Server className="w-4 h-4 text-violet-400" />{plan.ram}</li>
                    <li className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-violet-400" />{plan.storage}</li>
                    <li className="flex items-center gap-2"><Network className="w-4 h-4 text-violet-400" />{plan.bandwidth}</li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleOrder(plan.id)}
                    disabled={orderingPlan === plan.id}
                    className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all ${
                      plan.featured
                        ? 'bg-violet-500 hover:bg-violet-400 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    } disabled:opacity-60`}
                  >
                    {orderingPlan === plan.id ? 'Memproses...' : isLoggedIn && canOrder ? 'Pesan & Bayar' : isLoggedIn ? 'Hubungi Admin' : 'Login untuk Pesan'}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="border-t border-slate-800 bg-slate-900/30">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
              <h2 className="text-xl font-bold text-white mb-6">Fitur Termasuk Semua Paket</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <AppFooter
          branding={branding}
          className="py-4 px-6 border-t border-slate-800 text-center"
          textClassName="text-xs sm:text-sm text-slate-500 leading-relaxed"
        />
      </div>
    </>
  );
}
