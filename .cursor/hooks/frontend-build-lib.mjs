import { spawn } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hooksDir = dirname(fileURLToPath(import.meta.url));
export const projectRoot = join(hooksDir, '..', '..');
export const pendingFlagPath = join(hooksDir, '.build-frontend.pending');

const frontendAssetPattern =
    /(?:^|[\\/])(resources[\\/](?:js|css)[\\/]|vite\.config\.[jt]s$|tailwind\.config\.[jt]s$)/i;

export function isFrontendAsset(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return false;
    }

    return frontendAssetPattern.test(filePath.replace(/\\/g, '/'));
}

export function extractEditedPath(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    if (typeof payload.file_path === 'string') {
        return payload.file_path;
    }

    const toolInput = payload.tool_input;
    if (toolInput && typeof toolInput === 'object') {
        if (typeof toolInput.path === 'string') {
            return toolInput.path;
        }

        if (typeof toolInput.file_path === 'string') {
            return toolInput.file_path;
        }
    }

    return null;
}

export function markPending() {
    writeFileSync(pendingFlagPath, String(Date.now()), 'utf8');
}

export function hasPending() {
    return existsSync(pendingFlagPath);
}

export function clearPending() {
    if (existsSync(pendingFlagPath)) {
        unlinkSync(pendingFlagPath);
    }
}

export function runBuild() {
    return new Promise((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'npm.cmd' : 'npm';
        const child = spawn(command, ['run', 'build'], {
            cwd: projectRoot,
            stdio: 'inherit',
            shell: isWindows,
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`npm run build exited with code ${code ?? 'unknown'}`));
        });
    });
}
