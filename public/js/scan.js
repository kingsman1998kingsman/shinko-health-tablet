// ===== CONFIG =====
const API_BASE = "https://shinko-health-server.up.railway.app";

let qr = null;
let scanningLocked = false;

async function consumeToken(token) {
  const status = document.getElementById("status");
  status.textContent = "Checking token...";

  const res = await fetch(`${API_BASE}/qr/consume`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ token })
  });

  const data = await res.json();

  if (!res.ok) {
    status.textContent = data.detail || "Failed";
    scanningLocked = false;
    return;
  }

  // Save session (simple)
  localStorage.setItem("shinko_user", JSON.stringify(data.user));

  // Stop camera
  try {
    await qr.stop();
    await qr.clear();
  } catch (e) {}

  // Redirect to home
  window.location.href = "./home.html";
}

function onScanSuccess(decodedText) {
  if (scanningLocked) return;
  if (!decodedText.startsWith("qrlogin:")) return;

  scanningLocked = true; // lock immediately
  const token = decodedText.slice("qrlogin:".length).trim();
  consumeToken(token);
}

async function startScan() {
  const reader = document.getElementById("reader");
  const status = document.getElementById("status");
  reader.style.display = "block";
  status.textContent = "Opening camera...";

  scanningLocked = false;

  qr = new Html5Qrcode("reader");
  try {
    await qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      onScanSuccess
    );
    status.textContent = "Scan the QR shown on phone.";
  } catch (err) {
    status.textContent = "Camera start failed. Please allow camera permission. " + err;
  }
}

// If already logged in, go home directly
(function () {
  const userStr = localStorage.getItem("shinko_user");
  if (userStr) {
    window.location.href = "./home.html";
    return;
  }

  document.getElementById("startBtn").addEventListener("click", startScan);
})();