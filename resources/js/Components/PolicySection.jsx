function formatLegalText(text, isDark = false) {
    if (!text) {
        return null;
    }

    return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className={`${isDark ? 'text-slate-200' : 'text-slate-700'} font-semibold`}>{part.slice(2, -2)}</strong>;
        }

        return <span key={index}>{part}</span>;
    });
}

function ContactItems({ items = [], isDark = false }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <ul className={`mt-3 space-y-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {items.map((item) => (
                <li key={`${item.label}-${item.value}`}>
                    <span className={`font-semibold ${isDark ? 'text-slate-350' : 'text-slate-700'}`}>{item.label}:</span>{' '}
                    {item.href ? (
                        <a href={item.href} className={`${isDark ? 'text-indigo-450 hover:text-indigo-400' : 'text-sky-600 hover:text-sky-700'} hover:underline`}>
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
                                className={`${isDark ? 'text-indigo-450 hover:text-indigo-400' : 'text-sky-600 hover:text-sky-700'} hover:underline`}
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

export function PolicySection({ section, isDark = false }) {
    return (
        <section className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 ${isDark ? 'border-slate-900 bg-slate-900/30' : 'border-slate-200/90 bg-white shadow-sm'}`}>
            <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{section.title}</h2>

            {(section.paragraphs || []).map((paragraph) => (
                <p key={paragraph} className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {formatLegalText(paragraph, isDark)}
                </p>
            ))}

            {section.body && (
                <p className={`text-sm mt-2 leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {section.body}
                </p>
            )}

            {section.list && section.list.length > 0 && (
                <ul className={`mt-3 space-y-2 text-sm list-disc pl-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {section.list.map((item) => (
                        <li key={item} className="leading-relaxed">{item}</li>
                    ))}
                </ul>
            )}

            {section.ordered_list && section.ordered_list.length > 0 && (
                <ol className={`mt-3 space-y-2 text-sm list-decimal pl-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {section.ordered_list.map((item) => (
                        <li key={item} className="leading-relaxed">{item}</li>
                    ))}
                </ol>
            )}

            {section.contact_items && <ContactItems items={section.contact_items} isDark={isDark} />}
        </section>
    );
}

export { formatLegalText };
