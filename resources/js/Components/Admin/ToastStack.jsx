import { AlertCircle, CheckCircle2, Sliders, X } from 'lucide-react';

export default function ToastStack({ toasts, setToasts, isDarkMode }) {
    return (
        <>
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((toast) => {
                    const isSuccess = toast.type === 'success';
                    const isError = toast.type === 'error';
                    const isWarning = toast.type === 'warning';

                    let cardStyles = '';
                    let iconColor = '';
                    let IconComponent = CheckCircle2;

                    if (isSuccess) {
                        cardStyles = isDarkMode
                            ? 'bg-emerald-950/80 border-emerald-500/40 border-l-emerald-500 text-emerald-100'
                            : 'bg-emerald-50 border-emerald-300 border-l-emerald-500 text-emerald-900';
                        iconColor = 'text-emerald-500 dark:text-emerald-400';
                        IconComponent = CheckCircle2;
                    } else if (isError) {
                        cardStyles = isDarkMode
                            ? 'bg-rose-950/80 border-rose-500/40 border-l-rose-500 text-rose-100'
                            : 'bg-rose-50 border-rose-300 border-l-rose-500 text-rose-900';
                        iconColor = 'text-rose-500 dark:text-rose-400';
                        IconComponent = AlertCircle;
                    } else if (isWarning) {
                        cardStyles = isDarkMode
                            ? 'bg-amber-950/80 border-amber-500/40 border-l-amber-500 text-amber-100'
                            : 'bg-amber-50 border-amber-300 border-l-amber-500 text-amber-900';
                        iconColor = 'text-amber-500 dark:text-amber-400';
                        IconComponent = AlertCircle;
                    } else {
                        cardStyles = isDarkMode
                            ? 'bg-blue-950/80 border-blue-500/40 border-l-blue-500 text-blue-100'
                            : 'bg-blue-50 border-blue-300 border-l-blue-500 text-blue-900';
                        iconColor = 'text-blue-500 dark:text-blue-400';
                        IconComponent = Sliders;
                    }

                    return (
                        <div
                            key={toast.id}
                            className={`p-3.5 border border-l-4 rounded-xl shadow-lg backdrop-blur-md flex items-start space-x-3 pointer-events-auto transition-all duration-300 transform translate-x-0 animate-slide-in ${cardStyles}`}
                        >
                            <IconComponent className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
                            <div className="flex-1 text-xs font-semibold leading-relaxed">
                                {toast.message}
                            </div>
                            <button
                                type="button"
                                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                                className="text-current opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in {
                    animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </>
    );
}
