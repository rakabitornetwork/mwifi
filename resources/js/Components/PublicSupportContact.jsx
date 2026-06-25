import { Mail, MapPin, Phone } from 'lucide-react';

function contactRow(Icon, label, value, href, isDark = false) {
    if (!value) {
        return null;
    }

    return (
        <li className="flex items-start gap-3">
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-indigo-400' : 'text-sky-500/80'}`} />
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className={`text-sm font-medium mt-0.5 break-words ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {href ? (
                        <a href={href} className={`${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-sky-600 hover:text-sky-700'} hover:underline underline-offset-2`}>
                            {value}
                        </a>
                    ) : (
                        value
                    )}
                </p>
            </div>
        </li>
    );
}

export default function PublicSupportContact({
    branding = {},
    className = '',
    isDark = false,
}) {
    const {
        company_name: companyName,
        company_email: email,
        company_phone: phone,
        company_address: address,
        company_website: website,
    } = branding;

    const hasContact = email || phone || address;
    const phoneHref = phone ? `tel:${phone.replace(/\s+/g, '')}` : null;
    const emailHref = email ? `mailto:${email}` : null;
    const websiteHref = website && !website.startsWith('http') ? `https://${website}` : website;

    return (
        <div id="kontak" className={className}>
            <h2 className={`text-xs font-bold uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-indigo-400' : 'text-sky-700'}`}>
                Kontak Support
            </h2>
            {companyName && (
                <p className={`text-sm font-bold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{companyName}</p>
            )}
            {!hasContact ? (
                <p className="text-sm text-slate-500">
                    Informasi kontak belum dikonfigurasi di pengaturan admin.
                </p>
            ) : (
                <ul className={`rounded-3xl border p-4 sm:p-5 space-y-4 transition-all duration-300 ${isDark ? 'border-slate-900 bg-slate-900/30' : 'border-slate-200/90 bg-white shadow-sm'}`}>
                    {contactRow(Mail, 'Email', email, emailHref, isDark)}
                    {contactRow(Phone, 'Telepon / WhatsApp', phone, phoneHref, isDark)}
                    {contactRow(MapPin, 'Alamat', address, null, isDark)}
                    {website && contactRow(MapPin, 'Website', website, websiteHref, isDark)}
                </ul>
            )}
        </div>
    );
}
