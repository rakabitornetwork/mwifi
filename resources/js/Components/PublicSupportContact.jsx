import { Mail, MapPin, Phone } from 'lucide-react';

function contactRow(Icon, label, value, href, linkClass) {
    if (!value) {
        return null;
    }

    const content = href ? (
        <a href={href} className={linkClass}>
            {value}
        </a>
    ) : (
        <span>{value}</span>
    );

    return (
        <li className="flex items-start gap-3">
            <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
                <p className="text-sm font-medium mt-0.5 break-words">{content}</p>
            </div>
        </li>
    );
}

export default function PublicSupportContact({
    branding = {},
    variant = 'dark',
    className = '',
}) {
    const {
        company_name: companyName,
        company_email: email,
        company_phone: phone,
        company_address: address,
        company_website: website,
    } = branding;

    const hasContact = email || phone || address;

    if (!hasContact) {
        return (
            <div className={className}>
                <h2 className={`text-sm font-bold uppercase tracking-wider mb-2 ${variant === 'vps' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Kontak Support
                </h2>
                <p className={`text-sm ${variant === 'vps' ? 'text-slate-500' : 'text-slate-600'}`}>
                    Informasi kontak belum dikonfigurasi di pengaturan admin.
                </p>
            </div>
        );
    }

    const titleClass = variant === 'vps' ? 'text-violet-300' : 'text-emerald-400';
    const boxClass = variant === 'vps'
        ? 'border-white/[0.08] bg-white/[0.03] text-slate-300'
        : 'border-slate-800 bg-slate-900/60 text-slate-300';
    const linkClass = variant === 'vps'
        ? 'text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline'
        : 'text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline';

    const phoneHref = phone ? `tel:${phone.replace(/\s+/g, '')}` : null;
    const emailHref = email ? `mailto:${email}` : null;
    const websiteHref = website && !website.startsWith('http') ? `https://${website}` : website;

    return (
        <div className={className}>
            <h2 className={`text-xs font-bold uppercase tracking-[0.2em] mb-4 ${titleClass}`}>
                Kontak Support
            </h2>
            {companyName && (
                <p className="text-sm font-bold text-white mb-4">{companyName}</p>
            )}
            <ul className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${boxClass}`}>
                {contactRow(Mail, 'Email', email, emailHref, linkClass)}
                {contactRow(Phone, 'Telepon / WhatsApp', phone, phoneHref, linkClass)}
                {contactRow(MapPin, 'Alamat', address, null, linkClass)}
                {website && contactRow(
                    MapPin,
                    'Website',
                    website,
                    websiteHref,
                    linkClass,
                )}
            </ul>
        </div>
    );
}
