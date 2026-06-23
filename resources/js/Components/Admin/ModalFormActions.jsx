import { cloneElement, isValidElement, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import { useMobileViewport } from '../../hooks/useMobileViewport';

const cancelButtonClass = (isDarkMode) =>
    `p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${
        isDarkMode
            ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
            : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
    }`;

const mobileBarClass = (isDarkMode) =>
    `flex justify-end gap-2 rounded-2xl border px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] backdrop-blur-md ${
        isDarkMode ? 'border-zinc-700/80 bg-zinc-900/98' : 'border-zinc-200 bg-white/98'
    }`;

export default function ModalFormActions({
    formId,
    isDarkMode = false,
    onCancel,
    cancelTitle = 'Batal',
    submitTitle = 'Simpan',
    submitDisabled = false,
    submitClassName = 'p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center disabled:opacity-50',
    children,
}) {
    const isMobile = useMobileViewport();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const submitButton = children
        ? (isValidElement(children) ? cloneElement(children, { form: formId }) : children)
        : (
            <button type="submit" form={formId} disabled={submitDisabled} title={submitTitle} className={submitClassName}>
                <Save className="w-4 h-4" />
            </button>
        );

    const buttons = (
        <>
            <button type="button" onClick={onCancel} title={cancelTitle} className={cancelButtonClass(isDarkMode)}>
                <X className="w-4 h-4" />
            </button>
            {submitButton}
        </>
    );

    if (isMobile && mounted) {
        return (
            <>
                <div className="h-[4.5rem] shrink-0" aria-hidden="true" />
                {createPortal(
                    <div
                        className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none px-3"
                        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                    >
                        <div className={`pointer-events-auto ${mobileBarClass(isDarkMode)}`}>
                            {buttons}
                        </div>
                    </div>,
                    document.body,
                )}
            </>
        );
    }

    if (isMobile) {
        return <div className="h-[4.5rem] shrink-0" aria-hidden="true" />;
    }

    return (
        <div className="flex justify-end pt-3 gap-2">
            {buttons}
        </div>
    );
}
