// === Configuration ===
const API_BASE = "https://shinko-health-server.up.railway.app"; 
let qrScanner = null;
let scanningLocked = false;
let countdownTimer = null;
let activeUserId = null;

// Identify machine type from URL
const urlParams = new URLSearchParams(window.location.search);
const CURRENT_MACHINE = urlParams.get('machine') || 'body_scale';

// === UI Elements ===
const uiIdle = document.getElementById("idleState");
const uiReader = document.getElementById("reader-container");
const uiMeasurement = document.getElementById("measurementState");
const mainStatus = document.getElementById("mainStatus");

const generateSection = document.getElementById("generateSection");
const loadingSection = document.getElementById("loadingSection");
const resultsSection = document.getElementById("resultsSection");
const doneSection = document.getElementById("doneSection");
const generateBtn = document.getElementById("generateBtn");

window.onload = () => {
    const titles = { 
        "body_scale": "Digital Scale Terminal", 
        "blood_pressure": "BP Monitor", 
        "body_temp": "Temp Scanner" 
    };
    mainStatus.textContent = titles[CURRENT_MACHINE] || "Smart Terminal";
};

// === QR Scanning Logic ===
async function startScan() {
    uiIdle.classList.add("hidden");
    uiMeasurement.classList.add("hidden");
    uiReader.classList.remove("hidden");
    
    document.getElementById("reader").style.display = "block";

    qrScanner = new Html5Qrcode("reader");
    try {
        await qrScanner.start(
            { facingMode: "environment" }, 
            { 
                fps: 15, 
                qrbox: { width: 250, height: 250 } 
            }, 
            onScanSuccess
        );
    } catch (err) {
        console.error("Camera error:", err);
        mainStatus.textContent = "Camera Access Blocked";
        setTimeout(resetKiosk, 3000);
    }
}

function onScanSuccess(decodedText) {
    if (scanningLocked) return;
    
    if (decodedText.startsWith("qrlogin:")) {
        scanningLocked = true;
        const token = decodedText.slice(8).trim();
        consumeToken(token);
    }
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
            setTimeout(resetKiosk, 2000);
            return;
        }

        if (qrScanner) { await qrScanner.stop(); }
        uiReader.classList.add("hidden");
        prepareMeasurementUI(data.user);
        
    } catch (err) {
        mainStatus.textContent = "Network Error";
        setTimeout(resetKiosk, 2000);
    }
}

// === Measurement Logic ===
function prepareMeasurementUI(user) {
    activeUserId = user.user_id;
    uiMeasurement.classList.remove("hidden");
    generateSection.classList.remove("hidden");
    loadingSection.classList.add("hidden");
    resultsSection.classList.add("hidden");
    doneSection.classList.add("hidden");
    
    document.getElementById("patientName").textContent = `Welcome, ${user.name}`;
}

generateBtn.addEventListener("click", async () => {
    generateSection.classList.add("hidden");
    loadingSection.classList.remove("hidden");

    setTimeout(async () => {
        const fakeMetrics = {
            user_id: activeUserId,
            machine_type: CURRENT_MACHINE,
            body_weight: (Math.random() * (85 - 60) + 60).toFixed(1),
            heart_rate: Math.floor(Math.random() * (90 - 60) + 60),
            steps: Math.floor(Math.random() * (12000 - 2000) + 2000),
            sleep_quality: Math.floor(Math.random() * (100 - 60) + 60)
        };

        try {
            const res = await fetch(`${API_BASE}/metrics/update`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(fakeMetrics)
            });

            if (res.ok) {
                displayResults(fakeMetrics);
            } else {
                mainStatus.textContent = "Data Upload Failed";
            }
        } catch (e) {
            console.error("Upload error:", e);
            mainStatus.textContent = "Connection Lost";
        }
    }, 5000);
});

function displayResults(data) {
    loadingSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");
    doneSection.classList.remove("hidden");

    document.getElementById("readout_weight").innerHTML = `${data.body_weight}<span class="text-[3vh] text-slate-500 ml-4">kg</span>`;
    document.getElementById("readout_hr").innerHTML = `${data.heart_rate}<span class="text-[3vh] text-slate-500 ml-4">bpm</span>`;
    document.getElementById("readout_steps").innerHTML = `${data.steps}<span class="text-[3vh] text-slate-500 ml-4">steps</span>`;
    document.getElementById("readout_sleep").innerHTML = `${data.sleep_quality}<span class="text-[3vh] text-slate-500 ml-4">%</span>`;

    startLogoutCountdown();
}

// === Session Helpers ===
function startLogoutCountdown() {
    let timeLeft = 60;
    document.getElementById("countdownText").textContent = `AUTO-RESET IN ${timeLeft}S`;
    
    if (countdownTimer) clearInterval(countdownTimer);
    
    countdownTimer = setInterval(() => {
        timeLeft--;
        document.getElementById("countdownText").textContent = `AUTO-RESET IN ${timeLeft}S`;
        if (timeLeft <= 0) resetKiosk();
    }, 1000);
}

function resetKiosk() {
    if (countdownTimer) clearInterval(countdownTimer);
    if (qrScanner && qrScanner.getState() === 2) {
        qrScanner.stop();
    }
    
    scanningLocked = false;
    activeUserId = null;
    
    uiReader.classList.add("hidden");
    uiMeasurement.classList.add("hidden");
    uiIdle.classList.remove("hidden");
    
    mainStatus.textContent = "Smart Terminal Ready";
}

document.getElementById("startBtn").addEventListener("click", startScan);
document.getElementById("cancelScanBtn").addEventListener("click", resetKiosk);
document.getElementById("doneBtn").addEventListener("click", resetKiosk);