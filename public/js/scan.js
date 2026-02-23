// === Configuration & State ===
//--Test API--
//const API_BASE = "https://shinko-health-server.up.railway.app"; 

//--AWS ECR--
//const API_BASE = "http://52.204.206.89:8000"; 

//--AWS APP RUNNDER--
const API_BASE = "https://ftdzpwhncu.us-east-1.awsapprunner.com";
let qrScanner = null;
let scanningLocked = false;
let countdownTimer = null;
let activeUserId = null;
let currentLang = 'en';

const urlParams = new URLSearchParams(window.location.search);
const CURRENT_MACHINE = urlParams.get('machine') || 'body_scale';

// === Translations ===
const translations = {
    en: {
        idle_title: "Ready to Analyze?",
        idle_sub: "Tap button below",
        start_btn: "Start",
        scan_title: "Show QR Code",
        cancel_btn: "Cancel",
        welcome: "Welcome",
        results_title: "Analysis Results",
        results_sub: "Personal Health Summary",
        stand_still: "Station Ready. Stand Still.",
        calc_btn: "Calculate Now",
        finish_btn: "Finish",
        weight: "Weight",
        hr: "Heart Rate",
        steps: "Activity",
        sleep: "Sleep Quality",
        processing: "Processing",
        auto_reset: "Reset in",
        machine_titles: {
            "body_scale": "Digital Scale Terminal",
            "blood_pressure": "BP Monitor",
            "body_temp": "Temp Scanner"
        }
    },
    jp: {
        idle_title: "測定を開始しますか？",
        idle_sub: "下のボタンを押してください",
        start_btn: "スタート",
        scan_title: "QRコードをかざしてください",
        cancel_btn: "キャンセル",
        welcome: "ようこそ",
        results_title: "測定結果",
        results_sub: "パーソナル健康サマリー",
        stand_still: "準備完了。動かないでください。",
        calc_btn: "測定を開始する",
        finish_btn: "終了",
        weight: "体重",
        hr: "心拍数",
        steps: "歩数",
        sleep: "睡眠の質",
        processing: "解析中",
        auto_reset: "自動リセットまで:",
        machine_titles: {
            "body_scale": "体組成計端末",
            "blood_pressure": "血圧測定端末",
            "body_temp": "検温端末"
        }
    }
};

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

window.onload = applyTranslations;

function applyTranslations() {
    const lang = translations[currentLang];
    
    // Header Machine Title
    mainStatus.textContent = lang.machine_titles[CURRENT_MACHINE] || (currentLang === 'en' ? "Smart Terminal" : "スマート端末");

    // Static Labels
    document.getElementById("startBtn").textContent = lang.start_btn;
    document.getElementById("cancelScanBtn").textContent = lang.cancel_btn;
    document.getElementById("labelWeight").textContent = lang.weight;
    document.getElementById("labelHR").textContent = lang.hr;
    document.getElementById("labelSteps").textContent = lang.steps;
    document.getElementById("labelSleep").textContent = lang.sleep;
    document.getElementById("standStillMsg").textContent = lang.stand_still;
    document.getElementById("generateBtn").textContent = lang.calc_btn;
    document.getElementById("doneBtn").textContent = lang.finish_btn;
    document.getElementById("processingText").textContent = lang.processing;

    // Check Current State and update Header
    const isSession = document.getElementById("mainBody").classList.contains("session-active");
    if (!isSession) {
        document.getElementById("sessionHeader").textContent = lang.idle_title;
        document.getElementById("sessionSubheader").textContent = lang.idle_sub;
    } else if (resultsSection.classList.contains("hidden")) {
        const pName = document.getElementById("patientName")?.textContent || "--";
        document.getElementById("sessionHeader").innerHTML = `${lang.welcome} <span id="patientName" class="text-offken-green">${pName}</span>`;
        document.getElementById("sessionSubheader").textContent = lang.scan_title;
    } else {
        document.getElementById('sessionHeader').innerHTML = `${lang.results_title}`;
        document.getElementById('sessionSubheader').textContent = lang.results_sub;
    }
}

// Language Toggle Event
document.getElementById("langToggle").addEventListener("click", () => {
    currentLang = currentLang === 'en' ? 'jp' : 'en';
    applyTranslations();
});

async function startScan() {
    uiIdle.classList.add("hidden");
    uiReader.classList.remove("hidden");
    
    qrScanner = new Html5Qrcode("reader");
    
    // Calculate the scanning window to match the visual brackets (30% of view)
    const viewWidth = document.getElementById("reader").clientWidth;
    const qrboxSize = Math.floor(viewWidth * 0.6); // Matches the 30% visual opening

    try {
        await qrScanner.start(
            { facingMode: "environment" }, 
            { 
                fps: 24, 
                qrbox: { width: qrboxSize, height: qrboxSize },
                aspectRatio: 1.777778 // Keeps the 16:9 cinematic look
            }, 
            onScanSuccess
        );
    } catch (err) {
        console.error("Camera error:", err);
    }
}

function onScanSuccess(decodedText) {
    if (scanningLocked) return;
    if (decodedText.startsWith("qrlogin:")) {
        scanningLocked = true;
        consumeToken(decodedText.slice(8).trim());
    }
}

async function consumeToken(token) {
    try {
        const res = await fetch(`${API_BASE}/qr/consume`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (qrScanner) await qrScanner.stop();
        uiReader.classList.add("hidden");
        prepareMeasurementUI(data.user);
    } catch (err) { resetKiosk(); }
}

function prepareMeasurementUI(user) {
    activeUserId = user.user_id;
    uiMeasurement?.classList.remove("hidden");
    generateSection.classList.remove("hidden");
    const lang = translations[currentLang];
    document.getElementById("sessionHeader").innerHTML = `${lang.welcome} <span id="patientName" class="text-offken-green">${user.name}</span>`;
    document.getElementById("sessionSubheader").textContent = lang.stand_still;
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
            await fetch(`${API_BASE}/metrics/update`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(fakeMetrics)
            });
            displayResults(fakeMetrics);
        } catch (e) { resetKiosk(); }
    }, 3000);
});

function displayResults(data) {
    loadingSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");
    doneSection.classList.remove("hidden");

    const lang = translations[currentLang];
    document.getElementById('sessionHeader').innerHTML = `${lang.results_title}`;
    document.getElementById('sessionSubheader').textContent = lang.results_sub;

    document.getElementById("readout_weight").innerHTML = `${data.body_weight}<span class="text-[3vh] text-slate-500 ml-4">kg</span>`;
    document.getElementById("readout_hr").innerHTML = `${data.heart_rate}<span class="text-[3vh] text-slate-500 ml-4">bpm</span>`;
    document.getElementById("readout_steps").innerHTML = `${data.steps}<span class="text-[3vh] text-slate-500 ml-4">${currentLang === 'en' ? 'steps' : '歩'}</span>`;
    document.getElementById("readout_sleep").innerHTML = `${data.sleep_quality}<span class="text-[3vh] text-slate-500 ml-4">%</span>`;

    startLogoutCountdown();
}

function startLogoutCountdown() {
    let timeLeft = 60;
    const lang = translations[currentLang];
    countdownTimer = setInterval(() => {
        timeLeft--;
        document.getElementById("countdownText").textContent = `${lang.auto_reset} ${timeLeft}S`;
        if (timeLeft <= 0) resetKiosk();
    }, 1000);
}

function resetKiosk() {
    clearInterval(countdownTimer);
    scanningLocked = false;
    activeUserId = null;
    if (qrScanner?.getState() === 2) qrScanner.stop();
    uiReader.classList.add("hidden");
    resultsSection.classList.add("hidden");
    doneSection.classList.add("hidden");
    uiIdle.classList.remove("hidden");
    applyTranslations();
}