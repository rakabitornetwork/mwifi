export default function WhatsAppNotifyCheckbox({
    checked,
    onChange,
    disabled = false,
    themeTextDesc = '',
    count = null,
    className = '',
}) {
    const countNote = count != null && count > 1
        ? ` untuk ${count} invoice`
        : '';

    return (
        <label className={`flex items-start gap-2 text-[10px] leading-relaxed cursor-pointer ${themeTextDesc} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange?.(e.target.checked)}
                disabled={disabled}
                className="mt-0.5 rounded border-zinc-400"
            />
            <span>
                Kirim notifikasi WhatsApp ke pelanggan{countNote} (mengikuti jeda bulk gateway)
            </span>
        </label>
    );
}
