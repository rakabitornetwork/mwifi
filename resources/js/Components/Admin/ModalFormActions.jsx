import { Save, X } from 'lucide-react';
import { useMobileViewport } from '../../hooks/useMobileViewport';

const cancelButtonClass = (isDarkMode) =>
    `p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${
        isDarkMode
            ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
            : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
    }`;

const mobileBarClass = (isDarkMode) =>
    `flex justify-end gap-2 rounded-2xl border px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm ${
        isDarkMode ? 'border-zinc-800/60 bg-zinc-900/95' : 'border-zinc-200 bg-white/95'
    }`;

export default function ModalFormActions({
    isDarkMode = false,
    onCancel,
    cancelTitle = 'Batal',
    submitTitle = 'Simpan',
    submitDisabled = false,
    submitClassName = 'p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center disabled:opacity-50',
    children,
}) {
    const isMobile = useMobileViewport();

    const buttons = (
        <>
            <button type="button" onClick={onCancel} title={cancelTitle} className={cancelButtonClass(isDarkMode)}>
                <X className="w-4 h-4" />
            </button>
            {children ?? (
                <button type="submit" disabled={submitDisabled} title={submitTitle} className={submitClassName}>
                    <Save className="w-4 h-4" />
                </button>
            )}
        </>
    );

    if (isMobile) {
        return (
            <>
                <div className="h-[4.5rem] shrink-0" aria-hidden="true" />
                <div
                    className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none px-3"
                    style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                >
                    <div className={`pointer-events-auto ${mobileBarClass(isDarkMode)}`}>
                        {buttons}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="flex justify-end pt-3 gap-2">
            {buttons}
        </div>
    );
}
