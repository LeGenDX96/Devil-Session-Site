# LEGEND MD — Session ID Generator

Web app jo QR ya 8-digit pair code se WhatsApp connect karke user ko SESSION_ID
generate karta hai — WhatsApp par image + caption ke sath bhejta hai, aur
terminal mein bhi direct copy-ready dikhata hai (OSC 52 clipboard).

## Files

```
server.js               → Express + Socket.io server
lib/sessionManager.js   → Baileys connection, QR/pair-code, session build, send-to-self
lib/terminalUtil.js     → terminal pretty-print + OSC52 auto-copy
public/index.html       → frontend UI
public/style.css        → terminal-hacker theme
public/script.js        → socket.io client logic
public/assets/session-banner.png → placeholder banner sent with the session (replace with your own)
```

## Setup

```bash
npm install
npm start
```

Server `http://localhost:3000` par chalega. Katabump ya kisi bhi free host par
deploy karte waqt `PORT` env var host khud set karega — code already
`process.env.PORT` use karta hai.

## Kaise kaam karta hai

1. User apna number daalta hai (pair code) ya QR scan karta hai.
2. Baileys WhatsApp se connect hota hai.
3. Connect hone par `creds.json` ko base64 karke `LEGEND-MD~<base64>` format
   ka session id banta hai.
4. Yeh session id:
   - User ke apne WhatsApp number par image + caption ke sath bhej diya jata hai.
   - Terminal mein box format mein print hota hai aur OSC52 se clipboard mein
     bhi copy ho jata hai (terminal support karta ho to).
   - Website par bhi copy button ke sath dikhaya jata hai.
5. Auth files turant delete ho jati hain — sirf base64 session id bacha rehta hai.

## Zaroori note

- `@whiskeysockets/baileys` v7 RC use ho raha hai — same jo LEGEND MD bot mein
  use hota hai, taake session format directly bot ke `SESSION_ID` env var mein
  paste ho sake.
- `public/assets/session-banner.png` sirf placeholder hai — apna branded banner
  yahan replace kar dena.
- Agar image bhejne mein fail ho (missing asset), code automatically text-only
  message par fallback kar leta hai — session generation kabhi block nahi hota.
- Production mein rate-limiting aur captcha add karna recommended hai taake
  koi bulk mein fake requests na bhej sake.
