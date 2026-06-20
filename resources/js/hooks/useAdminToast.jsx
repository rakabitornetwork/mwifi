import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

const AdminToastContext = createContext(null);

export function AdminToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const { flash } = usePage().props;

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 5000);
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
    }, [flash, showToast]);

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
