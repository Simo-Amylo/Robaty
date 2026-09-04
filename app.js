// ============================================================
// Ghita PWA — app logic
// ============================================================

// ---------- Service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ---------- Onboarding ----------
const slides = Array.from(document.querySelectorAll('.slide'));
const dots = Array.from(document.querySelectorAll('.dot'));
const onboarding = document.getElementById('onboarding');
const mainApp = document.getElementById('mainApp');
let slideIndex = 0;
let onboardTimer = null;

function showSlide(i) {
  slideIndex = i;
  slides.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
  dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
}

function nextSlide() {
  showSlide((slideIndex + 1) % slides.length);
}

function startOnboardAutoplay() {
  onboardTimer = setInterval(nextSlide, 3200);
}
function stopOnboardAutoplay() {
  clearInterval(onboardTimer);
}
startOnboardAutoplay();

// swipe support
let touchStartX = null;
onboarding.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  stopOnboardAutoplay();
});
onboarding.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (dx < -40) showSlide(Math.min(slideIndex + 1, slides.length - 1));
  if (dx > 40) showSlide(Math.max(slideIndex - 1, 0));
  touchStartX = null;
});

document.getElementById('startBtn').addEventListener('click', enterApp);

function enterApp() {
  stopOnboardAutoplay();
  onboarding.classList.remove('is-active');
  mainApp.classList.add('is-active');
  if (chatScroll.children.length === 0) {
    addBubble("Salut, moi c'est Ghita 💗 Comment s'est passée ta journée ?", 'her');
  }
}

// skip onboarding automatically if user already started before (localStorage-free per PWA memory rules in artifacts,
// but this is a standalone PWA — not a Claude.ai artifact — so real localStorage is fine here)
try {
  if (localStorage.getItem('ghita_onboarded') === '1') enterApp();
} catch (e) {}
document.getElementById('startBtn').addEventListener('click', () => {
  try { localStorage.setItem('ghita_onboarded', '1'); } catch (e) {}
});

// ---------- Tabs ----------
const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
const panels = Array.from(document.querySelectorAll('.tab-panel'));
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.toggle('is-active', b === btn));
    const target = btn.dataset.tab;
    panels.forEach(p => p.classList.toggle('is-active', p.id === target));
  });
});

// ---------- Chat ----------
const chatScroll = document.getElementById('chatScroll');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

function addBubble(text, who) {
  const b = document.createElement('div');
  b.className = `bubble bubble--${who === 'her' ? 'her' : 'me'}`;
  if (who === 'her') b.innerHTML = `<span class="bubble-name">Ghita</span>${escapeHtml(text)}`;
  else b.textContent = text;
  chatScroll.appendChild(b);
  chatScroll.scrollTop = chatScroll.scrollHeight;
  return b;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function showTyping() {
  const t = document.createElement('div');
  t.className = 'typing-dots';
  t.id = 'typingIndicator';
  t.innerHTML = '<span></span><span></span><span></span>';
  chatScroll.appendChild(t);
  chatScroll.scrollTop = chatScroll.scrollHeight;
}
function hideTyping() {
  document.getElementById('typingIndicator')?.remove();
}

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  addBubble(text, 'me');
  chatInput.value = '';
  requestGhitaReply(text);
});

// ------------------------------------------------------------
// REPLY ENGINE — swap this out for your real backend.
//
// This is only a placeholder so the UI is fully functional out
// of the box. For real conversations you'll want a small server
// endpoint (Node/Express, Cloudflare Worker, etc.) that holds
// your API key and forwards the conversation to a model — never
// call a model API with a secret key directly from client-side
// PWA code, since anyone can read it from the browser.
//
// Replace the body of requestGhitaReply() with a fetch() to your
// own endpoint, e.g.:
//
//   const res = await fetch('https://your-backend.com/api/chat', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ message: text, history })
//   });
//   const { reply } = await res.json();
//   addBubble(reply, 'her');
// ------------------------------------------------------------
const MOCK_REPLIES = [
  "Raconte-moi tout, je t'écoute 💬",
  "Ça a l'air d'avoir été une journée intense. Comment tu te sens ?",
  "Je suis contente que tu m'en parles.",
  "Et sinon, qu'est-ce qui t'a fait sourire aujourd'hui ?",
];

function requestGhitaReply(userText) {
  showTyping();
  setTimeout(() => {
    hideTyping();
    const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    addBubble(reply, 'her');
  }, 900 + Math.random() * 600);
}

// ---------- Voice recording ----------
const micBtn = document.getElementById('micBtn');
const recordingBar = document.getElementById('recordingBar');
const recTimeEl = document.getElementById('recTime');
const cancelRecBtn = document.getElementById('cancelRec');
const sendRecBtn = document.getElementById('sendRec');

let mediaRecorder = null;
let recordedChunks = [];
let recSeconds = 0;
let recTimer = null;

micBtn.addEventListener('click', async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("L'enregistrement audio n'est pas supporté sur ce navigateur.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startRecording(stream);
  } catch (err) {
    alert("Impossible d'accéder au micro. Vérifie les permissions.");
  }
});

function startRecording(stream) {
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.start();

  recSeconds = 0;
  recTimeEl.textContent = '0:00';
  recordingBar.hidden = false;
  recTimer = setInterval(() => {
    recSeconds++;
    const m = Math.floor(recSeconds / 60);
    const s = String(recSeconds % 60).padStart(2, '0');
    recTimeEl.textContent = `${m}:${s}`;
  }, 1000);
}

function stopRecording(stream) {
  clearInterval(recTimer);
  recordingBar.hidden = true;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  stream?.getTracks?.().forEach(t => t.stop());
}

cancelRecBtn.addEventListener('click', () => {
  if (mediaRecorder) {
    mediaRecorder.onstop = null;
    stopRecording(mediaRecorder.stream);
  }
});

sendRecBtn.addEventListener('click', () => {
  if (!mediaRecorder) return;
  const stream = mediaRecorder.stream;
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    addVoiceBubble(blob, recSeconds);
    requestGhitaReply('[message vocal]');
  };
  stopRecording(stream);
});

function addVoiceBubble(blob, seconds) {
  const url = URL.createObjectURL(blob);
  const b = document.createElement('div');
  b.className = 'bubble bubble--voice bubble--me';
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  b.innerHTML = `<button class="play-dot" aria-label="Écouter"></button><span class="waveform"></span><span class="voice-time">${m}:${s}</span>`;
  const audio = new Audio(url);
  b.querySelector('.play-dot').addEventListener('click', () => audio.play());
  chatScroll.appendChild(b);
  chatScroll.scrollTop = chatScroll.scrollHeight;
}
