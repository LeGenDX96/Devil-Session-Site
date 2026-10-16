<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=900&size=45&duration=3000&pause=800&color=FF1F4B&center=true&vCenter=true&width=700&lines=DEVIL-MD;Session+ID+Generator;Powered+by+Waseem+TechX" alt="DEVIL-MD" />

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

### 🔥 **Modern • Fast • Secure WhatsApp Bot Session Generator** 🔥

<p align="center">
  <img src="https://img.shields.io/badge/Bot-DEVIL--MD-ff1f4b?style=for-the-badge&logo=whatsapp&logoColor=white" />
  <img src="https://img.shields.io/badge/Developer-Waseem%20TechX-7a1fff?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/Version-1.0.0-22d47b?style=for-the-badge&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge&logo=opensourceinitiative&logoColor=white" />
</p>

<p align="center">
  <a href="https://github.com/LeGenDX96"><img src="https://img.shields.io/github/followers/LeGenDX96?label=Follow&style=social" /></a>
  <a href="https://github.com/LeGenDX96/DEVIL-MD-SESSION/stargazers"><img src="https://img.shields.io/github/stars/LeGenDX96/DEVIL-MD-SESSION?style=social" /></a>
  <a href="https://github.com/LeGenDX96/DEVIL-MD-SESSION/network/members"><img src="https://img.shields.io/github/forks/LeGenDX96/DEVIL-MD-SESSION?style=social" /></a>
</p>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

</div>

---

## 🌟 **About The Project**

**DEVIL-MD Session Generator** is a **beautiful, modern, and advanced** web application that allows users to generate **WhatsApp Bot Session IDs** instantly via **Pair Code** or **QR Code**.

Built with ❤️ by **Waseem TechX** — powered by **Baileys** (Multi-Device WhatsApp API) for a seamless, secure, and lightning-fast pairing experience.

> 💡 Perfect for **DEVIL-MD**, **LEGEND-MD**, **KHAN-X**, and any Baileys-based WhatsApp bot!

---

## ✨ **Features**

<table>
<tr>
<td width="50%">

### 🎨 **Modern UI/UX**
- Glassmorphism design
- Neon gradient animations
- Smooth transitions
- Fully responsive

### ⚡ **Fast & Reliable**
- Instant pair code generation
- Live QR scanning
- Real-time connection status
- Auto session detection

</td>
<td width="50%">

### 🔐 **Secure**
- No permanent storage
- Encrypted credentials
- Auto session cleanup
- Safe Baileys integration

### 🎯 **Advanced**
- `DEVIL~` prefixed sessions
- Copy & Download buttons
- Toast notifications
- Multi-tab support

</td>
</tr>
</table>

---

## 🖼️ **Preview**

<div align="center">

| 🔗 Pair Code | 🔳 QR Code |
|:---:|:---:|
| ![Pair Code](https://i.ibb.co/6bY7XKk/pair-preview.png) | ![QR Code](https://i.ibb.co/ZzXzXzX/qr-preview.png) |

*(Replace the image links above with your actual screenshots)*

</div>

---

## 🚀 **Quick Start**

### 📋 **Prerequisites**

- **Node.js** `v20+` → [Download](https://nodejs.org)
- **Git** → [Download](https://git-scm.com)
- A **WhatsApp** account on your phone

### 🛠️ **Installation**

```bash
# 1️⃣ Clone the repository
git clone https://github.com/LeGenDX96/DEVIL-MD-SESSION.git

# 2️⃣ Navigate into the folder
cd DEVIL-MD-SESSION

# 3️⃣ Install dependencies
npm install

# 4️⃣ Start the server
npm start
```

✅ Server will run at → http://localhost:3000

---

🌐 Deployment

<details>
<summary><b>🟣 Deploy on Render (Recommended)</b></summary>

1. Fork this repository
2. Go to render.com → New Web Service
3. Connect your GitHub repo
4. Set:
   · Build Command: npm install
   · Start Command: npm start
5. Add Environment Variables (see below)
6. Click Deploy 🚀

</details>

<details>
<summary><b>🔵 Deploy on Heroku</b></summary>

```bash
heroku create devil-md-session
heroku config:set SESSION_PREFIX=DEVIL~
git push heroku main
```

</details>

<details>
<summary><b>🟢 Deploy on Railway / Koyeb</b></summary>

1. Import GitHub repo
2. Set start command: npm start
3. Add environment variables
4. Deploy 🎉

</details>

<details>
<summary><b>🐳 Deploy with Docker</b></summary>

```bash
docker build -t devil-md-session .
docker run -p 3000:3000 devil-md-session
```

</details>

---

⚙️ Environment Variables

Create a .env file in the root directory:

```env
PORT=3000
SESSION_PREFIX=DEVIL~
BOT_NAME=DEVIL-MD
DEV_NUMBER=923447861706
```

Variable Description Default
PORT Server port 3000
SESSION_PREFIX Session ID prefix DEVIL~
BOT_NAME Bot name shown in UI DEVIL-MD
DEV_NUMBER Developer WhatsApp number 923447861706

---

📡 API Endpoints

Method Endpoint Description
POST /api/pair Generate pair code from phone number
POST /api/qr Generate QR code for scanning
GET /api/status/:id Check pair session status
GET /api/qr-status/:id Check QR session status
GET /api/config Get bot configuration

📥 Example Request

```bash
curl -X POST http://localhost:3000/api/pair \
  -H "Content-Type: application/json" \
  -d '{"number":"923447861706"}'
```

📤 Example Response

```json
{
  "sessionId": "sess_1730000000000_ab12cd",
  "pairCode": "ABCD-1234"
}
```

---

📖 How To Use

🔗 Method 1: Pair Code

1. Open the website
2. Click Pair Code tab
3. Enter your WhatsApp number with country code (no +)
4. Click Generate Pair Code
5. Copy the code → Open WhatsApp → Linked Devices → Link with phone number
6. Paste the code → Wait for connection
7. Copy your Session ID (DEVIL~xxxxx...)

🔳 Method 2: QR Code

1. Open the website
2. Click QR Code tab
3. Click Generate QR Code
4. Open WhatsApp → Linked Devices → Link a Device
5. Scan the QR
6. Copy your Session ID

🤖 Using Session ID

Paste the generated session ID into your bot's config:

```env
SESSION_ID=DEVIL~eyJub2lzZUtleSI6...
```

Then start your bot — done! 🎉

---

🗂️ Project Structure

```
DEVIL-MD-SESSION/
├── public/
│   ├── index.html       # Frontend UI
│   ├── style.css        # Styling (glassmorphism + neon)
│   └── script.js        # Client logic
├── sessions/            # Auto-generated (gitignored)
├── server.js            # Express + Baileys backend
├── package.json
├── .env
├── .gitignore
└── README.md
```

---

🧰 Tech Stack

<div align="center">

https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white
https://img.shields.io/badge/Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white
https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white
https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white

</div>

---

🤝 Contributing

Contributions are welcome! 🎉

1. Fork the project
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit changes (git commit -m 'Add AmazingFeature')
4. Push to branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

---

🐛 Bug Reports & Support

Found a bug? Have a question?

· 📩 WhatsApp Support: Click Here
· 📢 WhatsApp Channel: Join Here
· 🐙 GitHub Issues: Open Issue

---

📜 License

Distributed under the MIT License. See LICENSE for more information.

```
Copyright (c) 2026 Waseem TechX (LeGenDX96)
```

---

👨‍💻 Developer

<div align="center">

<img src="https://github.com/LeGenDX96.png" width="140" style="border-radius:50%;" alt="Waseem TechX"/>

Waseem TechX 🇵🇰

😉 Unstoppable Developer 🤭🚫
Progress iS mY PassioN 🤭

https://img.shields.io/badge/GitHub-LeGenDX96-181717?style=for-the-badge&logo=github
https://img.shields.io/badge/WhatsApp-Chat-25D366?style=for-the-badge&logo=whatsapp&logoColor=white
https://img.shields.io/badge/Channel-Follow-25D366?style=for-the-badge&logo=whatsapp&logoColor=white

</div>

---

⭐ Show Your Support

If this project helped you, please give it a ⭐ Star — it means a lot! 🙏

<div align="center">

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%">

🔥 DEVIL-MD — Powered by Waseem TechX 🔥

Made with ❤️ in Pakistan 🇵🇰

<img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=700&size=22&duration=2500&pause=500&color=FF1F4B&center=true&vCenter=true&width=600&lines=Thanks+for+visiting!;Star+the+repo+if+you+like+it!;Happy+Botting!+%F0%9F%9A%80" alt="Thanks" />

</div>
