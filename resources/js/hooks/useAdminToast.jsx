import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

const AdminToastContext = createContext(null);

export function AdminToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const { flash } = usePage().props;

    const showToast = useCallback((message, type = 'success') => {
        if (!message) {
            return;
        }

        setToasts((prev) => {
            if (prev.some((toast) => toast.message === message && toast.type === type)) {
                return prev;
            }

            const id = Date.now() + Math.random().toString(36).substr(2, 9);
            setTimeout(() => {
                setToasts((current) => current.filter((toast) => toast.id !== id));
            }, 5000);

            return [...prev, { id, message, type }];
        });
    }, []);

    useEffect(() => {
        if (flash?.success) {
            showToast(flash.success, 'success');
        }
        if (flash?.error) {
            showToast(flash.error, 'error');
        }
        if (flash?.warning) {
            showToast(flash.warning, 'warning');
        }
        if (flash?.info) {
            showToast(flash.info, 'info');
        }
    }, [flash?.id, flash?.success, flash?.error, flash?.warning, flash?.info, showToast]);

    return (
        <AdminToastContext.Provider value={{ toasts, setToasts, showToast }}>
            {children}
        </AdminToastContext.Provider>
    );
}

export function useAdminToast() {
    const context = useContext(AdminToastContext);
    if (!context) {
        throw new Error('useAdminToast must be used within AdminToastProvider');
    }
    return context;
}

const noopToastApi = {
    toasts: [],
    setToasts: () => {},
    showToast: () => {},
    hasProvider: false,
};

export function useOptionalAdminToast() {
    const context = useContext(AdminToastContext);
    if (!context) {
        return noopToastApi;
    }

    return { ...context, hasProvider: true };
}
