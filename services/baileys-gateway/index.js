const fs = require('fs');
const path = require('path');
const express = require('express');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

const PORT = parseInt(process.env.PORT || '3003', 10);
const API_KEY = (process.env.API_KEY || '').trim();
const DEFAULT_SESSION = (process.env.DEFAULT_SESSION || 'mwifi_session').trim();
const SESSIONS_DIR = path.resolve(process.env.SESSIONS_DIR || './sessions');

fs.mkdirSync(SESSIONS_DIR, { recursive: true });

/** @type {Map<string, { sock: import('@whiskeysockets/baileys').WASocket | null, status: string, qr: string | null, lastError: string | null }>} */
const sessions = new Map();

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

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

function getSessionMeta(sessionId) {
    const id = sanitizeSessionId(sessionId);
    if (!sessions.has(id)) {
        sessions.set(id, { sock: null, status: 'idle', qr: null, lastError: null });
    }
    return { id, meta: sessions.get(id) };
}

async function connectSession(sessionId) {
    const { id, meta } = getSessionMeta(sessionId);

    if (meta.sock && (meta.status === 'open' || meta.status === 'connecting')) {
        return meta;
    }

    meta.status = 'connecting';
    meta.lastError = null;

    const authDir = path.join(SESSIONS_DIR, id);
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['mwifi', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
    });

    meta.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            meta.qr = qr;
            meta.status = 'qr';
            console.log(`[${id}] Scan QR code below to link WhatsApp:`);
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            meta.status = 'open';
            meta.qr = null;
            meta.lastError = null;
            console.log(`[${id}] WhatsApp connected.`);
        }

        if (connection === 'close') {
            meta.sock = null;
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const loggedOut = statusCode === DisconnectReason.loggedOut;
            meta.status = loggedOut ? 'logged_out' : 'closed';
            meta.lastError = lastDisconnect?.error?.message || 'Connection closed';

            if (loggedOut) {
                console.log(`[${id}] Logged out. Delete folder ${authDir} and scan QR again.`);
                return;
            }

            console.log(`[${id}] Connection closed, reconnecting in 3s...`);
            setTimeout(() => {
                connectSession(id).catch((err) => {
                    meta.status = 'error';
                    meta.lastError = err.message;
                    console.error(`[${id}] Reconnect failed:`, err.message);
                });
            }, 3000);
        }
    });

    return meta;
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

    let qrDataUrl = null;
    if (meta.qr) {
        try {
            qrDataUrl = await QRCode.toDataURL(meta.qr, { margin: 1, width: 280 });
        } catch (error) {
            console.error(`[${id}] Failed to render QR image:`, error.message);
        }
    }

    res.json({
        success: true,
        session: id,
        status: meta.status,
        has_qr: Boolean(meta.qr),
        qr_data_url: qrDataUrl,
        last_error: meta.lastError,
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
        const meta = await connectSession(sessionId);

        if (meta.status !== 'open' || !meta.sock) {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp session is not connected yet. Scan QR code in Pengaturan → WhatsApp Gateway.',
                session: sanitizeSessionId(sessionId),
                status: meta.status,
            });
        }

        const jid = `${to}@s.whatsapp.net`;
        await meta.sock.sendMessage(jid, { text });

        return res.json({
            success: true,
            message: 'Message sent successfully',
            session: sanitizeSessionId(sessionId),
            to,
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
