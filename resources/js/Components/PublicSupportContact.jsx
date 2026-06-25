import { Mail, MapPin, Phone } from 'lucide-react';

function contactRow(Icon, label, value, href) {
    if (!value) {
        return null;
    }

    return (
        <li className="flex items-start gap-3">
            <Icon className="w-4 h-4 shrink-0 mt-0.5 text-sky-500/80" />
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-sm font-medium mt-0.5 break-words text-slate-600">
                    {href ? (
                        <a href={href} className="text-sky-600 hover:text-sky-700 hover:underline underline-offset-2">
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
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-sky-700">
                Kontak Support
            </h2>
            {companyName && (
                <p className="text-sm font-bold text-slate-800 mb-4">{companyName}</p>
            )}
            {!hasContact ? (
                <p className="text-sm text-slate-500">
                    Informasi kontak belum dikonfigurasi di pengaturan admin.
                </p>
            ) : (
                <ul className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                    {contactRow(Mail, 'Email', email, emailHref)}
                    {contactRow(Phone, 'Telepon / WhatsApp', phone, phoneHref)}
                    {contactRow(MapPin, 'Alamat', address, null)}
                    {website && contactRow(MapPin, 'Website', website, websiteHref)}
                </ul>
            )}
        </div>
    );
}
