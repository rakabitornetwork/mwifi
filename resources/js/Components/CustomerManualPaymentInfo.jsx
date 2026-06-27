import { Banknote, Building2, Info, MessageCircle, Smartphone } from 'lucide-react';

function formatWhatsAppHref(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) {
        return null;
    }

    return `https://wa.me/${digits.startsWith('62') ? digits : `62${digits.replace(/^0/, '')}`}`;
}

export default function CustomerManualPaymentInfo({
    portalPayment = {},
    isDarkMode = true,
    themeTextSub = '',
    themeTextDesc = '',
    themeTextTitle = '',
    compact = false,
}) {
    const bank = portalPayment.bank || {};
    const dana = portalPayment.dana || {};
    const whatsapp = portalPayment.whatsapp || '';
    const waHref = formatWhatsAppHref(whatsapp);
    const shellClass = isDarkMode
        ? 'border-amber-500/20 bg-amber-500/5'
        : 'border-amber-300/70 bg-amber-50/80';

    return (
        <div className={`rounded-xl border p-3 space-y-3 ${shellClass} ${compact ? 'sm:w-52 lg:w-56' : ''}`}>
            <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">
                        Pembayaran Manual
                    </p>
                    <p className={`text-[10px] leading-relaxed ${themeTextSub}`}>
                        Pembayaran online gateway sementara dinonaktifkan
                        {portalPayment.gateway_sandbox ? ' (mode sandbox)' : ''}.
                        Saat ini tagihan dapat dibayar melalui:
                    </p>
                </div>
            </div>

            <ul className={`space-y-2 text-[10px] ${themeTextSub}`}>
                <li className="flex items-start gap-2">
                    <Banknote className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span><b className={themeTextTitle}>Tunai (cash)</b> — bayar langsung ke kantor/teknisi kami.</span>
                </li>

                {bank.configured ? (
                    <li className="flex items-start gap-2">
                        <Building2 className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                        <span className="min-w-0">
                            <b className={themeTextTitle}>Transfer bank</b>
                            {bank.name ? <> — {bank.name}</> : null}
                            {bank.account_number ? (
                                <span className="block font-mono font-bold mt-0.5 break-all">{bank.account_number}</span>
                            ) : null}
                            {bank.account_holder ? (
                                <span className={`block ${themeTextDesc}`}>a.n. {bank.account_holder}</span>
                            ) : null}
                        </span>
                    </li>
                ) : null}

                {dana.configured ? (
                    <li className="flex items-start gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                        <span className="min-w-0">
                            <b className={themeTextTitle}>E-Wallet DANA</b>
                            {dana.number ? (
                                <span className="block font-mono font-bold mt-0.5 break-all">{dana.number}</span>
                            ) : null}
                            {dana.account_holder ? (
                                <span className={`block ${themeTextDesc}`}>a.n. {dana.account_holder}</span>
                            ) : null}
                        </span>
                    </li>
                ) : null}
            </ul>

            {whatsapp ? (
                <div className={`rounded-lg border px-2.5 py-2 ${isDarkMode ? 'border-zinc-800/60 bg-zinc-950/30' : 'border-zinc-200 bg-white/80'}`}>
                    <div className="flex items-start gap-2">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>
                            Setelah transfer, kirim bukti bayar ke WhatsApp:
                            {waHref ? (
                                <>
                                    {' '}
                                    <a
                                        href={waHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-emerald-500 hover:underline break-all"
                                    >
                                        {whatsapp}
                                    </a>
                                </>
                            ) : (
                                <span className={`font-bold ${themeTextTitle}`}> {whatsapp}</span>
                            )}
                        </p>
                    </div>
                </div>
            ) : (
                <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>
                    Setelah transfer, hubungi admin kami untuk konfirmasi pembayaran.
                </p>
            )}
        </div>
    );
}
