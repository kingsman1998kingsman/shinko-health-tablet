const API_BASE = "https://shinko-health-server.up.railway.app";
let qrScanner = null;
let scanningLocked = false;

async function consumeToken(token) {
  const status = document.getElementById("status");
  status.textContent = "Verifying Identity...";

  try {
    const res = await fetch(`${API_BASE}/qr/consume`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ token })
    });

    const data = await res.json();

    if (!res.ok) {
      status.textContent = data.detail || "Access Denied";
      scanningLocked = false;
      return;
    }

    // Securely store session for home.html
    localStorage.setItem("shinko_user", JSON.stringify(data.user));

    if (qrScanner) {
      await qrScanner.stop();
    }
    
    status.textContent = "Access Granted. Redirecting...";
    window.location.href = "./home.html";

  } catch (err) {
    status.textContent = "Network Error";
    scanningLocked = false;
  }
}

function onScanSuccess(decodedText) {
  if (scanningLocked) return;
  if (!decodedText.startsWith("qrlogin:")) return;

  scanningLocked = true;
  const token = decodedText.slice(8).trim(); // Remove "qrlogin:"
  consumeToken(token);
}

async function startScan() {
  document.getElementById("idleState").classList.add("hidden");
  document.getElementById("reader-container").classList.remove("hidden");
  
  qrScanner = new Html5Qrcode("reader");
  try {
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 15, qrbox: { width: 250, height: 250 } },
      onScanSuccess
    );
    document.getElementById("status").textContent = "Align QR code within frame";
  } catch (err) {
    document.getElementById("status").textContent = "Camera blocked or not found";
  }
}

document.getElementById("startBtn").addEventListener("click", startScan);