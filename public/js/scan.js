const API_BASE = "https://shinko-health-server.up.railway.app";
//const API_BASE = "http://localhost:8000"; 

let qrScanner = null;
let scanningLocked = false;
let countdownTimer = null;
let activeUserId = null; // Stores the user ID after a successful scan

// === MACHINE CONFIGURATION ===
const urlParams = new URLSearchParams(window.location.search);
const CURRENT_MACHINE = urlParams.get('machine') || 'body_scale';

// === UI ELEMENTS ===
const uiIdle = document.getElementById("idleState");
const uiReader = document.getElementById("reader-container");
const uiMeasurement = document.getElementById("measurementState");
const mainStatus = document.getElementById("mainStatus");

const generateSection = document.getElementById("generateSection");
const loadingSection = document.getElementById("loadingSection");
const resultsSection = document.getElementById("resultsSection");
const doneSection = document.getElementById("doneSection");

const countdownText = document.getElementById("countdownText");
const generateBtn = document.getElementById("generateBtn");

// Initialize screen title based on machine type
window.onload = () => {
  const titles = {
    "body_scale": "Digital Body Scale",
    "blood_pressure": "Blood Pressure Monitor",
    "body_temp": "Temperature Scanner"
  };
  mainStatus.textContent = titles[CURRENT_MACHINE] || "Health Terminal";
};

// === QR SCANNING LOGIC ===
async function startScan() {
  uiIdle.classList.add("hidden");
  uiMeasurement.classList.add("hidden");
  uiReader.classList.remove("hidden");
  
  mainStatus.textContent = "Scan your QR code to connect with Shinko Health App";
  scanningLocked = false;
  
  qrScanner = new Html5Qrcode("reader");
  try {
    await qrScanner.start(
      { facingMode: "environment" }, 
      { fps: 15, qrbox: { width: 250, height: 250 } }, 
      onScanSuccess
    );
  } catch (err) {
    mainStatus.textContent = "Camera blocked";
  }
}

function onScanSuccess(decodedText) {
  if (scanningLocked || !decodedText.startsWith("qrlogin:")) return;
  scanningLocked = true;
  consumeToken(decodedText.slice(8).trim());
}

async function consumeToken(token) {
  mainStatus.textContent = "Verifying Identity...";

  try {
    const res = await fetch(`${API_BASE}/qr/consume`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ token })
    });
    const data = await res.json();

    if (!res.ok) {
      mainStatus.textContent = data.detail || "Access Denied";
      setTimeout(stopScan, 2000);
      return;
    }

    if (qrScanner) {
      await qrScanner.stop();
      uiReader.classList.add("hidden");
    }
    
    prepareMeasurementUI(data.user);

  } catch (err) {
    mainStatus.textContent = "Network Error";
    setTimeout(stopScan, 2000);
  }
}

// === MEASUREMENT WORKFLOW ===

function prepareMeasurementUI(user) {
  activeUserId = user.user_id; // Store ID for the manual calculation trigger
  
  uiIdle.classList.add("hidden");
  uiMeasurement.classList.remove("hidden");
  
  // Reset visibility to show only the Manual Trigger button
  generateSection.classList.remove("hidden");
  loadingSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
  doneSection.classList.add("hidden"); 
  
  mainStatus.textContent = "Identity Confirmed";
  document.getElementById("patientName").textContent = `Welcome, ${user.name}`;
}

// Triggered by the "Generate Data" button
async function handleGenerateClick() {
  // 1. Enter Loading State
  generateSection.classList.add("hidden");
  loadingSection.classList.remove("hidden");
  mainStatus.textContent = "Calculating...";

  // 2. Simulate hardware processing delay (5 seconds)
  setTimeout(async () => {
    await finalizeMeasurements(activeUserId);
  }, 5000);
}

async function finalizeMeasurements(userId) {
  // 3. Calculate random data ONLY after the delay
  const newMeasurements = {
    user_id: userId,
    machine_type: CURRENT_MACHINE,
    body_weight: (Math.random() * (85 - 60) + 60).toFixed(1),
    heart_rate: Math.floor(Math.random() * (90 - 60) + 60),
    steps: Math.floor(Math.random() * 10000),
    sleep_quality: Math.floor(Math.random() * (100 - 60) + 60)
  };

  // 4. Transition to Results UI
  loadingSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");

  document.getElementById("readout_weight").innerHTML = `${newMeasurements.body_weight}<span class="text-2xl text-slate-500 ml-2">kg</span>`;
  document.getElementById("readout_hr").innerHTML = `${newMeasurements.heart_rate}<span class="text-2xl text-slate-500 ml-2">bpm</span>`;
  document.getElementById("readout_steps").innerHTML = `${newMeasurements.steps}<span class="text-2xl text-slate-500 ml-2">steps</span>`;
  document.getElementById("readout_sleep").innerHTML = `${newMeasurements.sleep_quality}<span class="text-2xl text-slate-500 ml-2">%</span>`;

  mainStatus.textContent = "Uploading to database...";

  try {
    await fetch(`${API_BASE}/metrics/update`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(newMeasurements)
    });
    mainStatus.textContent = "Data saved to your phone!";
  } catch (err) {
    mainStatus.textContent = "Upload Failed";
  }
  
  startLogoutCountdown();
}

// === SESSION MANAGEMENT ===

function startLogoutCountdown() {
  doneSection.classList.remove("hidden");
  let timeLeft = 60;
  countdownText.textContent = `AUTO-LOGOUT IN ${timeLeft}s`;

  if (countdownTimer) clearInterval(countdownTimer);

  countdownTimer = setInterval(() => {
    timeLeft--;
    countdownText.textContent = `AUTO-LOGOUT IN ${timeLeft}s`;
    
    if (timeLeft <= 0) resetKiosk(); 
  }, 1000);
}

async function stopScan() {
  if (qrScanner) {
    try { await qrScanner.stop(); qrScanner.clear(); } catch (err) {}
  }
  resetKiosk();
}

function resetKiosk() {
  if (countdownTimer) clearInterval(countdownTimer);
  activeUserId = null;
  
  uiReader.classList.add("hidden");
  uiMeasurement.classList.add("hidden");
  doneSection.classList.add("hidden");
  uiIdle.classList.remove("hidden");
  
  const titles = { "body_scale": "Digital Body Scale", "blood_pressure": "Blood Pressure Monitor", "body_temp": "Temperature Scanner" };
  mainStatus.textContent = titles[CURRENT_MACHINE] || "Health Terminal";
  scanningLocked = false;
}

// === EVENT LISTENERS ===
document.getElementById("startBtn").addEventListener("click", startScan);
document.getElementById("cancelScanBtn").addEventListener("click", stopScan);
document.getElementById("doneBtn").addEventListener("click", resetKiosk);
generateBtn.addEventListener("click", handleGenerateClick);