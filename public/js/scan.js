// ===== CONFIG =====
const API_BASE = "https://shinko-health-server.up.railway.app";

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
    return;
  }

  welcome.textContent = data.message; // Welcome John
  msg.textContent = `Logged in: ${data.user.email}`;
}

// scan handler
function onScanSuccess(decodedText) {
  // Expect: qrlogin:<token>
  if (!decodedText.startsWith("qrlogin:")) return;

  const token = decodedText.slice("qrlogin:".length).trim();
  consumeToken(token);
}

// Start camera scan
const qr = new Html5Qrcode("reader");
qr.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  onScanSuccess
).catch(err => {
  document.getElementById("msg").textContent =
    "Camera start failed. Allow camera permission. " + err;
});