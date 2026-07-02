import { readFileSync } from 'node:fs';
import {
    clearPending,
    hasPending,
    runBuild,
} from './frontend-build-lib.mjs';

function readStopStatus() {
    try {
        const raw = readFileSync(0, 'utf8').trim();
        if (!raw) {
            return 'completed';
        }

        const payload = JSON.parse(raw);
        return payload.status ?? 'completed';
    } catch {
        return 'completed';
    }
}

const status = readStopStatus();

if (status === 'aborted' || !hasPending()) {
    console.log('{}');
    process.exit(0);
}

clearPending();

try {
    await runBuild();
    console.log('{}');
    process.exit(0);
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(JSON.stringify({
        followup_message: `npm run build gagal setelah perubahan file frontend. Perbaiki error build ini:\n\n${message}`,
    }));
    process.exit(0);
}
