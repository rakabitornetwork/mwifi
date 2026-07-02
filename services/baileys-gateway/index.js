const fs = require('fs');
const path = require('path');
const express = require('express');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const axios = require('axios');
const fsPromises = fs.promises;
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    jidDecode,
    getBinaryNodeChild,
    S_WHATSAPP_NET,
    makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const PORT = parseInt(process.env.PORT || '3003', 10);
const API_KEY = (process.env.API_KEY || '').trim();
const DEFAULT_SESSION = (process.env.DEFAULT_SESSION || 'mwifi_session').trim();
const SESSIONS_DIR = path.resolve(process.env.SESSIONS_DIR || './sessions');

fs.mkdirSync(SESSIONS_DIR, { recursive: true });

/** @type {Map<string, { sock: import('@whiskeysockets/baileys').WASocket | null, status: string, qr: string | null, qrDataUrl: string | null, lastError: string | null, profile: { id: string | null, name: string | null, picture_data_url: string | null, has_picture: boolean, picture_updated_at: number | null } | null, profileFetchedAt: number, profilePictureFetchedAt: number, profileFetchInFlight: boolean, initReadyAt: number, credsState: import('@whiskeysockets/baileys').AuthenticationState | null, profileAvatarPath: string | null, reconnectTimer: ReturnType<typeof setTimeout> | null, reconnectAttempts: number }>} */
const sessions = new Map();

const INIT_QUERY_GRACE_MS = parseInt(process.env.INIT_QUERY_GRACE_MS || '12000', 10);
const ACK_WAIT_MS = parseInt(process.env.SEND_ACK_WAIT_MS || '15000', 10);

/** @type {Map<string, string>} messageId -> WhatsApp ack error code */
const outboundAckErrors = new Map();

const logger = pino({
    level: process.env.LOG_LEVEL || 'warn',
    hooks: {
        logMethod(inputArgs, method) {
            const payload = inputArgs.find((arg) => arg && typeof arg === 'object' && arg.attrs);
            if (payload?.msg === 'received error in ack' && payload.attrs?.id && payload.attrs?.error) {
                outboundAckErrors.set(String(payload.attrs.id), String(payload.attrs.error));
            }

            return method.apply(this, inputArgs);
        },
    },
});

function authMiddleware(req, res, next) {
    if (!API_KEY) {
        return next();
    }

    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const apiKeyHeader = (req.headers['x-api-key'] || '').trim();

    if (bearer === API_KEY || apiKeyHeader === API_KEY) {
        return next();
    }

    return res.status(401).json({ success: false, message: 'Unauthorized' });
}

function sanitizeSessionId(sessionId) {
    return String(sessionId || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 64);
}

function normalizePhone(to) {
    let digits = String(to || '').replace(/\D/g, '');
    if (digits.startsWith('0')) {
        digits = `62${digits.slice(1)}`;
    }
    return digits;
}

function jidMatchesMessageKey(keyA, keyB) {
    if (!keyA?.id || !keyB?.id || keyA.id !== keyB.id) {
        return false;
    }

    const userA = (keyA.remoteJid || '').split('@')[0];
    const userB = (keyB.remoteJid || '').split('@')[0];

    return userA === userB || keyA.remoteJid === keyB.remoteJid;
}

function describeDeliveryFailure(errorCode) {
    if (errorCode === '463') {
        return 'WhatsApp menolak pengiriman (error 463). Nomor tujuan belum pernah berinteraksi dengan akun ini. '
            + 'Minta penerima mengirim pesan dulu ke nomor Tesla Tech, lalu coba kirim ulang.';
    }

    if (errorCode) {
        return `WhatsApp menolak pengiriman (error ${errorCode}).`;
    }

    return 'WhatsApp tidak mengonfirmasi pesan terkirim. Kemungkinan kontak baru (error 463) atau koneksi tidak stabil.';
}

function waitForOutboundAck(sock, messageKey, timeoutMs = ACK_WAIT_MS) {
    const messageId = messageKey?.id;

    return new Promise((resolve, reject) => {
        let settled = false;

        const finish = (fn, value) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            sock.ev.off('messages.update', onUpdate);
            fn(value);
        };

        const failWithCode = (code) => {
            finish(reject, new Error(describeDeliveryFailure(code)));
        };

        if (messageId && outboundAckErrors.has(messageId)) {
            failWithCode(outboundAckErrors.get(messageId));
            return;
        }

        const timer = setTimeout(() => {
            if (messageId && outboundAckErrors.has(messageId)) {
                failWithCode(outboundAckErrors.get(messageId));
                return;
            }

            failWithCode(null);
        }, timeoutMs);

        const onUpdate = (updates) => {
            for (const { key, update } of updates) {
                if (!jidMatchesMessageKey(key, messageKey)) {
                    continue;
                }

                if (messageId && outboundAckErrors.has(messageId)) {
                    failWithCode(outboundAckErrors.get(messageId));
                    return;
                }

                const status = update?.status;
                if (typeof status === 'number' && status >= 2) {
                    finish(resolve, { status, messageId: key.id });
                    return;
                }

                if (status === 0) {
                    failWithCode('failed');
                }
            }
        };

        sock.ev.on('messages.update', onUpdate);
    });
}

function getSessionMeta(sessionId) {
    const id = sanitizeSessionId(sessionId);
    if (!sessions.has(id)) {
        sessions.set(id, {
            sock: null,
            status: 'idle',
            qr: null,
            qrDataUrl: null,
            lastError: null,
            profile: null,
            profileFetchedAt: 0,
            profilePictureFetchedAt: 0,
            profileFetchInFlight: false,
            initReadyAt: 0,
            credsState: null,
            profileAvatarPath: null,
            reconnectTimer: null,
            reconnectAttempts: 0,
        });
    }
    return { id, meta: sessions.get(id) };
}

function getAvatarFilePath(sessionLabel) {
    return path.join(SESSIONS_DIR, sessionLabel, 'linked-avatar.jpg');
}

function bufferToDataUrl(buffer, mime = 'image/jpeg') {
    return `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
}

function resolveLinkedIdentity(sock, credsState = null) {
    const me = sock?.authState?.creds?.me || credsState?.creds?.me || {};
    const user = sock?.user || {};

    let phoneJid = null;

    if (me.phoneNumber) {
        phoneJid = jidNormalizedUser(me.phoneNumber);
    }

    const idCandidates = [me.id, user.id, me.lid, me.phoneNumber].filter(Boolean);

    if (!phoneJid) {
        for (const candidate of idCandidates) {
            if (!candidate || String(candidate).endsWith('@lid')) {
                continue;
            }

            const decoded = jidDecode(candidate);
            if (decoded?.server === 's.whatsapp.net' || decoded?.server === 'c.us') {
                phoneJid = jidNormalizedUser(candidate);
                break;
            }
        }
    }

    const lidJid = me.lid
        || idCandidates.find((candidate) => String(candidate).endsWith('@lid'))
        || null;

    const pictureJids = [...new Set(
        [phoneJid, me.phoneNumber, lidJid, me.id, user.id]
            .filter(Boolean)
            .map((jid) => jidNormalizedUser(jid))
            .filter(Boolean)
    )];

    const phone = phoneJid
        ? (jidDecode(phoneJid)?.user || null)
        : (me.phoneNumber ? (jidDecode(me.phoneNumber)?.user || null) : null);
    const name = String(
        me.name
        || user.name
        || user.notify
        || user.verifiedName
        || me.notify
        || me.verifiedName
        || sock?.authState?.creds?.pushName
        || ''
    ).trim() || null;

    return {
        phone,
        name,
        pictureJids,
    };
}

function applyLinkedIdentityFromCreds(meta, sock) {
    const identity = resolveLinkedIdentity(sock, meta.credsState);

    meta.profile = {
        id: identity.phone,
        name: identity.name,
        picture_data_url: null,
        has_picture: meta.profile?.has_picture ?? false,
        picture_updated_at: meta.profile?.picture_updated_at ?? null,
    };
    meta.profileFetchedAt = Date.now();
}

function syncProfilePictureFromCache(meta, sessionLabel) {
    const avatarPath = meta.profileAvatarPath || getAvatarFilePath(sessionLabel);

    if (!fs.existsSync(avatarPath)) {
        return;
    }

    const stats = fs.statSync(avatarPath);
    if (stats.size <= 0) {
        return;
    }

    meta.profileAvatarPath = avatarPath;
    meta.profile = {
        ...(meta.profile || {}),
        picture_data_url: null,
        has_picture: true,
        picture_updated_at: meta.profile?.picture_updated_at ?? Math.floor(stats.mtimeMs),
    };
}

async function queryProfilePictureBuffer(sock, { targetJid = null, type = 'image', timeoutMs = 8000 } = {}) {
    if (!sock?.query) {
        return null;
    }

    const attrs = {
        to: S_WHATSAPP_NET,
        type: 'get',
        xmlns: 'w:profile:picture',
    };

    if (targetJid) {
        attrs.target = jidNormalizedUser(targetJid);
    }

    const result = await sock.query({
        tag: 'iq',
        attrs,
        content: [{ tag: 'picture', attrs: { type } }],
    }, timeoutMs);

    const child = getBinaryNodeChild(result, 'picture');
    if (!child) {
        return null;
    }

    if (Buffer.isBuffer(child.content) || child.content instanceof Uint8Array) {
        const mime = child.attrs?.mimetype || 'image/jpeg';

        return {
            buffer: Buffer.from(child.content),
            mime,
        };
    }

    if (child.attrs?.url) {
        const response = await axios.get(child.attrs.url, {
            responseType: 'arraybuffer',
            timeout: timeoutMs,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Origin: 'https://web.whatsapp.com',
                Referer: 'https://web.whatsapp.com/',
            },
            validateStatus: (status) => status >= 200 && status < 400,
        });

        if (response.data?.byteLength > 0) {
            return {
                buffer: Buffer.from(response.data),
                mime: response.headers['content-type'] || 'image/jpeg',
            };
        }
    }

    return null;
}

async function fetchProfilePictureBuffer(sock, pictureJids, { timeoutMs = 8000 } = {}) {
    const types = ['image', 'preview'];

    try {
        for (const type of types) {
            const ownPicture = await queryProfilePictureBuffer(sock, { type, timeoutMs });
            if (ownPicture?.buffer?.length) {
                return ownPicture;
            }
        }
    } catch (error) {
        console.warn(`[profile] own picture query failed: ${error.message}`);
    }

    for (const jid of pictureJids) {
        if (!jid) {
            continue;
        }

        for (const type of types) {
            try {
                const targeted = await queryProfilePictureBuffer(sock, { targetJid: jid, type, timeoutMs });
                if (targeted?.buffer?.length) {
                    return targeted;
                }
            } catch (error) {
                console.warn(`[profile] picture query failed for ${jid} (${type}): ${error.message}`);
            }

            try {
                const pictureUrl = await sock.profilePictureUrl(jid, type, timeoutMs);
                if (!pictureUrl) {
                    continue;
                }

                const response = await axios.get(pictureUrl, {
                    responseType: 'arraybuffer',
                    timeout: timeoutMs,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                        Origin: 'https://web.whatsapp.com',
                        Referer: 'https://web.whatsapp.com/',
                    },
                    validateStatus: (status) => status >= 200 && status < 400,
                });

                if (response.data?.byteLength > 0) {
                    return {
                        buffer: Buffer.from(response.data),
                        mime: response.headers['content-type'] || 'image/jpeg',
                    };
                }
            } catch (error) {
                console.warn(`[profile] picture url fetch failed for ${jid} (${type}): ${error.message}`);
            }
        }
    }

    return null;
}

async function saveAvatarFile(sessionLabel, buffer, mime = 'image/jpeg') {
    const filePath = getAvatarFilePath(sessionLabel);
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
    await fsPromises.writeFile(filePath, buffer);

    return filePath;
}

async function refreshLinkedProfilePicture(meta, sock, sessionLabel, { forceNetwork = false } = {}) {
    if (!sock || meta.profileFetchInFlight) {
        return;
    }

    if (!forceNetwork && meta.initReadyAt && Date.now() < meta.initReadyAt) {
        syncProfilePictureFromCache(meta, sessionLabel);
        return;
    }

    meta.profileFetchInFlight = true;

    try {
        const identity = resolveLinkedIdentity(sock, meta.credsState);
        applyLinkedIdentityFromCreds(meta, sock);

        let hasPicture = Boolean(meta.profile?.has_picture);
        let pictureUpdatedAt = meta.profile?.picture_updated_at ?? null;
        let avatarPath = meta.profileAvatarPath;

        syncProfilePictureFromCache(meta, sessionLabel);
        hasPicture = Boolean(meta.profile?.has_picture);
        avatarPath = meta.profileAvatarPath;

        const shouldFetchFromNetwork = forceNetwork || !hasPicture;

        if (shouldFetchFromNetwork) {
            const picture = await fetchProfilePictureBuffer(sock, identity.pictureJids, { timeoutMs: 8000 });
            if (picture?.buffer?.length) {
                avatarPath = await saveAvatarFile(sessionLabel, picture.buffer, picture.mime);
                meta.profileAvatarPath = avatarPath;
                hasPicture = true;
                pictureUpdatedAt = Date.now();
            }
        }

        if (!hasPicture) {
            syncProfilePictureFromCache(meta, sessionLabel);
            hasPicture = Boolean(meta.profile?.has_picture);
        }

        meta.profile = {
            id: identity.phone,
            name: identity.name,
            picture_data_url: null,
            has_picture: hasPicture,
            picture_updated_at: pictureUpdatedAt,
        };
        meta.profilePictureFetchedAt = Date.now();

        console.log(
            `[${sessionLabel}] Linked profile: name=${meta.profile.name || '-'} phone=${meta.profile.id || '-'} photo=${hasPicture ? 'yes' : 'no'}`
        );
    } finally {
        meta.profileFetchInFlight = false;
    }
}

function scheduleProfilePictureFetch(meta, sock, sessionLabel) {
    const delays = [
        INIT_QUERY_GRACE_MS,
        INIT_QUERY_GRACE_MS + 8000,
        INIT_QUERY_GRACE_MS + 20000,
    ];

    for (const delay of delays) {
        setTimeout(() => {
            if (meta.status === 'open' && meta.sock) {
                refreshLinkedProfilePicture(meta, meta.sock, sessionLabel, { forceNetwork: false }).catch((err) => {
                    console.error(`[${sessionLabel}] Delayed profile picture fetch failed:`, err.message);
                });
            }
        }, delay);
    }
}

function markInitGracePeriod(meta) {
    meta.initReadyAt = Date.now() + INIT_QUERY_GRACE_MS;
}

async function ensureLinkedProfile(meta, sock, sessionLabel, force = false) {
    if (!sock || meta.status !== 'open') {
        return;
    }

    applyLinkedIdentityFromCreds(meta, sock);
    syncProfilePictureFromCache(meta, sessionLabel);

    if (!force) {
        return;
    }

    const now = Date.now();
    const pictureAge = meta.profilePictureFetchedAt ? now - meta.profilePictureFetchedAt : Number.POSITIVE_INFINITY;

    if (pictureAge < 15000) {
        return;
    }

    await refreshLinkedProfilePicture(meta, sock, sessionLabel, { forceNetwork: true });
}

function clearReconnectTimer(meta) {
    if (meta.reconnectTimer) {
        clearTimeout(meta.reconnectTimer);
        meta.reconnectTimer = null;
    }
}

async function renderQrDataUrl(meta) {
    if (!meta.qr) {
        meta.qrDataUrl = null;
        return null;
    }

    try {
        meta.qrDataUrl = await QRCode.toDataURL(meta.qr, { margin: 1, width: 280 });
    } catch (error) {
        console.error('Failed to render QR image:', error.message);
        meta.qrDataUrl = null;
    }

    return meta.qrDataUrl;
}

async function connectSession(sessionId) {
    const { id, meta } = getSessionMeta(sessionId);

    // Jangan buat socket baru saat sesi sudah aktif (termasuk menunggu scan QR).
    if (meta.sock && ['open', 'connecting', 'qr'].includes(meta.status)) {
        return meta;
    }

    clearReconnectTimer(meta);

    if (meta.sock && !['open', 'connecting', 'qr'].includes(meta.status)) {
        try {
            meta.sock.end(undefined);
        } catch (error) {
            console.warn(`[${id}] Failed to close stale socket: ${error.message}`);
        }
        meta.sock = null;
    }

    meta.status = 'connecting';
    meta.lastError = null;
    meta.qr = null;
    meta.qrDataUrl = null;

    const authDir = path.join(SESSIONS_DIR, id);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    meta.credsState = state;
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        printQRInTerminal: false,
        browser: ['mwifi', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        fireInitQueries: true,
        generateHighQualityLinkPreview: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 2000,
        getMessage: async () => undefined,
    });

    meta.sock = sock;

    sock.ev.on('creds.update', () => {
        saveCreds();

        if (meta.status === 'open') {
            applyLinkedIdentityFromCreds(meta, sock);
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            meta.qr = qr;
            meta.status = 'qr';
            renderQrDataUrl(meta).catch((err) => {
                console.error(`[${id}] Failed to cache QR image:`, err.message);
            });
            console.log(`[${id}] Scan QR code below to link WhatsApp:`);
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            meta.status = 'open';
            meta.qr = null;
            meta.qrDataUrl = null;
            meta.reconnectAttempts = 0;
            clearReconnectTimer(meta);
            meta.lastError = null;
            markInitGracePeriod(meta);
            console.log(`[${id}] WhatsApp connected. Waiting ${INIT_QUERY_GRACE_MS}ms before profile picture fetch.`);
            applyLinkedIdentityFromCreds(meta, sock);
            scheduleProfilePictureFetch(meta, sock, id);
        }

        if (connection === 'close') {
            meta.sock = null;
            meta.profile = null;
            meta.qr = null;
            meta.qrDataUrl = null;
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const loggedOut = statusCode === DisconnectReason.loggedOut;
            meta.status = loggedOut ? 'logged_out' : 'closed';
            meta.lastError = lastDisconnect?.error?.message || 'Connection closed';

            if (loggedOut) {
                clearReconnectTimer(meta);
                meta.reconnectAttempts = 0;
                console.log(`[${id}] Logged out. Delete folder ${authDir} and scan QR again.`);
                return;
            }

            if (meta.reconnectTimer) {
                return;
            }

            meta.reconnectAttempts += 1;
            const delayMs = Math.min(30000, 3000 * meta.reconnectAttempts);
            console.log(`[${id}] Connection closed, reconnecting in ${Math.round(delayMs / 1000)}s (attempt ${meta.reconnectAttempts})...`);
            meta.reconnectTimer = setTimeout(() => {
                meta.reconnectTimer = null;
                connectSession(id).catch((err) => {
                    meta.status = 'error';
                    meta.lastError = err.message;
                    console.error(`[${id}] Reconnect failed:`, err.message);
                });
            }, delayMs);
        }
    });

    return meta;
}

async function resetSession(sessionId) {
    const { id, meta } = getSessionMeta(sessionId);

    if (meta.sock) {
        try {
            meta.sock.end(undefined);
        } catch (error) {
            console.warn(`[${id}] Failed to close socket during reset: ${error.message}`);
        }
    }

    const authDir = path.join(SESSIONS_DIR, id);
    if (fs.existsSync(authDir)) {
        await fsPromises.rm(authDir, { recursive: true, force: true });
    }

    clearReconnectTimer(meta);

    sessions.set(id, {
        sock: null,
        status: 'idle',
        qr: null,
        qrDataUrl: null,
        lastError: null,
        profile: null,
        profileFetchedAt: 0,
        profilePictureFetchedAt: 0,
        profileFetchInFlight: false,
        initReadyAt: 0,
        credsState: null,
        profileAvatarPath: null,
        reconnectTimer: null,
        reconnectAttempts: 0,
    });

    console.log(`[${id}] Session reset. Scan QR again to link a WhatsApp number.`);

    return sessions.get(id);
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
    res.json({
        success: true,
        service: 'mwifi-baileys-gateway',
        port: PORT,
        default_session: DEFAULT_SESSION,
    });
});

app.get('/session/:sessionId/status', authMiddleware, async (req, res) => {
    const { id, meta } = getSessionMeta(req.params.sessionId);

    if (meta.status === 'open' && meta.sock) {
        applyLinkedIdentityFromCreds(meta, meta.sock);
        syncProfilePictureFromCache(meta, id);

        if (req.query.profile === '1') {
            try {
                await refreshLinkedProfilePicture(meta, meta.sock, id, { forceNetwork: true });
            } catch (error) {
                console.error(`[${id}] Profile refresh on status failed:`, error.message);
            }
        }
    }

    if (meta.qr && !meta.qrDataUrl) {
        await renderQrDataUrl(meta);
    }

    res.json({
        success: true,
        session: id,
        status: meta.status,
        has_qr: Boolean(meta.qr),
        qr_data_url: meta.qrDataUrl,
        last_error: meta.lastError,
        profile: meta.profile,
    });
});

app.post('/session/:sessionId/start', authMiddleware, async (req, res) => {
    try {
        const meta = await connectSession(req.params.sessionId);
        res.json({
            success: true,
            session: sanitizeSessionId(req.params.sessionId),
            status: meta.status,
            message: meta.status === 'open'
                ? 'Already connected'
                : 'Session starting. Scan QR in the admin panel (Pengaturan → WhatsApp).',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/session/:sessionId/reset', authMiddleware, async (req, res) => {
    try {
        const meta = await resetSession(req.params.sessionId);
        res.json({
            success: true,
            session: sanitizeSessionId(req.params.sessionId),
            status: meta.status,
            message: 'Sesi dihapus. Mulai ulang dan scan QR untuk nomor WhatsApp baru.',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/session/:sessionId/profile/refresh', authMiddleware, async (req, res) => {
    const { id, meta } = getSessionMeta(req.params.sessionId);

    if (meta.status !== 'open' || !meta.sock) {
        return res.status(503).json({
            success: false,
            message: 'WhatsApp session is not connected.',
            session: id,
            status: meta.status,
        });
    }

    try {
        await refreshLinkedProfilePicture(meta, meta.sock, id, { forceNetwork: true });

        return res.json({
            success: true,
            session: id,
            status: meta.status,
            profile: meta.profile,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/session/:sessionId/profile/avatar', authMiddleware, (req, res) => {
    const { id, meta } = getSessionMeta(req.params.sessionId);
    const avatarPath = meta.profileAvatarPath || getAvatarFilePath(id);

    if (!fs.existsSync(avatarPath)) {
        return res.status(404).json({ success: false, message: 'Avatar not available.' });
    }

    return res.sendFile(avatarPath, {
        headers: {
            'Cache-Control': 'private, max-age=300',
        },
    });
});

app.post('/send-message', authMiddleware, async (req, res) => {
    const sessionId = req.body.session || DEFAULT_SESSION;
    const to = normalizePhone(req.body.to);
    const text = String(req.body.text || '').trim();

    if (!to || !text) {
        return res.status(400).json({
            success: false,
            message: 'Fields "to" and "text" are required',
        });
    }

    try {
        const { meta } = getSessionMeta(sessionId);

        if (meta.status !== 'open' || !meta.sock) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp session is not connected yet. Scan QR code in Pengaturan → WhatsApp Gateway.',
                session: sanitizeSessionId(sessionId),
                status: meta.status,
            });
        }

        let jid = `${to}@s.whatsapp.net`;

        // Verifikasi nomor benar-benar terdaftar di WhatsApp. Tanpa ini, sendMessage
        // ke JID yang tidak ada tetap "berhasil" (resolve) tapi pesan tidak pernah sampai.
        try {
            const [result] = await meta.sock.onWhatsApp(to);
            if (!result?.exists) {
                return res.status(422).json({
                    success: false,
                    message: `Nomor ${to} tidak terdaftar di WhatsApp.`,
                    session: sanitizeSessionId(sessionId),
                    to,
                });
            }
            if (result.jid) {
                jid = result.jid;
            }
        } catch (checkError) {
            console.warn(`[send-message] onWhatsApp check failed for ${to}: ${checkError.message}`);
        }

        const sendResult = await meta.sock.sendMessage(jid, { text });
        const messageId = sendResult?.key?.id || null;

        if (messageId) {
            try {
                await waitForOutboundAck(meta.sock, sendResult.key);
            } catch (ackError) {
                const whatsappError = messageId ? (outboundAckErrors.get(messageId) || '463') : '463';
                if (messageId) {
                    outboundAckErrors.delete(messageId);
                }

                return res.status(422).json({
                    success: false,
                    message: ackError.message || describeDeliveryFailure(whatsappError),
                    session: sanitizeSessionId(sessionId),
                    to,
                    jid,
                    message_id: messageId,
                    whatsapp_error: whatsappError,
                });
            }

            outboundAckErrors.delete(messageId);
        }

        return res.json({
            success: true,
            message: 'Message sent successfully',
            session: sanitizeSessionId(sessionId),
            to,
            jid,
            message_id: sendResult?.key?.id || null,
        });
    } catch (error) {
        console.error('send-message error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to send message',
        });
    }
});

app.listen(PORT, () => {
    console.log(`mwifi Baileys gateway listening on http://127.0.0.1:${PORT}`);
    console.log(`Default session: ${DEFAULT_SESSION}`);
    console.log(`Sessions directory: ${SESSIONS_DIR}`);

    connectSession(DEFAULT_SESSION).catch((err) => {
        console.error(`Failed to start default session: ${err.message}`);
    });
});
