const socket = io();

// --- tab switching ---
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".pane").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`pane-${tab.dataset.tab}`).classList.add("active");
  });
});

const statusLine = document.getElementById("statusLine");
const successBox = document.getElementById("successBox");
const sidText = document.getElementById("sidText");

function setStatus(msg, isError = false) {
  statusLine.textContent = msg ? `> ${msg}` : "";
  statusLine.style.color = isError ? "#ff5f56" : "#f0b429";
}

// --- pair code flow ---
const genCodeBtn = document.getElementById("genCodeBtn");
const numberInput = document.getElementById("numberInput");
const codeOutput = document.getElementById("codeOutput");
const codeText = document.getElementById("codeText");

genCodeBtn.addEventListener("click", () => {
  const number = numberInput.value.trim();
  if (!number) {
    setStatus("enter a phone number first", true);
    return;
  }
  genCodeBtn.disabled = true;
  setStatus("requesting pairing code...");
  socket.emit("start", { method: "code", number });
});

socket.on("code", ({ code }) => {
  codeOutput.classList.remove("hidden");
  codeText.textContent = code;
  setStatus("enter this code in WhatsApp → Linked Devices");
  genCodeBtn.disabled = false;
});

// --- qr flow ---
const genQrBtn = document.getElementById("genQrBtn");
const qrBox = document.getElementById("qrBox");

genQrBtn.addEventListener("click", () => {
  genQrBtn.disabled = true;
  qrBox.innerHTML = `<span class="qr-placeholder">generating qr...</span>`;
  setStatus("requesting qr code...");
  socket.emit("start", { method: "qr" });
});

socket.on("qr", ({ qr }) => {
  qrBox.innerHTML = `<img src="${qr}" alt="scan qr" />`;
  setStatus("scan within 60 seconds");
  genQrBtn.disabled = false;
});

// --- shared status/success/error events ---
socket.on("status", ({ message }) => setStatus(message));

socket.on("success", ({ message, sessionId }) => {
  setStatus(message);
  successBox.classList.remove("hidden");
  sidText.textContent = sessionId;
});

socket.on("error", ({ message }) => {
  setStatus(message, true);
  genCodeBtn.disabled = false;
  genQrBtn.disabled = false;
});

// --- copy button ---
document.getElementById("copySidBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(sidText.textContent).then(() => {
    setStatus("session id copied to clipboard");
  });
});
