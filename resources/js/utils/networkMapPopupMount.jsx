import { createRoot } from 'react-dom/client';
import NetworkMapCustomerPopup from '../Components/Admin/NetworkMapCustomerPopup';

const roots = new WeakMap();

export function buildMapPopupShellHtml(customerId) {
    return `<div class="map-popup-customer" data-customer-id="${customerId}"><div class="map-popup-react-root"></div></div>`;
}

export function renderNetworkMapCustomerPopup(container, props) {
    if (!container) {
        return;
    }

    let root = roots.get(container);
    if (!root) {
        root = createRoot(container);
        roots.set(container, root);
    }

    root.render(<NetworkMapCustomerPopup {...props} />);
}

export function unmountNetworkMapCustomerPopup(container) {
    if (!container) {
        return;
    }

    const root = roots.get(container);
    if (!root) {
        return;
    }

    root.unmount();
    roots.delete(container);
}
