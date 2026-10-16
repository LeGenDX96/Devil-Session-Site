/* ═══════════════════════════════════════════
   DEVIL-MD Session Generator — Script v2.0
   ═══════════════════════════════════════════ */

const CONFIG = {
  botName: 'DEVIL-MD',
  prefix: 'DEVIL~',
  devNumber: '923447861706',
};

/* ===== DOM HELPERS ===== */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* ===== STATE ===== */
const state = {
  pairPolling: null,
  qrPolling: null,
  qrRefreshTimer: null,
  pairTimerInterval: null,
  activePairSession: null,
  activeQrSession: null,
};

/* ===== TOAST ===== */
let toastTimer = null;
function toast(msg, type = '') {
  const t = $('#toast');
  if (!t) return;
  const icons = {
    success: '<i class="fa-solid fa-circle-check" style="color:#22d47b"></i>',
    error: '<i class="fa-solid fa-circle-xmark" style="color:#ff1f4b"></i>',
    '': '<i class="fa-solid fa-circle-info" style="color:#ff5c7c"></i>',
  };
  t.innerHTML = (icons[type] || icons['']) + '<span>' + msg + '</span>';
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast ' + type), 3200);
}

/* ===== CLIPBOARD ===== */
async function copyText(text) {
  if (!text) return toast('Nothing to copy', 'error');
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast('Copied to clipboard ✓', 'success');
  } catch {
    toast('Copy failed. Long-press to copy.', 'error');
  }
}

/* ===== DOWNLOAD ===== */
function downloadText(text, filename) {
  if (!text) return toast('No session to download', 'error');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
  toast('Downloaded ✓', 'success');
}

/* ===== TABS ===== */
$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    $$('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const panel = $('#panel-' + tab.dataset.tab);
    if (panel) panel.classList.add('active');
  });
});

/* ═══════════════ PAIR CODE ═══════════════ */

const phoneInput = $('#phoneInput');
const clearPhone = $('#clearPhone');

// Show/hide clear button
phoneInput?.addEventListener('input', () => {
  const v = phoneInput.value.replace(/\D/g, '');
  phoneInput.value = v; // strip non-digits as user types
  clearPhone.hidden = !v.length;
});

clearPhone?.addEventListener('click', () => {
  phoneInput.value = '';
  clearPhone.hidden = true;
  phoneInput.focus();
});

/* ===== Submit Pair ===== */
$('#pairBtn')?.addEventListener('click', async () => {
  const number = phoneInput.value.replace(/\D/g, '').trim();

  // Validation
  if (!number || number.length < 10 || number.length > 15) {
    toast('Enter valid number with country code', 'error');
    phoneInput.focus();
    return;
  }

  // Kill previous session if any
  stopPairPolling();

  const btn = $('#pairBtn');
  const btnHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>Generating…</span>';

  // Reset UI
  $('#pairResult').hidden = true;
  $('#pairLoader').hidden = false;
  $('#pairSessionBox').hidden = true;

  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 30000);

    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number }),
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Server error (${res.status})`);
    }

    // Show pair code
    $('#pairResult').hidden = false;
    const codeEl = $('#pairCode');
    codeEl.textContent = data.pairCode || data.rawCode || '----';
    // Show without dashes in data attribute for copy
    codeEl.dataset.raw = data.rawCode || data.pairCode || '';

    $('#pairLoader').hidden = false;
    $('#pairSessionBox').hidden = true;

    state.activePairSession = data.sessionId;
    startPairTimer();
    startPairPolling(data.sessionId);
  } catch (err) {
    console.error(err);
    $('#pairLoader').hidden = true;
    if (err.name === 'AbortError') toast('Request timed out. Try again.', 'error');
    else toast(err.message || 'Failed to generate pair code', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = btnHTML;
  }
});

/* ===== Copy pair code ===== */
$('#copyPairCode')?.addEventListener('click', () => {
  const raw = $('#pairCode')?.dataset?.raw || $('#pairCode')?.textContent || '';
  copyText(raw.replace(/[^A-Za-z0-9]/g, ''));
});

/* ===== 2-min Timer for pair code ===== */
function startPairTimer() {
  stopPairTimer();
  let seconds = 120;
  const el = $('#pairTimer');

  const tick = () => {
    if (seconds <= 0) {
      stopPairTimer();
      if (el) el.textContent = 'Expired';
      return;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (el) el.textContent = `Expires in ${m}:${String(s).padStart(2, '0')}`;
    seconds--;
  };
  tick();
  state.pairTimerInterval = setInterval(tick, 1000);
}
function stopPairTimer() {
  if (state.pairTimerInterval) {
    clearInterval(state.pairTimerInterval);
    state.pairTimerInterval = null;
  }
}

/* ===== Poll pair status ===== */
function startPairPolling(sessionId) {
  stopPairPolling();
  let attempts = 0;
  const MAX_ATTEMPTS = 80; // 80 × 2s = 160s max
  let consecutiveErrors = 0;

  state.pairPolling = setInterval(async () => {
    attempts++;

    // Stop if user started a new session
    if (state.activePairSession !== sessionId) {
      stopPairPolling();
      return;
    }

    if (attempts > MAX_ATTEMPTS) {
      stopPairPolling();
      stopPairTimer();
      $('#pairLoader').hidden = true;
      toast('Pair code expired. Generate again.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/status/${sessionId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('status check failed');
      const data = await res.json();
      consecutiveErrors = 0;

      if (data.status === 'connected' && data.sessionId) {
        stopPairPolling();
        stopPairTimer();
        showPairSession(data.sessionId);
      } else if (data.status === 'failed') {
        stopPairPolling();
        stopPairTimer();
        $('#pairLoader').hidden = true;
        toast('Connection failed: ' + (data.reason || 'unknown'), 'error');
      }
    } catch {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        stopPairPolling();
        $('#pairLoader').hidden = true;
        toast('Connection lost. Try again.', 'error');
      }
    }
  }, 2000);
}

function stopPairPolling() {
  if (state.pairPolling) {
    clearInterval(state.pairPolling);
    state.pairPolling = null;
  }
}

/* ===== Show pair session ===== */
function showPairSession(sessionString) {
  $('#pairLoader').hidden = true;
  $('#pairSessionBox').hidden = false;
  $('#pairSession').value = sessionString;
  toast('Session generated successfully 🎉', 'success');

  // Auto-scroll into view
  setTimeout(() => {
    $('#pairSessionBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);
}

/* ===== Session action buttons ===== */
$('#copyPairSession')?.addEventListener('click', () => copyText($('#pairSession').value));
$('#downloadPairSession')?.addEventListener('click', () =>
  downloadText($('#pairSession').value, `${CONFIG.botName}-Session.txt`));
$('#newPairSession')?.addEventListener('click', () => {
  stopPairPolling();
  stopPairTimer();
  state.activePairSession = null;
  $('#pairResult').hidden = true;
  $('#pairSessionBox').hidden = true;
  $('#pairLoader').hidden = true;
  phoneInput.value = '';
  clearPhone.hidden = true;
  phoneInput.focus();
});

/* ═══════════════ QR CODE ═══════════════ */

$('#qrBtn')?.addEventListener('click', async () => {
  stopQrPolling();
  stopQrTimer();

  const btn = $('#qrBtn');
  const btnHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>Generating…</span>';

  $('#qrWrap').hidden = true;

  try {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 30000);

    const res = await fetch('/api/qr', {
      method: 'POST',
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

    $('#qrWrap').hidden = false;
    $('#qrImage').src = data.qr;
    $('#qrLoader').hidden = false;
    $('#qrSessionBox').hidden = true;

    state.activeQrSession = data.sessionId;
    startQrPolling(data.sessionId);
    startQrRefreshCountdown();
  } catch (err) {
    console.error(err);
    if (err.name === 'AbortError') toast('Request timed out', 'error');
    else toast(err.message || 'Failed to generate QR', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = btnHTML;
  }
});

/* ===== Poll QR status ===== */
function startQrPolling(sessionId) {
  stopQrPolling();
  let attempts = 0;
  const MAX_ATTEMPTS = 90; // 3 min
  let consecutiveErrors = 0;

  state.qrPolling = setInterval(async () => {
    attempts++;

    if (state.activeQrSession !== sessionId) {
      stopQrPolling();
      return;
    }

    if (attempts > MAX_ATTEMPTS) {
      stopQrPolling();
      stopQrTimer();
      $('#qrLoader').hidden = true;
      toast('QR expired. Click Refresh.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/status/${sessionId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('status');
      const data = await res.json();
      consecutiveErrors = 0;

      if (data.status === 'connected' && data.sessionId) {
        stopQrPolling();
        stopQrTimer();
        showQrSession(data.sessionId);
      } else if (data.status === 'failed') {
        stopQrPolling();
        stopQrTimer();
        $('#qrLoader').hidden = true;
        toast('QR login failed', 'error');
      }
    } catch {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) {
        stopQrPolling();
        $('#qrLoader').hidden = true;
        toast('Connection lost', 'error');
      }
    }
  }, 2000);
}

function stopQrPolling() {
  if (state.qrPolling) {
    clearInterval(state.qrPolling);
    state.qrPolling = null;
  }
}

function showQrSession(sessionString) {
  $('#qrLoader').hidden = true;
  $('#qrSessionBox').hidden = false;
  $('#qrSession').value = sessionString;
  toast('Session generated successfully 🎉', 'success');
  setTimeout(() => {
    $('#qrSessionBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);
}

/* ===== QR refresh countdown (20s) ===== */
function startQrRefreshCountdown() {
  stopQrTimer();
  let seconds = 20;
  const el = $('#qrTimer');
  const tick = () => {
    if (seconds <= 0) {
      stopQrTimer();
      if (el) el.textContent = 'Expired';
      return;
    }
    if (el) el.textContent = `Auto-refresh in ${seconds}s`;
    seconds--;
  };
  tick();
  state.qrRefreshTimer = setInterval(tick, 1000);
}
function stopQrTimer() {
  if (state.qrRefreshTimer) {
    clearInterval(state.qrRefreshTimer);
    state.qrRefreshTimer = null;
  }
  const el = $('#qrTimer');
  if (el) el.textContent = '';
}

/* ===== Manual QR refresh ===== */
$('#refreshQr')?.addEventListener('click', async () => {
  const sid = state.activeQrSession;
  if (!sid) return toast('No active QR', 'error');

  try {
    const res = await fetch(`/api/qr-refresh/${sid}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Refresh failed');
    $('#qrImage').src = data.qr + '?t=' + Date.now();
    startQrRefreshCountdown();
    toast('QR refreshed ✓', 'success');
  } catch (e) {
    toast(e.message || 'Refresh failed', 'error');
  }
});

/* ===== Session actions ===== */
$('#copyQrSession')?.addEventListener('click', () => copyText($('#qrSession').value));
$('#downloadQrSession')?.addEventListener('click', () =>
  downloadText($('#qrSession').value, `${CONFIG.botName}-Session.txt`));
$('#newQrSession')?.addEventListener('click', () => {
  stopQrPolling();
  stopQrTimer();
  state.activeQrSession = null;
  $('#qrWrap').hidden = true;
  $('#qrLoader').hidden = true;
  $('#qrSessionBox').hidden = true;
});

/* ═══════════════ INIT ═══════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Particles (light, subtle)
  initParticles();

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    stopPairPolling();
    stopQrPolling();
    stopPairTimer();
    stopQrTimer();
  });
});

/* ═══════════════ PARTICLES ═══════════════ */
function initParticles() {
  const canvas = $('#particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let w, h, particles;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { canvas.style.display = 'none'; return; }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.min(60, Math.floor((w * h) / 32000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.4,
      a: Math.random() * 0.5 + 0.15,
    }));
  }

  function loop() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 92, 124, ${p.a})`;
      ctx.fill();
    }
    // Connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.hypot(dx, dy);
        if (d < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 31, 75, ${0.08 * (1 - d / 110)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);
  loop();
}
