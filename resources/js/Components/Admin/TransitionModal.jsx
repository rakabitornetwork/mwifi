import { useEffect, useState } from 'react';

export default function TransitionModal({
    show,
    onClose,
    children,
    maxWidth = 'md',
    className = '',
    themeCard = '',
}) {
    const [render, setRender] = useState(show);
    const [animateShow, setAnimateShow] = useState(show);

    useEffect(() => {
        if (show) {
            setRender(true);
            const timer = setTimeout(() => setAnimateShow(true), 10);
            return () => clearTimeout(timer);
        }

        setAnimateShow(false);
        const timer = setTimeout(() => setRender(false), 300);
        return () => clearTimeout(timer);
    }, [show]);

    useEffect(() => {
        if (!show || !onClose) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [show, onClose]);

    if (!render) {
        return null;
    }

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    const handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) {
            onClose?.();
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${animateShow ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`w-full ${maxWidthClasses[maxWidth] || 'max-w-md'} border rounded-2xl p-6 space-y-4 shadow-xl ${themeCard} transition-all duration-300 ease-out transform ${animateShow ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} ${className}`}
            >
                {children}
            </div>
        </div>
    );
}
