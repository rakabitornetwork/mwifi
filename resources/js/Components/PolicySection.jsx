function formatLegalText(text) {
    if (!text) {
        return null;
    }

    return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="text-slate-200 font-semibold">{part.slice(2, -2)}</strong>;
        }

        return <span key={index}>{part}</span>;
    });
}

function ContactItems({ items = [] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {items.map((item) => (
                <li key={`${item.label}-${item.value}`}>
                    <span className="font-semibold text-slate-300">{item.label}:</span>{' '}
                    {item.href ? (
                        <a href={item.href} className="text-violet-300 hover:text-violet-200 hover:underline">
                            {item.value}
                        </a>
                    ) : (
                        <span>{item.value}</span>
                    )}
                    {item.extra_href && item.extra_label && (
                        <>
                            {' '}
                            &middot;{' '}
                            <a
                                href={item.extra_href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-violet-300 hover:text-violet-200 hover:underline"
                            >
                                {item.extra_label}
                            </a>
                        </>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function PolicySection({ section, variant = 'vps' }) {
    const textClass = variant === 'vps' ? 'text-slate-400' : 'text-slate-400';
    const titleClass = variant === 'vps' ? 'text-white' : 'text-slate-100';

    return (
        <section className={`rounded-2xl border p-5 sm:p-6 ${
            variant === 'vps'
                ? 'border-white/[0.08] bg-white/[0.02]'
                : 'border-slate-800 bg-slate-900/40'
        }`}>
            <h2 className={`text-base font-bold ${titleClass}`}>{section.title}</h2>

            {(section.paragraphs || []).map((paragraph) => (
                <p key={paragraph} className={`text-sm mt-2 leading-relaxed ${textClass}`}>
                    {formatLegalText(paragraph)}
                </p>
            ))}

            {section.body && (
                <p className={`text-sm mt-2 leading-relaxed whitespace-pre-line ${textClass}`}>
                    {section.body}
                </p>
            )}

            {section.list && section.list.length > 0 && (
                <ul className={`mt-3 space-y-2 text-sm list-disc pl-5 ${textClass}`}>
                    {section.list.map((item) => (
                        <li key={item} className="leading-relaxed">{item}</li>
                    ))}
                </ul>
            )}

            {section.ordered_list && section.ordered_list.length > 0 && (
                <ol className={`mt-3 space-y-2 text-sm list-decimal pl-5 ${textClass}`}>
                    {section.ordered_list.map((item) => (
                        <li key={item} className="leading-relaxed">{item}</li>
                    ))}
                </ol>
            )}

            {section.contact_items && <ContactItems items={section.contact_items} />}
        </section>
    );
}

export { formatLegalText };
