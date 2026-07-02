import { readFileSync } from 'node:fs';
import {
    extractEditedPath,
    isFrontendAsset,
    markPending,
} from './frontend-build-lib.mjs';

function readHookInput() {
    try {
        const raw = readFileSync(0, 'utf8').trim();
        if (!raw) {
            return null;
        }

        return JSON.parse(raw);
    } catch {
        return null;
    }
}

const payload = readHookInput();
const editedPath = extractEditedPath(payload);

if (isFrontendAsset(editedPath)) {
    markPending();
}

process.exit(0);
