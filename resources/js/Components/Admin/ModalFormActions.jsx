import { Save, X } from 'lucide-react';

const cancelButtonClass = (isDarkMode) =>
    `p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${
        isDarkMode
            ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
            : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
    }`;

const stickyBarClass = (isDarkMode) =>
    `sticky bottom-0 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mt-1 flex justify-end gap-2 border-t backdrop-blur-sm ${
        isDarkMode ? 'border-zinc-800/40 bg-zinc-900/95' : 'border-zinc-200 bg-white/95'
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
    const cancelButton = (
        <button type="button" onClick={onCancel} title={cancelTitle} className={cancelButtonClass(isDarkMode)}>
            <X className="w-4 h-4" />
        </button>
    );

    const submitButton = children ?? (
        <button type="submit" disabled={submitDisabled} title={submitTitle} className={submitClassName}>
            <Save className="w-4 h-4" />
        </button>
    );

    return (
        <>
            <div className="hidden sm:flex justify-end pt-3 gap-2">
                {cancelButton}
                {submitButton}
            </div>
            <div className={`sm:hidden ${stickyBarClass(isDarkMode)}`}>
                {cancelButton}
                {submitButton}
            </div>
        </>
    );
}
