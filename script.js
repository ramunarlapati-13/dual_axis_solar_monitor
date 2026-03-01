// Simulate Solar Tracker System Data

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const compass = document.getElementById("compass");
    const horizAngleVal = document.getElementById("horiz-angle-val");

    const horizGaugeFill = document.getElementById("horiz-gauge-fill");
    const horizText = document.getElementById("horiz-text");
    const vertGaugeFill = document.getElementById("vert-gauge-fill");
    const vertText = document.getElementById("vert-text");

    const ldrTL = document.getElementById("ldr-tl");
    const ldrTLText = document.getElementById("ldr-tl-text");
    const ldrTR = document.getElementById("ldr-tr");
    const ldrTRText = document.getElementById("ldr-tr-text");
    const ldrBL = document.getElementById("ldr-bl");
    const ldrBLText = document.getElementById("ldr-bl-text");
    const ldrBR = document.getElementById("ldr-br");
    const ldrBRText = document.getElementById("ldr-br-text");

    const directionDisplay = document.getElementById("direction-display");
    const arrowUp = document.querySelector(".arrow.up");
    const arrowDown = document.querySelector(".arrow.down");
    const arrowLeft = document.querySelector(".arrow.left");
    const arrowRight = document.querySelector(".arrow.right");

    const uptimeDisplay = document.getElementById("uptime");
    const powerEfficiencyDisplay = document.getElementById("power-efficiency");
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
    const sendBtn = document.getElementById("send-manual-btn");

    // Chart Configuration
    const ctx = document.getElementById('historyChart').getContext('2d');
    const timeLabels = [];
    const azimuthData = [];
    const elevationData = [];

    const historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: 'Azimuth (Horizontal)',
                    data: azimuthData,
                    borderColor: '#00f3ff', // neon cyan
                    backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Elevation (Vertical)',
                    data: elevationData,
                    borderColor: '#ffb703', // amber
                    backgroundColor: 'rgba(255, 183, 3, 0.1)',
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
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    min: 0,
                    max: 180,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0', font: { family: 'Inter' } }
                }
            }
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

    // Map function
    const map = (val, in_min, in_max, out_min, out_max) => (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;

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

        // LDRs
        ldrTL.style.width = `${ldrValues.tl}%`;
        ldrTLText.textContent = `${Math.round(ldrValues.tl)}%`;

        ldrTR.style.width = `${ldrValues.tr}%`;
        ldrTRText.textContent = `${Math.round(ldrValues.tr)}%`;

        ldrBL.style.width = `${ldrValues.bl}%`;
        ldrBLText.textContent = `${Math.round(ldrValues.bl)}%`;

        ldrBR.style.width = `${ldrValues.br}%`;
        ldrBRText.textContent = `${Math.round(ldrValues.br)}%`;

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

    // Live Data Integration
    let ESP_IP = localStorage.getItem('esp_ip') || "192.168.137.23";
    const ipInput = document.getElementById('esp-ip-input');
    const updateIpBtn = document.getElementById('update-ip-btn');

    if (ipInput) ipInput.value = ESP_IP;

    if (updateIpBtn) {
        updateIpBtn.addEventListener('click', () => {
            const newIp = ipInput.value.trim();
            if (newIp) {
                ESP_IP = newIp;
                localStorage.setItem('esp_ip', ESP_IP);
                // Update IP display in stats as well
                const networkStatusText = document.getElementById('network-status');
                if (networkStatusText) {
                    networkStatusText.textContent = `Connecting (IP: ${ESP_IP})...`;
                }
                fetchData();
            }
        });
    }

    const FETCH_INTERVAL = 1000; // 1 second polling
    const FETCH_TIMEOUT = 1200;  // Immediate timeout if ESP is slow 

    async function fetchData() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
            const response = await fetch(`http://${ESP_IP}/data`, {
                mode: 'cors',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            // Set Online State Immediately
            networkStatusDisplay.textContent = `Connected (IP: ${ESP_IP})`;
            networkStatusDisplay.className = 'stat-value text-connected';
            systemStatusIndicator.classList.remove('offline');
            systemStatusText.textContent = 'System Online';
            const lastCheckDisplay = document.getElementById('last-online-check');
            if (lastCheckDisplay) {
                lastCheckDisplay.textContent = new Date().toLocaleTimeString();
            }

            if (!manualToggle.checked) {
                trackerModeDisplay.textContent = 'AUTO';
                trackerModeDisplay.style.color = 'var(--neon-cyan-main)';
            } else {
                trackerModeDisplay.textContent = 'MANUAL';
                trackerModeDisplay.style.color = 'var(--amber-main)';
            }

            /* Expected JSON structure from ESP:
            {
                "hAngle": 90,
                "vAngle": 45,
                "ldrTL": 800,
                "ldrTR": 750,
                "ldrBL": 400,
                "ldrBR": 450,
                "status": "Moving: LEFT"
            }
            */

            // Mapping ESP data to local variables
            horizontalServo = data.hAngle;
            verticalServo = data.vAngle;
            azimuthAngle = data.hAngle;
            stateMachine = data.status || 'STATIONARY';

            // Map LDRs (assuming 0-1024 range from ESP ADC)
            ldrValues.tl = (data.ldrTL / 1024) * 100;
            ldrValues.tr = (data.ldrTR / 1024) * 100;
            ldrValues.bl = (data.ldrBL / 1024) * 100;
            ldrValues.br = (data.ldrBR / 1024) * 100;

            // Efficiency Calculation
            let averageLdrPercent = (ldrValues.tl + ldrValues.tr + ldrValues.bl + ldrValues.br) / 4;
            let efficiency = Math.min(100, Math.max(0, averageLdrPercent));
            powerEfficiencyDisplay.textContent = `${efficiency.toFixed(1)}%`;

            // If in Auto Mode, update sliders to reflect actual position
            if (!manualToggle.checked) {
                hSlider.value = horizontalServo;
                vSlider.value = verticalServo;
                hSliderValText.textContent = `${Math.round(horizontalServo)}°`;
                vSliderValText.textContent = `${Math.round(verticalServo)}°`;
            }

            // Chart Updates
            const now = new Date();
            timeLabels.push(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
            azimuthData.push(horizontalServo);
            elevationData.push(verticalServo);

            if (timeLabels.length > 30) {
                timeLabels.shift();
                azimuthData.shift();
                elevationData.shift();
            }
            historyChart.update();
            updateUI();

        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Fetch error:', error);

            // Set Offline State Immediately
            networkStatusDisplay.textContent = 'Disconnected (ESP Offline)';
            networkStatusDisplay.className = 'stat-value text-disconnected';
            systemStatusIndicator.classList.add('offline');
            systemStatusText.textContent = 'System Offline';
            const lastCheckDisplay = document.getElementById('last-online-check');
            if (lastCheckDisplay) {
                lastCheckDisplay.textContent = "Retrying... " + new Date().toLocaleTimeString();
            }
            trackerModeDisplay.textContent = 'OFFLINE';
            trackerModeDisplay.style.color = '#ff3333';

            stateMachine = 'OFFLINE';
            updateUI();
        }
    }

    // Manual Command Sender
    async function sendManualCommand(h, v) {
        try {
            // Usually ESPs handle GET with params for simplicity, or POST
            // We'll use GET with query params: http://IP/set?h=90&v=45
            const response = await fetch(`http://${ESP_IP}/set?h=${h}&v=${v}`, {
                mode: 'cors'
            });
            if (response.ok) {
                console.log("Manual command sent successfully");
            }
        } catch (err) {
            console.error("Failed to send manual command:", err);
        }
    }

    // Event Listeners
    manualToggle.addEventListener('change', (e) => {
        const isManual = e.target.checked;
        if (isManual) {
            manualSlidersDiv.classList.remove('disabled-ui');
            hSlider.disabled = false;
            vSlider.disabled = false;
            sendBtn.disabled = false;
            trackerModeDisplay.textContent = 'MANUAL';
            trackerModeDisplay.style.color = 'var(--amber-main)';
        } else {
            manualSlidersDiv.classList.add('disabled-ui');
            hSlider.disabled = true;
            vSlider.disabled = true;
            sendBtn.disabled = true;
            trackerModeDisplay.textContent = 'AUTO';
            trackerModeDisplay.style.color = 'var(--neon-cyan-main)';
            // Tell ESP to go back to Auto mode if you have an endpoint for it
            fetch(`http://${ESP_IP}/auto`, { mode: 'cors' }).catch(console.error);
        }
    });

    hSlider.addEventListener('input', () => {
        hSliderValText.textContent = `${hSlider.value}°`;
    });

    vSlider.addEventListener('input', () => {
        vSliderValText.textContent = `${vSlider.value}°`;
    });

    sendBtn.addEventListener('click', () => {
        sendManualCommand(hSlider.value, vSlider.value);
    });

    // Weather Integration
    const WEATHER_API_KEY = "7609c7c1a86e12ff36f86ed3ca3f1cbc";
    const CITY = "Vijayawada";

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

            // Power Output Estimation
            // Let's assume a baseline 100W panel capacity for this example project
            const MAX_POWER_W = 100;
            const cloudCover = currentData.clouds ? currentData.clouds.all : 0; // percentage
            const timeNow = new Date().getHours();

            // Basic solar radiation curve by hour (peak at 12pm)
            // Starts rising at 6am, peaks at 12pm, sets at 6pm
            let sunAngleFactor = 0;
            if (timeNow >= 6 && timeNow <= 18) {
                // Sine wave curve from 0 to Pi between 6am and 6pm
                sunAngleFactor = Math.sin(((timeNow - 6) / 12) * Math.PI);
            }

            // Cloud cover reduces efficiency by its percentage
            const cloudFactor = 1 - (cloudCover / 100);

            // Calculate final estimate
            const estimatedPower = Math.round(MAX_POWER_W * sunAngleFactor * cloudFactor);

            const powerEstimateElem = document.getElementById('power-estimate');
            if (powerEstimateElem) {
                powerEstimateElem.textContent = `${estimatedPower} W`;
            }

            const powerFormulaElem = document.getElementById('power-formula');
            if (powerFormulaElem) {
                powerFormulaElem.textContent = `Formula: Max (100W) × Sun Angle (~${(sunAngleFactor * 100).toFixed(0)}%) × Sky Clarity (${(cloudFactor * 100).toFixed(0)}%)`;
            }

        } catch (error) {
            console.error("Failed to fetch weather data: ", error);
        }
    }

    // Loops
    setInterval(fetchData, FETCH_INTERVAL);
    setInterval(updateUptime, 1000);
    setInterval(fetchWeatherData, 600000); // 10 minutes
    updateUI(); // Init
    fetchWeatherData(); // Init weather
});
