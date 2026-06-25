import { FileText } from 'lucide-react';
import { formatLegalText } from './PolicySection';

export default function PublicTermsPreview({
    termsDocument = null,
    termsSections = [],
    variant = 'dark',
    maxSections = 3,
}) {
    const previewSections = termsDocument?.sections
        ? termsDocument.sections.slice(0, maxSections)
        : termsSections.slice(0, maxSections);
    const introduction = termsDocument?.introduction || null;
    const lastUpdated = termsDocument?.last_updated || null;

    if (previewSections.length === 0 && !introduction) {
        return null;
    }

    const titleClass = variant === 'vps' ? 'text-violet-300' : 'text-emerald-400';
    const boxClass = variant === 'vps'
        ? 'border-white/[0.08] bg-white/[0.02]'
        : 'border-slate-800 bg-slate-900/40';
    const textClass = 'text-slate-400';
    const headingClass = variant === 'vps' ? 'text-slate-200' : 'text-slate-200';

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <FileText className={`w-4 h-4 ${titleClass}`} />
                <h2 className={`text-xs font-bold uppercase tracking-[0.2em] ${titleClass}`}>
                    Syarat & Ketentuan
                </h2>
            </div>
            <div className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${boxClass}`}>
                {lastUpdated && (
                    <p className={`text-[11px] font-semibold ${titleClass}`}>
                        Terakhir diperbarui: {lastUpdated}
                    </p>
                )}
                {introduction && (
                    <p className={`text-xs sm:text-sm leading-relaxed ${textClass}`}>
                        {formatLegalText(introduction)}
                    </p>
                )}
                {previewSections.map((section) => (
                    <div key={section.title}>
                        <h3 className={`text-sm font-bold ${headingClass}`}>{section.title}</h3>
                        <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed whitespace-pre-line ${textClass}`}>
                            {section.body || (section.paragraphs || []).join('\n\n')}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
