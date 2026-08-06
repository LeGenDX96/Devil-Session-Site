// lib/sessionManager.js
// Handles: connecting to WhatsApp via Baileys, generating QR or 8-digit
// pairing code, and once authenticated — building the SESSION_ID,
// sending it to the user's own WhatsApp (image + caption), printing it
// in the terminal, and cleaning up temp auth files.

const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  delay,
} = require("@whiskeysockets/baileys");

const { printSessionBox } = require("./terminalUtil");

const SESSIONS_DIR = path.join(__dirname, "..", "sessions");
const BRAND_TAG = "LEGEND-MD"; // change if you rebrand

// Small helper to build the final portable session string.
// We base64-encode the full creds.json so the user can paste this
// straight into SESSION_ID env var — no external paste service needed.
function buildSessionId(credsPath) {
  const raw = fs.readFileSync(credsPath, "utf-8");
  const encoded = Buffer.from(raw, "utf-8").toString("base64");
  return `${BRAND_TAG}~${encoded}`;
}

/**
 * @param {string} sessionId   unique id for this generation attempt (room id)
 * @param {"qr"|"code"} method
 * @param {string} number      phone number, digits only, with country code (for "code" method)
 * @param {import("socket.io").Server} io
 */
async function startSession(sessionId, method, number, io) {
  const authDir = path.join(SESSIONS_DIR, sessionId);
  fs.mkdirSync(authDir, { recursive: true });

  const emit = (event, payload) => io.to(sessionId).emit(event, payload);

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["LEGEND-MD", "Chrome", "1.0.0"],
  });

  // Request an 8-digit pairing code once the socket is up, if that's the chosen method
  if (method === "code" && !sock.authState.creds.registered) {
    await delay(1500); // Baileys needs a brief moment before requesting a code
    try {
      const cleanNumber = number.replace(/[^0-9]/g, "");
      const code = await sock.requestPairingCode(cleanNumber);
      emit("code", { code: code?.match(/.{1,4}/g)?.join("-") || code });
    } catch (err) {
      emit("error", { message: "Failed to generate pairing code. Check the phone number and try again." });
      return;
    }
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && method === "qr") {
      const qrImage = await QRCode.toDataURL(qr);
      emit("qr", { qr: qrImage });
    }

    if (connection === "open") {
      emit("status", { message: "Connected! Generating session ID..." });

      const credsPath = path.join(authDir, "creds.json");
      const finalSessionId = buildSessionId(credsPath);
      const userJid = sock.user?.id;

      // Print + copy in terminal
      printSessionBox(finalSessionId, number || userJid);

      // Send session id to the user's own WhatsApp, image + caption
      try {
        await sock.sendMessage(userJid, {
          image: { url: path.join(__dirname, "..", "public", "assets", "session-banner.png") },
          caption:
            `*LEGEND MD — SESSION GENERATED*\n\n` +
            `Your session id is ready. Copy the code below and paste it into your bot's SESSION_ID environment variable.\n\n` +
            `\`\`\`${finalSessionId}\`\`\`\n\n` +
            `⚠️ Do not share this with anyone — it gives full access to this WhatsApp account.`,
        });
      } catch (sendErr) {
        // fall back to text-only if image asset is missing/unreachable
        await sock.sendMessage(userJid, {
          text:
            `*LEGEND MD — SESSION GENERATED*\n\n\`\`\`${finalSessionId}\`\`\`\n\n` +
            `⚠️ Do not share this with anyone.`,
        });
      }

      emit("success", {
        message: "Session sent to your WhatsApp! Check your chat with yourself.",
        sessionId: finalSessionId,
      });

      await delay(2000);
      sock.end(undefined);
      fs.rm(authDir, { recursive: true, force: true }, () => {});
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        emit("error", { message: "Session closed by WhatsApp. Please try again." });
        fs.rm(authDir, { recursive: true, force: true }, () => {});
      } else if (statusCode === DisconnectReason.restartRequired) {
        // Baileys quirk: restart the socket silently, don't bother the user
        startSession(sessionId, method, number, io);
      } else {
        emit("error", { message: "Connection closed unexpectedly. Please try again." });
        fs.rm(authDir, { recursive: true, force: true }, () => {});
      }
    }
  });
}

module.exports = { startSession };
