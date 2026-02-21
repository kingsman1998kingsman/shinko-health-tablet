const API_BASE = "https://shinko-health-server.up.railway.app";

let scanningLocked = false;
let qr; // keep reference

async function consumeToken(token) {
  const msg = document.getElementById("msg");
  const welcome = document.getElementById("welcome");

  msg.textContent = "Checking token...";
  welcome.textContent = "";

  const res = await fetch(`${API_BASE}/qr/consume`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ token })
  });

  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.detail || "Failed";
    // allow scanning again if it failed
    scanningLocked = false;
    return;
  }

  // ✅ success
  welcome.textContent = data.message;
  msg.textContent = "";

  // ✅ stop camera scanning to prevent double consume
  try {
    await qr.stop();
    await qr.clear();
  } catch (e) {
    // ignore
  }
}

function onScanSuccess(decodedText) {
  if (scanningLocked) return;

  if (!decodedText.startsWith("qrlogin:")) return;

  scanningLocked = true; // lock immediately
  const token = decodedText.slice("qrlogin:".length).trim();
  consumeToken(token);
}

// start scanner
qr = new Html5Qrcode("reader");
qr.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  onScanSuccess
).catch(err => {
  document.getElementById("msg").textContent =
    "Camera start failed. Allow camera permission. " + err;
});