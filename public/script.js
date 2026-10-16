/* ============ CONFIG ============ */
const CONFIG = {
  botName: 'DEVIL-MD',
  prefix: 'DEVIL~',
  devNumber: '923447861706',
};

/* ============ HELPERS ============ */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._t);
  t._t = setTimeout(() => (t.className = 'toast ' + type), 2800);
}

function copy(text) {
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard ✓', 'success'))
    .catch(() => toast('Copy failed', 'error'));
}

function download(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Downloaded ✓', 'success');
}

/* ============ TABS ============ */
$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    $$('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $('#panel-' + tab.dataset.tab).classList.add('active');
  });
});

/* ============ PAIR CODE ============ */
$('#pairBtn').addEventListener('click', async () => {
  const number = $('#phoneInput').value.trim().replace(/\D/g, '');
  if (!number || number.length < 7) return toast('Enter a valid number', 'error');

  const btn = $('#pairBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Generating...';

  try {
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    $('#pairResult').hidden = false;
    $('#pairCode').textContent = data.pairCode;
    $('#pairLoader').hidden = false;
    $('#pairSessionBox').hidden = true;

    pollPairStatus(data.sessionId);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Generate Pair Code';
  }
});

async function pollPairStatus(sessionId) {
  let attempts = 0;
  const MAX = 60; // 3 min
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch('/api/status/' + sessionId);
      const data = await res.json();

      if (data.status === 'connected') {
        clearInterval(interval);
        $('#pairLoader').hidden = true;
        $('#pairSessionBox').hidden = false;
        $('#pairSession').value = data.sessionId;
        toast('Session generated successfully 🎉', 'success');
      } else if (data.status === 'failed' || attempts >= MAX) {
        clearInterval(interval);
        $('#pairLoader').hidden = true;
        toast('Connection failed or timed out', 'error');
      }
    } catch (e) { /* keep polling */ }
  }, 3000);
}

$('#copyPairSession').addEventListener('click', () => copy($('#pairSession').value));
$('#downloadPairSession').addEventListener('click', () =>
  download($('#pairSession').value, `${CONFIG.botName}-Session.txt`));

/* ============ QR CODE ============ */
$('#qrBtn').addEventListener('click', async () => {
  const btn = $('#qrBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Generating...';
  $('#qrWrap').hidden = true;

  try {
    const res = await fetch('/api/qr', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');

    $('#qrWrap').hidden = false;
    $('#qrImage').src = data.qr;
    $('#qrLoader').hidden = false;
    $('#qrSessionBox').hidden = true;

    pollQrStatus(data.sessionId);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Generate QR Code';
  }
});

async function pollQrStatus(sessionId) {
  let attempts = 0;
  const MAX = 60;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch('/api/qr-status/' + sessionId);
      const data = await res.json();

      if (data.status === 'connected') {
        clearInterval(interval);
        $('#qrLoader').hidden = true;
        $('#qrSessionBox').hidden = false;
        $('#qrSession').value = data.sessionId;
        toast('Session generated successfully 🎉', 'success');
      } else if (attempts >= MAX) {
        clearInterval(interval);
        $('#qrLoader').hidden = true;
        toast('QR expired. Refresh to try again.', 'error');
      }
    } catch (e) { /* keep polling */ }
  }, 3000);
}

$('#copyQrSession').addEventListener('click', () => copy($('#qrSession').value));
$('#downloadQrSession').addEventListener('click', () =>
  download($('#qrSession').value, `${CONFIG.botName}-Session.txt`));

/* ============ INIT ============ */
$('#year').textContent = new Date().getFullYear();
