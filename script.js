// Simulate Solar Tracker System Data
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push, get, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const compass = document.getElementById("compass");
    const horizAngleVal = document.getElementById("horiz-angle-val");

    const horizGaugeFill = document.getElementById("horiz-gauge-fill");
    const horizText = document.getElementById("horiz-text");
    const vertGaugeFill = document.getElementById("vert-gauge-fill");
    const vertText = document.getElementById("vert-text");

    const directionDisplay = document.getElementById("direction-display");
    const arrowUp = document.querySelector(".arrow.up");
    const arrowDown = document.querySelector(".arrow.down");
    const arrowLeft = document.querySelector(".arrow.left");
    const arrowRight = document.querySelector(".arrow.right");

    const uptimeDisplay = document.getElementById("uptime");
    const powerEfficiencyDisplay = document.getElementById("power-efficiency");
    const panelVoltageDisplay = document.getElementById("panel-voltage");
    const networkStatusDisplay = document.getElementById("network-status");
    const systemStatusIndicator = document.getElementById("system-status-indicator");
    const systemStatusText = document.getElementById("system-status-text");
    const trackerModeDisplay = document.getElementById("tracker-mode");

    // Manual Control Elements
    const manualToggle = document.getElementById("manual-mode-toggle");
    const manualSlidersDiv = document.getElementById("manual-sliders");
    const hSlider = document.getElementById("manual-h-slider");
    const vSlider = document.getElementById("manual-v-slider");
    const hSliderValText = document.getElementById("manual-h-val");
    const vSliderValText = document.getElementById("manual-v-val");
    const btnAuto = document.getElementById("btn-auto");
    const btnManual = document.getElementById("btn-manual");

    // --- Chart Configurations ---
    const servoCtx = document.getElementById('servoChart').getContext('2d');
    const voltageCtx = document.getElementById('voltageChart').getContext('2d');
    const timeLabels = [];
    const azimuthData = [];
    const elevationData = [];
    const voltageData = [];

    // Servo Positions History Chart
    const servoChart = new Chart(servoCtx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Azimuth (Horizontal)',
                    data: azimuthData,
                    borderColor: '#00f3ff', // neon cyan
                    backgroundColor: 'rgba(0, 243, 255, 0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Elevation (Vertical)',
                    data: elevationData,
                    borderColor: '#ffb703', // amber
                    backgroundColor: 'rgba(255, 183, 3, 0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                y: { min: 0, max: 180, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Degrees', color: '#94a3b8' } }
            },
            plugins: { legend: { labels: { color: '#e2e8f0', font: { family: 'Inter' } } } }
        }
    });

    // Panel Voltage History Chart
    const voltageChart = new Chart(voltageCtx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Voltage (V)',
                    data: voltageData,
                    borderColor: '#a855f7', // purple
                    backgroundColor: 'rgba(168, 85, 247, 0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                y: { min: 0, max: 6, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#a855f7' }, title: { display: true, text: 'Voltage (V)', color: '#a855f7' } }
            },
            plugins: { legend: { labels: { color: '#e2e8f0', font: { family: 'Inter' } } } }
        }
    });

    // System State
    let horizontalServo = 90; // 0 to 180 degrees
    let verticalServo = 45;   // 0 to 180 degrees (elevation)
    let azimuthAngle = 90;    // Compass mapping
    let stateMachine = 'STATIONARY';

    // LDR Values 0-1023 simulated as 0-100%
    let ldrValues = { tl: 50, tr: 50, bl: 50, br: 50 };

    // Set Launch Time for Uptime
    const launchTime = Date.now();

    // Format Uptime
    function updateUptime() {
        const diff = Date.now() - launchTime;
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
        const minutes = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
        const seconds = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        uptimeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }

    // Update UI Elements
    function updateUI() {
        // Compass
        compass.style.transform = `rotate(${azimuthAngle - 90}deg)`; // -90 aligns visual
        horizAngleVal.textContent = Math.round(azimuthAngle);

        // Gauges 0-180deg mapped to 0-180deg CSS rotation
        horizGaugeFill.style.transform = `rotate(${horizontalServo}deg)`;
        horizText.textContent = Math.round(horizontalServo);

        vertGaugeFill.style.transform = `rotate(${verticalServo}deg)`;
        vertText.textContent = Math.round(verticalServo);

        // Direction Status
        directionDisplay.textContent = stateMachine;

        // Direction glow colors based on text content
        if (stateMachine === 'STATIONARY') {
            directionDisplay.style.color = '#00e676';
            directionDisplay.style.textShadow = '0 0 15px rgba(0, 230, 118, 0.6)';
            directionDisplay.style.borderColor = 'rgba(0, 230, 118, 0.3)';
            directionDisplay.style.background = 'rgba(0, 230, 118, 0.1)';
        } else {
            directionDisplay.style.color = '#ffb703';
            directionDisplay.style.textShadow = '0 0 15px rgba(255, 183, 3, 0.6)';
            directionDisplay.style.borderColor = 'rgba(255, 183, 3, 0.3)';
            directionDisplay.style.background = 'rgba(255, 183, 3, 0.1)';
        }

        // Arrows
        arrowUp.classList.remove('active');
        arrowDown.classList.remove('active');
        arrowLeft.classList.remove('active');
        arrowRight.classList.remove('active');

        if (stateMachine.includes('UP')) arrowUp.classList.add('active');
        if (stateMachine.includes('DOWN')) arrowDown.classList.add('active');
        if (stateMachine.includes('LEFT')) arrowLeft.classList.add('active');
        if (stateMachine.includes('RIGHT')) arrowRight.classList.add('active');
    }
    // Helper: Shared telemetry processor for both Firebase and IP fetches
    function handleTelemetryData(data) {
        if (!data) return;

        const rawH = data.h !== undefined ? data.h : (data.hAngle !== undefined ? data.hAngle : horizontalServo);
        const rawV = data.v !== undefined ? data.v : (data.vAngle !== undefined ? data.vAngle : verticalServo);
        // Clamp to valid servo ranges — guards against corrupted Firebase values
        horizontalServo = Math.min(180, Math.max(0, parseFloat(rawH) || 90));
        verticalServo = Math.min(150, Math.max(20, parseFloat(rawV) || 45));
        azimuthAngle = horizontalServo;
        stateMachine = data.status || 'STATIONARY';

        ldrValues.tl = data.ldrTL !== undefined ? (data.ldrTL / 1024) * 100 : ldrValues.tl;
        ldrValues.tr = data.ldrTR !== undefined ? (data.ldrTR / 1024) * 100 : ldrValues.tr;
        ldrValues.bl = data.ldrBL !== undefined ? (data.ldrBL / 1024) * 100 : ldrValues.bl;
        ldrValues.br = data.ldrBR !== undefined ? (data.ldrBR / 1024) * 100 : ldrValues.br;

        let averageLdrPercent = (ldrValues.tl + ldrValues.tr + ldrValues.bl + ldrValues.br) / 4;
        let efficiency = Math.min(100, Math.max(0, averageLdrPercent));
        powerEfficiencyDisplay.textContent = `${efficiency.toFixed(1)}%`;

        if (data.voltage !== undefined) {
            const voltageV = parseFloat(data.voltage);          // Volts from sensor
            const voltageMV = (voltageV * 1000).toFixed(0);     // Convert V → mV
            const ASSUMED_CURRENT_A = 0.5;                       // Assumed panel current
            const powerW = (voltageV * ASSUMED_CURRENT_A).toFixed(2); // P = V × I

            panelVoltageDisplay.textContent = `${voltageV.toFixed(2)} V`;

            const mvElem = document.getElementById('power-mv');
            const vElem = document.getElementById('power-volts');
            const wElem = document.getElementById('power-estimate');
            const fElem = document.getElementById('power-formula');

            if (mvElem) mvElem.textContent = `${voltageMV} mV`;
            if (vElem) vElem.textContent = `${voltageV.toFixed(2)} V`;
            if (wElem) wElem.textContent = `${powerW} W`;
            if (fElem) fElem.textContent =
                `Input: ${voltageMV} mV (millivolts) → ${voltageV.toFixed(2)} V × 0.5 A = ${powerW} W`;
        }

        if (!manualToggle.checked) {
            hSlider.value = horizontalServo;
            vSlider.value = verticalServo;
            hSliderValText.textContent = `${Math.round(horizontalServo)}°`;
            vSliderValText.textContent = `${Math.round(verticalServo)}°`;
        }

        // Chart arrays are updated by the 2-second ticker (see setInterval below)
        // This avoids double-plotting when Firebase fires and the ticker fires simultaneously
        updateUI();

        const lastCheckDisplay = document.getElementById('last-online-check');
        if (lastCheckDisplay) lastCheckDisplay.textContent = new Date().toLocaleTimeString();
    }
    // --- Firebase Realtime Database Integration ---
    const app = initializeApp(CONFIG.FIREBASE_CONFIG);
    const db = getDatabase(app);
    const dataRef = ref(db, 'solar_tracker/data');
    const controlsRef = ref(db, 'solar_tracker/controls');
    const historyRef = ref(db, 'solar_tracker/history'); // Persistent history in Firebase
    const connectedRef = ref(db, '.info/connected');

    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            networkStatusDisplay.textContent = `Connected (Firebase Cloud)`;
            networkStatusDisplay.className = 'stat-value text-connected';
            systemStatusIndicator.classList.remove('offline');
            systemStatusText.textContent = 'System Online';
        } else {
            networkStatusDisplay.textContent = 'Disconnected (Firebase)';
            networkStatusDisplay.className = 'stat-value text-disconnected';
            systemStatusIndicator.classList.add('offline');
            systemStatusText.textContent = 'System Offline';
            stateMachine = 'OFFLINE';
            updateUI();
        }
    });

    onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        if (data) handleTelemetryData(data);
    });

    onValue(controlsRef, (snapshot) => {
        const controls = snapshot.val();
        if (!controls) return;

        if (controls.manualMode !== undefined) {
            if (controls.manualMode !== manualToggle.checked) {
                manualToggle.checked = controls.manualMode;
                if (controls.manualMode) {
                    manualSlidersDiv.classList.remove('disabled-ui');
                    hSlider.disabled = false;
                    vSlider.disabled = false;
                    trackerModeDisplay.textContent = 'MANUAL';
                    trackerModeDisplay.style.color = 'var(--amber-main)';
                    btnManual.classList.add('active');
                    btnAuto.classList.remove('active');
                } else {
                    manualSlidersDiv.classList.add('disabled-ui');
                    hSlider.disabled = true;
                    vSlider.disabled = true;
                    trackerModeDisplay.textContent = 'AUTO';
                    trackerModeDisplay.style.color = 'var(--neon-cyan-main)';
                    btnAuto.classList.add('active');
                    btnManual.classList.remove('active');
                }
            }
        }
    });

    // Button Listeners for mode switching
    btnAuto.addEventListener('click', () => {
        manualToggle.checked = false;
        manualToggle.dispatchEvent(new Event('change'));
    });

    btnManual.addEventListener('click', () => {
        manualToggle.checked = true;
        manualToggle.dispatchEvent(new Event('change'));
    });

    // Event Listeners - Push User Inputs directly to Firebase OR Local IP
    manualToggle.addEventListener('change', (e) => {
        const isManual = e.target.checked;
        if (isManual) {
            manualSlidersDiv.classList.remove('disabled-ui');
            hSlider.disabled = false;
            vSlider.disabled = false;
            trackerModeDisplay.textContent = 'MANUAL';
            trackerModeDisplay.style.color = 'var(--amber-main)';
            btnManual.classList.add('active');
            btnAuto.classList.remove('active');
            update(controlsRef, { manualMode: true });
        } else {
            manualSlidersDiv.classList.add('disabled-ui');
            hSlider.disabled = true;
            vSlider.disabled = true;
            trackerModeDisplay.textContent = 'AUTO';
            trackerModeDisplay.style.color = 'var(--neon-cyan-main)';
            btnAuto.classList.add('active');
            btnManual.classList.remove('active');
            // Clear stale manual target — prevents ESP8266 picking up old 180° on reboot
            update(controlsRef, { manualMode: false, targetH: 90, targetV: 45 });
            hSlider.value = 90;
            vSlider.value = 45;
            hSliderValText.textContent = '90°';
            vSliderValText.textContent = '45°';
        }
    });

    hSlider.addEventListener('input', () => {
        const val = parseInt(hSlider.value);
        hSliderValText.textContent = `${val}°`;
        horizontalServo = val;   // update gauge immediately
        azimuthAngle = val;
        updateUI();
        update(controlsRef, { targetH: val });
    });

    vSlider.addEventListener('input', () => {
        const val = parseInt(vSlider.value);
        vSliderValText.textContent = `${val}°`;
        verticalServo = val;     // update gauge immediately
        updateUI();
        update(controlsRef, { targetV: val });
    });

    // Weather Integration
    // Loading keys from config.js to prevent exposing them in public repositories
    const WEATHER_API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.WEATHER_API_KEY : 'YOUR_API_KEY_HERE';
    const CITY = typeof CONFIG !== 'undefined' ? CONFIG.CITY : 'Vijayawada';

    async function fetchWeatherData() {
        try {
            // Fetch Current Weather
            const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${WEATHER_API_KEY}&units=metric`);

            if (!currentRes.ok) {
                const errorData = await currentRes.json();
                if (currentRes.status === 401) {
                    document.getElementById('weather-temp').textContent = "ERR";
                    document.getElementById('weather-condition').textContent = "Invalid/Inactive API Key";
                    document.getElementById('weather-humidity').textContent = "Keys take ~2hrs to activate.";
                    return;
                }
                throw new Error('Weather fetch failed');
            }

            const currentData = await currentRes.json();

            if (currentData.main) {
                document.getElementById('weather-temp').textContent = `${Math.round(currentData.main.temp)}°C`;
                document.getElementById('weather-condition').textContent = currentData.weather[0].description;
                document.getElementById('weather-humidity').textContent = `Humidity: ${currentData.main.humidity}%`;
            }

            // Fetch Forecast
            const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&appid=${WEATHER_API_KEY}&units=metric`);
            if (!forecastRes.ok) throw new Error('Forecast fetch failed');
            const forecastData = await forecastRes.json();

            const forecastContainer = document.getElementById('forecast-container');
            if (forecastData.list && forecastContainer) {
                forecastContainer.innerHTML = '';
                // Get next 5 entries (3-hour intervals)
                for (let i = 0; i < 5; i++) {
                    const item = forecastData.list[i];
                    const date = new Date(item.dt * 1000);
                    let hours = date.getHours();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12;

                    const timeStr = `${hours} ${ampm}`;
                    const icon = item.weather[0].icon;
                    const temp = Math.round(item.main.temp);

                    forecastContainer.innerHTML += `
                        <div class="forecast-item">
                            <span class="forecast-time">${timeStr}</span>
                            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="icon">
                            <span class="forecast-temp">${temp}°C</span>
                        </div>
                    `;
                }
            }

            // Weather still shown in the forecast; power card now uses real voltage data

        } catch (error) {
            console.error("Failed to fetch weather data: ", error);
        }
    }

    // --- History Storage: Firebase RTDB (keys stay in config.js only) ---
    // Note: CONFIG.FIREBASE_CONFIG is loaded from config.js — keys are never hardcoded here.

    function logHistory() {
        const voltRaw = panelVoltageDisplay ? panelVoltageDisplay.textContent : '0 V';
        const entry = {
            t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            ts: Date.now(),   // Unix timestamp for ordering
            h: Math.round(horizontalServo),
            v: Math.round(verticalServo),
            vol: parseFloat(voltRaw) || 0
        };
        // Push to Firebase — persists across browser sessions and devices
        push(historyRef, entry).catch(err => console.warn('History log failed:', err));
    }

    const historyModal = document.getElementById('history-modal');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    let pastServoChartInstance = null;
    let pastVoltageChartInstance = null;

    function renderPastHistory() {
        if (!historyModal.classList.contains('active')) return;

        if (pastServoChartInstance) pastServoChartInstance.destroy();
        if (pastVoltageChartInstance) pastVoltageChartInstance.destroy();

        // Load history from Firebase (read once)
        get(historyRef).then(snapshot => {
            const raw = snapshot.val();
            const entries = raw ? Object.values(raw).sort((a, b) => (a.ts || 0) - (b.ts || 0)) : [];

            // Trim to last 200 entries
            const recent = entries.slice(-200);
            const labels = recent.map(d => d.t);
            const hData = recent.map(d => d.h);
            const vData = recent.map(d => d.v);
            const volData = recent.map(d => d.vol);

            // Servo chart
            pastServoChartInstance = new Chart(document.getElementById('pastServoChart').getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: 'Azimuth', data: hData, borderColor: '#00f3ff', tension: 0.3 },
                        { label: 'Elevation', data: vData, borderColor: '#ffb703', tension: 0.3 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { min: 0, max: 180, ticks: { color: '#94a3b8' } } }
                }
            });

            // Voltage chart
            pastVoltageChartInstance = new Chart(document.getElementById('pastVoltageChart').getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{ label: 'Voltage (V)', data: volData, borderColor: '#a855f7', tension: 0.3 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { min: 0, max: 6, ticks: { color: '#a855f7' } } }
                }
            });
        }).catch(err => {
            console.error('Failed to load history from Firebase:', err);
        });
    }

    viewHistoryBtn.addEventListener('click', () => {
        historyModal.classList.add('active');
        renderPastHistory();
    });

    closeModalBtn.addEventListener('click', () => historyModal.classList.remove('active'));

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear ALL history from the database?')) {
            remove(historyRef)
                .then(() => {
                    if (pastServoChartInstance) pastServoChartInstance.destroy();
                    if (pastVoltageChartInstance) pastVoltageChartInstance.destroy();
                    historyModal.classList.remove('active');
                })
                .catch(err => console.error('Failed to clear history:', err));
        }
    });

    // Loops & Init
    setInterval(updateUptime, 1000);
    setInterval(fetchWeatherData, 3600000); // Hourly weather
    setInterval(logHistory, 300000); // Log history every 5 minutes

    // Continuous chart ticker — pushes a point every 2s using last known values
    // This makes graphs scroll in real time even when Firebase data is unchanged
    setInterval(() => {
        const now = new Date();
        const label = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        timeLabels.push(label);
        azimuthData.push(horizontalServo);
        elevationData.push(verticalServo);
        // Read latest voltage from the display element so chart stays in sync
        const rawVol = panelVoltageDisplay ? parseFloat(panelVoltageDisplay.textContent) : 0;
        voltageData.push(isNaN(rawVol) ? 0 : rawVol);

        if (timeLabels.length > 30) {
            timeLabels.shift();
            azimuthData.shift();
            elevationData.shift();
            voltageData.shift();
        }
        servoChart.update('none'); // 'none' = skip animation for smooth scrolling
        voltageChart.update('none');
    }, 2000);

    updateUI();
    fetchWeatherData();
    logHistory(); // First log immediately
});
