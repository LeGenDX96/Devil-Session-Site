const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, delay, DisconnectReason, makeCacheableSignalKeyStore, Browsers } = require('@whiskeysockets/baileys');
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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory session store
const sessions = new Map();

function createSessionStore() {
  const dir = path.join(__dirname, 'sessions');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---- Endpoint: Generate Pair Code ----
app.post('/api/pair', async (req, res) => {
  const { number } = req.body;
  if (!number || !/^\d{7,15}$/.test(number)) {
    return res.status(400).json({ error: 'Invalid phone number. Use country code without +.' });
  }

  const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const sessionDir = path.join(createSessionStore(), sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: Browsers.ubuntu('Chrome'),
      generateHighQualityLinkPreview: true,
    });

    sessions.set(sessionId, { sock, number, saveCreds, sessionDir });

    // Request pairing code
    if (!sock.authState.creds.registered) {
      await delay(1500);
      const code = await sock.requestPairingCode(number);
      const formatted = code.match(/.{1,4}/g)?.join('-') || code;
      return res.json({ sessionId, pairCode: formatted });
    } else {
      return res.status(400).json({ error: 'Number already registered.' });
    }
  } catch (err) {
    console.error('Pair error:', err);
    return res.status(500).json({ error: 'Failed to generate pair code. Try again.' });
  }
});

// ---- Endpoint: Poll Pair Status / Get Session ID ----
app.get('/api/status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found.' });

  const { sock, saveCreds, sessionDir } = s;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      await delay(1500);
      const creds = JSON.parse(fs.readFileSync(path.join(sessionDir, 'creds.json'), 'utf-8'));
      const sessionString = PREFIX + Buffer.from(JSON.stringify(creds)).toString('base64');
      s.sessionString = sessionString;
      s.connected = true;
      try { await sock.ws.close(); } catch {}
      try { await sock.logout(); } catch {}
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) s.failed = true;
    }
  });

  if (s.sessionString) {
    return res.json({ status: 'connected', sessionId: s.sessionString });
  }
  if (s.failed) return res.json({ status: 'failed' });
  return res.json({ status: 'pending' });
});

// ---- Endpoint: Generate QR Code ----
app.post('/api/qr', async (req, res) => {
  const sessionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const sessionDir = path.join(createSessionStore(), sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: Browsers.ubuntu('Chrome'),
    });

    sessions.set(sessionId, { sock, saveCreds, sessionDir });

    sock.ev.on('creds.update', saveCreds);

    // Send QR as base64
    return new Promise((resolve) => {
      sock.ev.on('connection.update', async (update) => {
        const { qr, connection } = update;
        if (qr && !res.headersSent) {
          const dataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
          res.json({ sessionId, qr: dataUrl });
          resolve();
        }
        if (connection === 'open') {
          await delay(1500);
          const creds = JSON.parse(fs.readFileSync(path.join(sessionDir, 'creds.json'), 'utf-8'));
          const sessionString = PREFIX + Buffer.from(JSON.stringify(creds)).toString('base64');
          const s = sessions.get(sessionId);
          if (s) s.sessionString = sessionString;
          try { await sock.ws.close(); } catch {}
          try { await sock.logout(); } catch {}
        }
      });
      setTimeout(() => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'QR generation timeout.' });
          resolve();
        }
      }, 30000);
    });
  } catch (err) {
    console.error('QR error:', err);
    return res.status(500).json({ error: 'Failed to generate QR.' });
  }
});

// ---- Endpoint: Re-fetch QR (refresh) ----
app.get('/api/qr-status/:sessionId', async (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Not found.' });
  if (s.sessionString) return res.json({ status: 'connected', sessionId: s.sessionString });
  return res.json({ status: 'pending' });
});

app.get('/api/config', (req, res) => {
  res.json({ botName: BOT_NAME, devNumber: DEV_NUMBER, prefix: PREFIX });
});

app.listen(PORT, () => {
  console.log(`🔥 ${BOT_NAME} Session Server running on http://localhost:${PORT}`);
});
