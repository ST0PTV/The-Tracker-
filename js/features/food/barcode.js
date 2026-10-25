// Barcode-Scanner mit der Kamera (ZXing, vendor/zxing.min.js, Apache-2.0).
// Aus Rezeptbuch/tracker/js/app.js (startScanner, getCamStream, tuneCamera, stopScanner; ST0PTV/JuliaKelp, MIT).
// Kamera läuft nur, solange der Scanner sichtbar ist; aus beim Schließen, beim Mengen-Dialog und beim Verlassen der App.
// Hauptkamera statt Ultraweitwinkel (schlechter Nahfokus), etwas Zoom, Lampe automatisch bei Dunkelheit.

let zxing = null;
function loadZxing() {
  if (globalThis.ZXing) return Promise.resolve(globalThis.ZXing);
  if (zxing) return zxing;
  zxing = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = 'vendor/zxing.min.js';
    s.onload = () => ok(globalThis.ZXing);
    s.onerror = () => { zxing = null; fail(new Error('ZXing nicht geladen')); };
    document.head.appendChild(s);
  });
  return zxing;
}

let reader = null;
let stream = null;
let videoEl = null;
let lightTimer = null;
const torch = { on: false, manual: false };

async function getStream() {
  const res = { width: { ideal: 1920 }, height: { ideal: 1080 } };
  let st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, ...res } });
  try {
    const tr = st.getVideoTracks()[0];
    if (/ultra/i.test(tr.label || '')) {
      const back = (await navigator.mediaDevices.enumerateDevices()).find((d) => d.kind === 'videoinput' && /back|rück|hinter/i.test(d.label) && !/ultra|tele/i.test(d.label));
      if (back) { st.getTracks().forEach((t) => t.stop()); st = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: back.deviceId }, ...res } }); }
    }
  } catch { /* Standardkamera behalten */ }
  try {
    const tr = st.getVideoTracks()[0]; const cap = tr.getCapabilities ? tr.getCapabilities() : {};
    if (cap.focusMode && cap.focusMode.includes('continuous')) await tr.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
  } catch { /* Fokus nicht steuerbar */ }
  return st;
}

async function setTorch(track, on, btn) {
  try { await track.applyConstraints({ advanced: [{ torch: on }] }); torch.on = on; } catch { /* nicht unterstützt */ }
  if (btn) { btn.textContent = torch.on ? 'Licht aus' : 'Licht an'; btn.classList.toggle('on', torch.on); }
}

function tune(st, video, torchBtn) {
  const track = st.getVideoTracks()[0];
  if (!track || !track.getCapabilities) return;
  const caps = track.getCapabilities();
  if (caps.zoom && caps.zoom.max >= 1.5) track.applyConstraints({ advanced: [{ zoom: Math.min(2, caps.zoom.max) }] }).catch(() => {});
  if (!caps.torch || !torchBtn) return;
  torch.on = false; torch.manual = false;
  torchBtn.hidden = false;
  torchBtn.onclick = () => { torch.manual = true; setTorch(track, !torch.on, torchBtn); };
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
  const c = canvas.getContext('2d', { willReadFrequently: true });
  let dark = 0;
  clearInterval(lightTimer);
  lightTimer = setInterval(() => {
    if (!reader || !video.isConnected) { clearInterval(lightTimer); return; }
    if (torch.on || torch.manual || video.readyState < 2) return;
    c.drawImage(video, 0, 0, 32, 32);
    const px = c.getImageData(0, 0, 32, 32).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    dark = sum / (px.length / 4) < 60 ? dark + 1 : 0;
    if (dark >= 2) setTorch(track, true, torchBtn);
  }, 600);
}

/**
 * Startet den Scanner im video-Element. onCode(code) bei jedem neuen Barcode (derselbe zählt erst wieder nach 3 s).
 * onError(text) bei fehlender Kamera oder Berechtigung. Gibt ein Promise zurück.
 */
export async function startScanner(video, { onCode, onError, torchBtn = null }) {
  stopScanner();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { onError('Kamera nicht verfügbar. Bitte den Barcode eintippen.'); return; }
  let Z;
  try { Z = await loadZxing(); } catch { onError('Scanner konnte nicht geladen werden. Bitte einmal online öffnen oder den Barcode eintippen.'); return; }
  const hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const r = new Z.BrowserMultiFormatReader(hints, 150);
  reader = r;
  videoEl = video;
  let seen = '', seenAt = 0;
  try {
    const st = await getStream();
    if (reader !== r) { st.getTracks().forEach((t) => t.stop()); return; } // inzwischen geschlossen
    stream = st;
    tune(st, video, torchBtn);
    await r.decodeFromStream(st, video, (result) => {
      if (!result) return;
      const code = result.getText(), now = Date.now();
      const again = code === seen && now - seenAt < 3000;
      seen = code; seenAt = now;
      if (again) return;
      if (navigator.vibrate) navigator.vibrate(30);
      onCode(code);
    });
  } catch {
    if (reader === r) onError('Kein Kamerazugriff. Erlaube die Kamera in den Safari-Einstellungen oder tippe den Barcode ein.');
  }
}

export function stopScanner() {
  clearInterval(lightTimer); torch.on = false;
  if (reader) { try { reader.stopContinuousDecode(); } catch { /* ok */ } reader = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  if (videoEl) { try { videoEl.pause(); videoEl.srcObject = null; } catch { /* ok */ } videoEl = null; }
}

export const scannerRunning = () => !!reader;

// App verlassen → Kamera aus (iOS fragt in Home-Bildschirm-Apps sonst ggf. erneut nach der Erlaubnis)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stopScanner(); });
}
