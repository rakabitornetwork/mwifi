/**
 * Format a calendar date for <input type="date"> without UTC off-by-one shifts.
 */
export function formatDateInputValue(value) {
    if (value == null || value === '') {
        return '';
    }

    const str = String(value).trim();
    const dateOnly = str.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly && !str.includes('T')) {
        return dateOnly[1];
    }

    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) {
        return dateOnly?.[1] ?? '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function todayDateInputValue() {
    return formatDateInputValue(new Date());
}

export function formatDisplayDate(value, locale = 'id-ID') {
    const dateValue = formatDateInputValue(value);
    if (!dateValue) {
        return '-';
    }

    const [year, month, day] = dateValue.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) {
        return dateValue;
    }

    return parsed.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function resolveCustomerDueDate(customer) {
    if (!customer) {
        return null;
    }

    return customer.billing_date || customer.upcoming_due_date || null;
}
