const express = require('express');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const PREFIX = process.env.SESSION_PREFIX || 'DEVIL~';
const DEV_NUMBER = process.env.DEV_NUMBER || '923447861706';
const BOT_NAME = process.env.BOT_NAME || 'DEVIL-MD';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ============ SESSION STORE ============ */
const sessions = new Map();       // sessionId -> session object
const rateLimits = new Map();     // ip -> timestamps[]
const activeNumbers = new Map();  // number -> sessionId (prevent duplicates)

const SESSION_ROOT = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSION_ROOT)) fs.mkdirSync(SESSION_ROOT, { recursive: true });

/* ============ CLEANUP ============ */
function cleanupSessionDir(dir) {
  setTimeout(() => {
    try {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) { /* silent */ }
  }, 5 * 60 * 1000); // 5 minutes
}

function killSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return;
  try { s.sock?.end?.(new Error('closed')); } catch {}
  try { s.sock?.ws?.close?.(); } catch {}
  sessions.delete(sessionId);
  if (s.number) activeNumbers.delete(s.number);
}

/* ============ RATE LIMIT ============ */
function rateLimit(ip, max = 5, windowMs = 60000) {
  const now = Date.now();
  const arr = (rateLimits.get(ip) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  rateLimits.set(ip, arr);
  return true;
}

/* ============ NUMBER VALIDATION ============ */
function validateNumber(num) {
  if (!num || typeof num !== 'string') return false;
  const clean = num.replace(/\D/g, '');
  if (clean.length < 10 || clean.length > 15) return false;
  return clean;
}

/* ============ SESSION STRING BUILDER ============ */
function buildSessionString(sessionDir) {
  const credsPath = path.join(sessionDir, 'creds.json');
  if (!fs.existsSync(credsPath)) throw new Error('creds.json missing');
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const b64 = Buffer.from(JSON.stringify(creds)).toString('base64');
  return PREFIX + b64;
}

/* ============ CREATE BAILEYS SOCKET ============ */
async function createSocket(sessionDir) {
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const logger = pino({ level: 'silent' });
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  return { sock, saveCreds };
}

/* ============ ENDPOINT: PAIR CODE ============ */
app.post('/api/pair', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Wait a minute.' });
  }

  const number = validateNumber(req.body?.number);
  if (!number) {
    return res.status(400).json({ error: 'Invalid number. Use country code without + or spaces.' });
  }

  if (activeNumbers.has(number)) {
    return res.status(409).json({ error: 'This number already has an active session. Wait or use QR.' });
  }

  const sessionId = 'pair_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const sessionDir = path.join(SESSION_ROOT, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const { sock, saveCreds } = await createSocket(sessionDir);
    const sessionObj = {
      sock,
      saveCreds,
      sessionDir,
      number,
      type: 'pair',
      createdAt: Date.now(),
      status: 'pending',
      pairCode: null,
      sessionString: null,
      listenersAttached: false,
    };
    sessions.set(sessionId, sessionObj);
    activeNumbers.set(number, sessionId);

    await delay(1200);
    const rawCode = await sock.requestPairingCode(number);
    // WhatsApp returns like "ABCD1234" — display with dash but user types raw
    const displayCode = rawCode.match(/.{1,4}/g)?.join('-') || rawCode;
    sessionObj.pairCode = rawCode;

    // Attach listeners ONCE
    attachListeners(sessionId);

    return res.json({
      sessionId,
      pairCode: displayCode,
      rawCode,
    });
  } catch (err) {
    console.error('Pair error:', err?.message || err);
    killSession(sessionId);
    cleanupSessionDir(sessionDir);
    return res.status(500).json({ error: 'Failed to generate pair code. Try again.' });
  }
});

/* ============ ENDPOINT: QR ============ */
app.post('/api/qr', async (req, res) => {
  const ip = req.ip || 'unknown';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Wait a minute.' });
  }

  const sessionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const sessionDir = path.join(SESSION_ROOT, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const { sock, saveCreds } = await createSocket(sessionDir);
    const sessionObj = {
      sock,
      saveCreds,
      sessionDir,
      type: 'qr',
      createdAt: Date.now(),
      status: 'pending',
      qr: null,
      sessionString: null,
      lastQrAt: 0,
      listenersAttached: false,
    };
    sessions.set(sessionId, sessionObj);

    attachListeners(sessionId);

    // Wait for first QR (max 15s)
    const startTime = Date.now();
    while (Date.now() - startTime < 15000) {
      if (sessionObj.qr) break;
      await delay(300);
    }

    if (!sessionObj.qr) {
      killSession(sessionId);
      cleanupSessionDir(sessionDir);
      return res.status(500).json({ error: 'QR generation timeout.' });
    }

    const dataUrl = await QRCode.toDataURL(sessionObj.qr, {
      width: 340,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });

    return res.json({ sessionId, qr: dataUrl });
  } catch (err) {
    console.error('QR error:', err?.message || err);
    killSession(sessionId);
    cleanupSessionDir(sessionDir);
    return res.status(500).json({ error: 'Failed to generate QR.' });
  }
});

/* ============ ENDPOINT: REFRESH QR ============ */
app.get('/api/qr-refresh/:sessionId', async (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s || s.type !== 'qr') return res.status(404).json({ error: 'Not found.' });
  if (!s.qr) return res.status(404).json({ error: 'No QR available.' });

  try {
    const dataUrl = await QRCode.toDataURL(s.qr, {
      width: 340,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    return res.json({ qr: dataUrl });
  } catch {
    return res.status(500).json({ error: 'QR refresh failed.' });
  }
});

/* ============ ENDPOINT: STATUS ============ */
app.get('/api/status/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found.' });

  if (s.status === 'connected' && s.sessionString) {
    return res.json({ status: 'connected', sessionId: s.sessionString });
  }
  if (s.status === 'failed') {
    return res.json({ status: 'failed', reason: s.reason || 'unknown' });
  }
  return res.json({ status: 'pending' });
});

/* ============ ATTACH LISTENERS (ONCE) ============ */
function attachListeners(sessionId) {
  const s = sessions.get(sessionId);
  if (!s || s.listenersAttached) return;
  s.listenersAttached = true;

  s.sock.ev.on('creds.update', s.saveCreds);

  s.sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && s.type === 'qr') {
      s.qr = qr;
      s.lastQrAt = Date.now();
    }

    if (connection === 'open') {
      s.status = 'connecting';
      await delay(1800);
      try {
        s.sessionString = buildSessionString(s.sessionDir);
        s.status = 'connected';
        // Gracefully close socket — creds are saved
        try { s.sock.ws?.close(); } catch {}
        try { s.sock.end?.(new Error('done')); } catch {}
      } catch (e) {
        s.status = 'failed';
        s.reason = 'creds_build_failed';
      }
      cleanupSessionDir(s.sessionDir);
      if (s.number) activeNumbers.delete(s.number);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        s.status = 'failed';
        s.reason = 'logged_out';
        cleanupSessionDir(s.sessionDir);
        if (s.number) activeNumbers.delete(s.number);
      } else if (s.status !== 'connected') {
        // Reconnect logic for QR expiry
        s.status = 'pending';
      }
    }
  });

  // Auto-kill stale sessions (5 min)
  setTimeout(() => {
    const cur = sessions.get(sessionId);
    if (cur && cur.status !== 'connected') {
      killSession(sessionId);
      cleanupSessionDir(cur.sessionDir);
    }
  }, 5 * 60 * 1000);
}

/* ============ CONFIG ============ */
app.get('/api/config', (req, res) => {
  res.json({ botName: BOT_NAME, devNumber: DEV_NUMBER, prefix: PREFIX });
});

/* ============ HEALTH ============ */
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

/* ============ GRACEFUL SHUTDOWN ============ */
process.on('SIGTERM', () => {
  sessions.forEach((_, id) => killSession(id));
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🔥 ${BOT_NAME} Session Server → http://localhost:${PORT}`);
});
