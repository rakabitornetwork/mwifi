import { FileText } from 'lucide-react';
import { formatLegalText } from './PolicySection';

export default function PublicTermsPreview({
    termsDocument = null,
    termsSections = [],
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

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-sky-600" />
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
                    Syarat & Ketentuan
                </h2>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                {lastUpdated && (
                    <p className="text-[11px] font-semibold text-sky-600">
                        Terakhir diperbarui: {lastUpdated}
                    </p>
                )}
                {introduction && (
                    <p className="text-xs sm:text-sm leading-relaxed text-slate-500">
                        {formatLegalText(introduction)}
                    </p>
                )}
                {previewSections.map((section) => (
                    <div key={section.title}>
                        <h3 className="text-sm font-bold text-slate-800">{section.title}</h3>
                        <p className="text-xs sm:text-sm mt-1.5 leading-relaxed whitespace-pre-line text-slate-500">
                            {section.body || (section.paragraphs || []).join('\n\n')}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
