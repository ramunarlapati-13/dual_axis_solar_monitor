# Dual-Axis Solar Monitoring System

A responsive web dashboard designed to track and monitor a dual-axis solar tracking system connected to an **ESP8266 NodeMCU**. The interface provides real-time telemetry — including live servo angles, panel voltage, motor control, weather integration, and historical performance graphs — all synchronized through **Firebase Realtime Database**.

### 🔗 [Live Demo](https://dual-axis-solar-monitor.vercel.app/)
### 📖 [Read Full Documentation](https://ramublogs.vercel.app/blogs/solar-tracker-esp8266)

## Table of Contents
- [Recent Updates (2026-03-06)](#recent-updates-2026-03-06)
- [Getting Started](#getting-started)
- [Dashboard Features](#dashboard-features)
- [Data Architecture & Calculations](#data-architecture--calculations)
  - [Live Angle Rendering](#live-angle-rendering)
  - [Real-Time Power Output Formula](#real-time-power-output-formula)
  - [History Logging to Firebase](#history-logging-to-firebase)
- [Security & Key Management](#security--key-management)
- [Technologies Used](#technologies-used)
- [ESP8266 Dual-Axis Solar Tracker](#esp8266-dual-axis-solar-tracker)
  - [1. System Architecture](#1-system-architecture)
  - [2. Required Components](#2-required-components)
  - [3. Component Connections & Pin Configuration](#3-component-connections--pin-configuration)
  - [4. Circuit Schematic Notes](#4-circuit-schematic-notes)
  - [5. Software Features](#5-software-features)
  - [6. Calibration Procedure](#6-calibration-procedure)
  - [7. Maintenance & Safety](#7-maintenance--safety)
  - [8. Source Code](#8-source-code)
  - [9. Website Structure & Data Flow](#9-website-structure--data-flow)

---

## Recent Updates (2026-03-06)

All features built in today's session:

### 🎛️ Unified Servomotor Control Card
- **Merged** the previous separate "Servo Positions" and "Manual Override" panels into a single **"Servomotor Control"** card.
- Added a sleek **Auto / Manual mode switcher** button pair replacing the old toggle switch:
  - **Auto** (Neon Cyan) → ESP8266 controls servos via LDR sensors automatically.
  - **Manual** (Amber) → Dashboard sliders take full control of both axes.
- Sliders now **instantly update the gauges** in real time as you drag them (no waiting for Firebase echo).
- Servo angles are now **clamped** (H: 0–180°, V: 20–150°) to guard against corrupted Firebase values (e.g., the `-16209°` bug is fixed).

### 📊 Separate Graphs for Angles and Voltage
- Split the combined dual-axis chart into **two independent graphs**:
  - **Motor Response History (Degrees)** — tracks Azimuth (cyan) and Elevation (amber) over time.
  - **Panel Performance History (Voltage)** — tracks panel voltage (purple) over time.
- Both graphs are displayed **side by side**, spanning the full page width.
- Each graph has its own correctly scaled Y-axis (0–180° and 0–6V respectively).

### ⚡ Real-Time Power Output Card (Voltage-Based)
- Replaced the weather-estimate-only power card with a **3-row real sensor reading display**:
  - 📡 **Sensor Input** — raw reading converted to **millivolts (mV)** for easy understanding.
  - ⚡ **Panel Voltage** — the same value displayed in **Volts (V)**.
  - 🔋 **Estimated Output** — calculated in **Watts (W)** using `P = V × I`.
- Formula displayed inline: `Input: X mV → Y V × 0.5 A (assumed) = Z W`.
- > **Note:** 0.5A is an assumed constant because the circuit has no current sensor (INA219/ACS712). To get a truly accurate wattage, add a current sensor to the ESP8266 circuit and publish `current` alongside `voltage` to Firebase.

### 🗄️ Persistent History in Firebase (Replaces localStorage)
- History is now stored in **Firebase Realtime Database** at `solar_tracker/history/` instead of `localStorage`.
- A new snapshot `{ timestamp, h, v, vol }` is `push()`-ed to Firebase **every 5 minutes**.
- The **"View Past Data"** modal reads directly from Firebase with `get()`, sorts by Unix timestamp, and renders the last 200 entries.
- History is truly **persistent** — survives browser cache clears, device changes, and power cycles.
- **"Clear History"** calls `remove()` on the Firebase node to wipe the database cleanly.

### 🔐 Security Improvements
- All Firebase and Weather API keys are stored **exclusively in `config.js`** and `.env`.
- `config.js` and `.env` are now listed in **`.gitignore`** to prevent accidental key exposure in public Git repositories.
- ESP8266 firmware (`esp8266_tracker.ino`) now uses **placeholder strings** (`YOUR_WIFI_SSID`, etc.) — the real values are recorded only in `.env`.

### 🛠️ Bug Fixes
- Fixed a **dashboard crash** caused by a stale reference to a removed `historyChart` canvas element (left over when splitting charts). All timers, weather, and Firebase listeners now initialize correctly.
- Fixed **slider → gauge sync**: adjusting a slider in Manual mode now instantly moves the on-screen gauge without waiting for a Firebase round-trip.
- Fixed **ghost voltage readings**: when the solar panel is disconnected, the A0 pin floats and generates noise. A software noise floor now forces readings below ~0.05V to exactly 0.00V.
- Fixed **corrupted angle display** (`-16209°`) by adding range-clamping on all servo values read from Firebase.



## Getting Started

Because this application relies exclusively on frontend code (HTML, CSS, JavaScript) communicating with your local ESP32 network device, there are no intense backend frameworks to build.

1.  **Environment Variables:** All secure credentials (API keys, WiFi passwords) are abstracted into a `.env` file. This `.env` file is kept out of version control.
2.  Copy your specific API keys from your `.env` file and paste them into `config.js` (for Web Dashboard) and `esp8266_tracker.ino` (for ESP8266). Ensure `config.js` stays in your `.gitignore`.
3.  Serve the current folder using a simple HTTP server (e.g., `npx serve .`).
4.  Open your browser to the localhost address provided by the utility.
5.  Enter the target ESP32's IP address (e.g., `192.168.137.23`) directly at the top of the dashboard and press `CONNECT`.

## Data Architecture & Calculations

The frontend dashboard is a fully live GUI synchronized with Firebase Realtime Database:

### Live Angle Rendering
- The ESP8266 publishes to Firebase every 500ms; the dashboard uses `onValue()` to listen for changes — no polling required.
- **Firebase Payload:** `{ h, v, ldrTL, ldrTR, ldrBL, ldrBR, status, voltage }`
- **Azimuth (Horizontal):** `h` is clamped 0°–180° and rotates the SVG compass needle via `rotate(h - 90)deg`.
- **Elevation (Vertical):** `v` is clamped 20°–150° and drives the vertical gauge arc fill.
- Both values also feed the **Motor Response History** chart in real time.

### Real-Time Power Output Formula

The power card uses the **actual sensor voltage**, not a weather estimate:

```
Power (W) = Voltage (V) × Assumed Current (A)
```

| Step | Value | Source |
|------|-------|--------|
| Sensor Input | millivolts (mV) | ESP8266 A0 pin → Firebase |
| Panel Voltage | Volts (V) | mV ÷ 1000 |
| Assumed Current | **0.5 A** | Hardcoded — no current sensor fitted |
| **Power Output** | **Watts (W)** | V × 0.5A |

> **⚠️ Limitation:** Without a hardware current sensor (INA219 or ACS712), the 0.5A figure is an approximation. The voltage reading is accurate; the watts are estimated.

### History Logging to Firebase

Every 5 minutes, `logHistory()` calls `push(historyRef, entry)` to store:

```json
{
  "t": "12:30",
  "ts": 1741200600000,
  "h": 90,
  "v": 45,
  "vol": 1.75
}
```

The **"View Past Data"** modal fetches all records with `get(historyRef)`, sorts them by `ts`, and renders two separate charts for servo movement and panel voltage history.

## Security & Key Management

| Location | Contains | Git Status |
|----------|----------|------------|
| `.env` | WiFi SSID/Password, Firebase Auth, Weather API Key | ✅ Gitignored |
| `config.js` | Firebase Config object, Weather API Key | ✅ Gitignored |
| `script.js` | Reads from `CONFIG.*` only — **no hardcoded keys** | 🟢 Safe to commit |
| `esp8266_tracker.ino` | Placeholder strings (`YOUR_WIFI_SSID`) | 🟢 Safe to commit |

## Technologies Used
- **HTML5 / CSS3** — Grid, Flexbox, Glassmorphism theme
- **Vanilla JavaScript** — No frameworks, ES modules
- **[Chart.js](https://www.chartjs.org/)** — Two real-time + two history charts
- **Firebase Realtime Database** — Live telemetry sync + persistent history storage
- **OpenWeatherMap API** — Live weather & 3-hour forecast for Vijayawada
- **ESP8266 NodeMCU** — Microcontroller running solar tracking firmware



# ESP8266 Dual-Axis Solar Tracker

This documentation covers the design, wiring, and implementation of a smart solar tracking system using an ESP8266 (NodeMCU), four Digital LDR modules, and a Web Dashboard for live monitoring and manual override control.

## 1. System Architecture

The system operates in two distinct modes:

*   **Auto-Tracking Mode:** Uses four digital sensors to detect light orientation and move servos to the brightest point.
*   **Manual Mode:** Allows the user to take control via a web browser and move the horizontal and vertical axes using sliders.

## 2. Required Components

To build this tracking system, you will need the following hardware components:
*   **1x ESP8266 (NodeMCU):** The primary microcontroller.
*   **4x Digital LDR Modules:** Light Dependent Resistor modules with digital outputs for detecting light intensity.
*   **2x SG90 Micro Servo Motors:** Provide movement for the horizontal (pan) and vertical (tilt) axes.
*   **1x 1000µF Capacitor:** Recommended to smooth voltage spikes and provide stability.
*   **Jumper wires and Breadboard:** For making the connections.

## 3. Component Connections & Pin Configuration

### Input: LDR Modules (Digital)
Since the ESP8266 has only one analog pin, we utilize the D0 (Digital Output) pins of four blue LDR modules. These modules have onboard potentiometers to calibrate light sensitivity.

| Module Position | Pin Label | ESP8266 GPIO | Purpose |
| :--- | :--- | :--- | :--- |
| Top Left | D1 | 5 | Vertical/Horizontal logic |
| Top Right | D2 | 4 | Vertical/Horizontal logic |
| Bottom Left | D5 | 14 | Vertical/Horizontal logic |
| Bottom Right | D6 | 12 | Vertical/Horizontal logic |

### Output: Servo Motors
Two SG90 Micro Servos provide the movement.
*   **Horizontal Axis:** Rotates the base (0° to 180°).
*   **Vertical Axis:** Tilts the panel (20° to 150°).

| Servo Axis | Pin Label | ESP8266 GPIO | Wire Color |
| :--- | :--- | :--- | :--- |
| Horizontal | D7 | 13 | Orange (Signal) |
| Vertical | D8 | 15 | Orange (Signal) |

## 4. Circuit Schematic Notes

*   **Voltage Levels:** LDR modules are powered by the 3.3V pin to ensure the digital signals do not exceed the ESP8266's logic limits.
*   **Servo Power:** Servos are connected to the Vin pin (5V) for higher torque.
*   **Common Ground:** All GND pins from the servos, sensors, and ESP8266 must be tied together.
*   **Stability:** A 1000µF capacitor is recommended across the servo power lines to prevent WiFi dropouts during motor movement.

## 5. Software Features

### A. The Web Dashboard
The ESP8266 hosts a local web server. When you navigate to the device's IP address, you see:
*   **Live Angle Gauges:** Real-time feedback of the current servo positions.
*   **Manual Sliders:** Override the auto-tracking to position the panel manually.
*   **Mode Toggle:** Switch between "Auto" and "Manual" control.

### B. Code Logic Breakdown

#### 1. The Sensor Configuration
The code defines four pins as inputs. Because it uses `digitalRead`, it is likely using LDR (Light Dependent Resistor) modules with digital outputs. These modules usually have a small potentiometer (screw) that allows you to set a brightness threshold.
*   **LOW:** Light detected (above the threshold).
*   **HIGH:** Darkness (below the threshold).

#### 2. The "Darkness" & Home Logic
One of the smartest features in this code is the Automatic Return.
*   **The Check:** If all four sensors are HIGH (Dark), a timer (`darkStartTime`) starts.
*   **The Timer:** If it stays dark for more than 3 seconds (3000ms), the tracker assumes the sun has set or it's nighttime.
*   **The Action:** It calls `smoothReturn()` to move the servos back to the "Home" position (90°, 45°), waiting for the sun to rise the next day.

#### 3. Movement Logic (The "Brain")
The code compares groups of sensors to decide which way to tilt.

| If these see light...  | And these don't...      | Action                           |
| :---                   | :---                    | :---                             |
| Top (TL or TR)         | Bottom (BL or BR)       | Tilt Up (Decreases `posV`)       |
| Bottom (BL or BR)      | Top (TL or TR)          | Tilt Down (Increases `posV`)     |
| Left (TL or BL)        | Right (TR or BR)        | Turn Left (Decreases `posH`)     |
| Right (TR or BR)       | Left (TL or BL)         | Turn Right (Increases `posH`)    |

**Crucial Observation:** In the "Vertical" logic, `posV -= 2` is used for the top sensors. Depending on how your servo is mounted, this might move the tracker down instead of up. You may need to swap the `+` and `-` symbols during physical testing.

#### 4. Smooth Return Function
Instead of snapping the servos back to 90° instantly—which can be jerky and draw too much current—the `smoothReturn()` function uses a while loop to move the servos 1 degree at a time every 30 milliseconds until they reach the home coordinates.

#### Potential Issues to Watch For
*   **Sensitivity Jitter:** Because this uses `digitalRead`, the tracker will only move when the light hits a very specific threshold. It won't "search" for the brightest spot; it just tries to keep all sensors "ON."
*   **Pin Labels:** The comments mention D1, D2, etc. This suggests you are using an ESP8266 (NodeMCU/Wemos) rather than a standard Arduino Uno. Make sure your wiring matches the GPIO numbers (e.g., `PIN_TL` 5 is actually GPIO 5).
*   **Power:** Two servos moving at once can cause a "brownout" if powered only by the Arduino's 5V pin. It's usually better to power the servos from an external 5V-6V source (sharing a common Ground).

## 6. Calibration Procedure

*   **Hardware:** Use a screwdriver on the blue potentiometer of each LDR module. Adjust until the onboard LED turns ON in direct light and OFF in shadow.
*   **Software:** Set your WiFi SSID and Password in the code.
*   **Deployment:** Monitor the Serial Monitor (115200 baud) to find the local IP address for the dashboard.

## 7. Maintenance & Safety

*   **Mechanical Limits:** Do not set servo angles beyond the physical capability of your frame (20° and 150° are safe defaults for vertical).
*   **Weatherproofing:** If used outdoors, the ESP8266 and sensors must be protected from moisture.

## 8. Source Code

Get the full `esp8266_tracker.ino` code directly: [View full ESP8266 Source Code](./esp8266_tracker.ino)

<details>
<summary><b>Click to expand and view the full ESP8266 C++ source code</b></summary>
<br>

```cpp
#include <ESP8266WiFi.h>
#include <Servo.h>
#include <FirebaseESP8266.h>

// ==========================================
// 1. CONFIGURATION
// ==========================================
#define WIFI_SSID "YOUR_WIFI_HOSTNAME_HERE"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD_HERE"

#define FIREBASE_HOST "YOUR_FIREBASE_PROJECT_ID.firebaseio.com"
#define FIREBASE_AUTH "YOUR_FIREBASE_AUTH_KEY_HERE"

// ==========================================
// 2. HARDWARE PINS (Based on Documentation)
// ==========================================
// Digital LDR Modules (Input)
const int PIN_LDR_TL = D1; // Top Left (GPIO 5)
const int PIN_LDR_TR = D2; // Top Right (GPIO 4)
const int PIN_LDR_BL = D5; // Bottom Left (GPIO 14)
const int PIN_LDR_BR = D6; // Bottom Right (GPIO 12)

// Servo Motors (Output)
const int servoH_pin = D7; // Horizontal Base (GPIO 13)
const int servoV_pin = D8; // Vertical Tilt (GPIO 15)

// Note: Most standard blue digital LDR modules output LOW when light is detected. 
// Change to HIGH if your specific modules operate inversely.
#define LIGHT_DETECTED LOW

// ==========================================
// 3. SYSTEM VARIABLES
// ==========================================
Servo horizontalServo;
Servo verticalServo;

// Current Angles
int hAngle = 90;
int vAngle = 45;

// Cloud Sync Variables
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

// Timers
unsigned long lastPublishTime = 0;
unsigned long lastFetchTime = 0;  // Stop Firebase from freezing the servos
const int PUBLISH_INTERVAL = 500; // Cloud update every 0.5 seconds
const int FETCH_INTERVAL = 500;   // Cloud read every 0.5 seconds
unsigned long darkStartTime = 0;  // For 3-second return-to-home logic

// Control States
bool manualMode = false;
int targetH = 90;
int targetV = 45;

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(100);

  // Configure LDR Input Pins
  pinMode(PIN_LDR_TL, INPUT);
  pinMode(PIN_LDR_TR, INPUT);
  pinMode(PIN_LDR_BL, INPUT);
  pinMode(PIN_LDR_BR, INPUT);

  // Attach & Initialize Servos to Home Position
  horizontalServo.attach(servoH_pin);
  verticalServo.attach(servoV_pin);
  horizontalServo.write(hAngle);
  verticalServo.write(vAngle);

  // Connect to WiFi
  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: ");
  Serial.println(WiFi.localIP());

  // Setup Firebase Auth & Connection
  config.api_key = FIREBASE_AUTH;
  config.database_url = FIREBASE_HOST;
  
  // Set to Test Mode since we are using open Database rules 
  // without needing to enable Anonymous User Sign-Up in the console
  config.signer.test_mode = true;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Publish immediate online status to cloud
  Firebase.setBool(firebaseData, "/.info/connected", true);
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  
  // ----------------------------------------------------
  // A. FETCH CLOUD CONTROLS FROM DASHBOARD (Every 1000ms)
  // ----------------------------------------------------
  if (millis() - lastFetchTime >= 1000) { // Check cloud every 1 second
    lastFetchTime = millis();
    
    // 1. Only grab the true/false state first.
    if (Firebase.getBool(firebaseData, "/solar_tracker/controls/manualMode")) {
      manualMode = firebaseData.boolData();
    }
    
    // 2. Only grab the target angles IF manual control is active!
    // This stops massive HTTP lag from freezing the servos in Auto mode.
    if (manualMode) {
      if (Firebase.getInt(firebaseData, "/solar_tracker/controls/targetH")) {
        targetH = firebaseData.intData();
      }
      if (Firebase.getInt(firebaseData, "/solar_tracker/controls/targetV")) {
        targetV = firebaseData.intData();
      }
    }
  }

  // ----------------------------------------------------
  // B. MANUAL MODE OVERRIDE LOGIC
  // ----------------------------------------------------
  if (manualMode) {
    // Smoothly step towards target slider angle instead of instantly jumping
    if (hAngle < targetH) hAngle++;
    else if (hAngle > targetH) hAngle--;

    if (vAngle < targetV) vAngle++;
    else if (vAngle > targetV) vAngle--;

    horizontalServo.write(hAngle);
    verticalServo.write(vAngle);
    delay(15); 
  } 
  // ----------------------------------------------------
  // C. SMART AUTO-TRACKING LOGIC
  // ----------------------------------------------------
  else {
    // 1. Read the 4 Digital Sensors (Inverted reading based on user's exact specification)
    bool tl = !digitalRead(PIN_LDR_TL);
    bool tr = !digitalRead(PIN_LDR_TR);
    bool bl = !digitalRead(PIN_LDR_BL);
    bool br = !digitalRead(PIN_LDR_BR);
    
    // SMOOTH RETURN LOGIC: Pitch black -> Return Home (90, 45) after 3 secs
    if (!tl && !tr && !bl && !br) {
      if (darkStartTime == 0) {
        darkStartTime = millis(); 
      } 
      else if (millis() - darkStartTime > 3000) {
        // Return smoothly towards home
        if (hAngle < 90) hAngle++; else if (hAngle > 90) hAngle--;
        if (vAngle < 45) vAngle++; else if (vAngle > 45) vAngle--;
        
        horizontalServo.write(hAngle); 
        verticalServo.write(vAngle);
        delay(15);
      }
    } 
    // TRACKING LOGIC
    else {
      darkStartTime = 0; // Reset dark timer since we see light
      
      // Stop logic: if all 4 see light, do nothing to prevent jitter
      if (tl && tr && bl && br) {
        // Perfect alignment, keep angle
      } else {
        // Vertical logic
        if ((tl || tr) && !(bl || br)) { 
          if(vAngle < 150) vAngle += 2; 
        }
        else if (!(tl || tr) && (bl || br)) { 
          if(vAngle > 20) vAngle -= 2; 
        }

        // Horizontal logic
        if ((tl || bl) && !(tr || br)) { 
          if(hAngle > 0) hAngle -= 2; 
        }
        else if (!(tl || bl) && (tr || br)) { 
          if(hAngle < 180) hAngle += 2; 
        }

        horizontalServo.write(hAngle); 
        verticalServo.write(vAngle);
        delay(15);
      }
    }
  }

  // ----------------------------------------------------
  // D. PUBLISH TELEMETRY BACK TO DASHBOARD
  // ----------------------------------------------------
  if (millis() - lastPublishTime >= PUBLISH_INTERVAL) {
    lastPublishTime = millis();
    
    FirebaseJson json;
    
    // Live Angles
    json.set("h", hAngle);
    json.set("v", vAngle);
    
    // Digital Sensors (Translated to 0 or 1024 for Web Dashboard math)
    json.set("ldrTL", digitalRead(PIN_LDR_TL) == LIGHT_DETECTED ? 1024 : 0);
    json.set("ldrTR", digitalRead(PIN_LDR_TR) == LIGHT_DETECTED ? 1024 : 0);
    json.set("ldrBL", digitalRead(PIN_LDR_BL) == LIGHT_DETECTED ? 1024 : 0);
    json.set("ldrBR", digitalRead(PIN_LDR_BR) == LIGHT_DETECTED ? 1024 : 0);
    
    // Operating Status
    String statusStr = manualMode ? "MANUAL OVERRIDE" : "AUTO TRACKING";
    json.set("status", statusStr);

    Firebase.updateNode(firebaseData, "/solar_tracker/data", json);
  }
}
```
</details>

## 9. Website Structure & Data Flow

This project features a seamless real-time data flow bridging the physical ESP8266 hardware device, a cloud-based Firebase Realtime Database, and a frontend Web Dashboard. Here is a detailed breakdown of the infrastructure:

### A. Project Structure

```text
dual_axis_solar_monitor/
├── .env                  # (Hidden) Stores sensitive Firebase & Weather API keys
├── config.js             # Handles Firebase initialization and config variables
├── esp8266_tracker.ino   # C++ firmware flashed to the ESP8266 NodeMCU
├── index.html            # Main markup structure of the web dashboard
├── script.js             # Frontend logic (Chart rendering, Firebase syncing, Control events)
├── style.css             # Glassmorphism styling and responsive layout UI
└── README.md             # Project documentation (You are here)
```

### B. End-to-End Data Flow (Telemetry & Automation)

The system relies on Firebase as the central "Source of Truth" to synchronize state between the tracker and the dashboard in under 500 milliseconds.

#### 1. Telemetry Generation (ESP8266 -> Database)
- **Sensor Aggregation:** The ESP8266 continuously reads ambient light signals from four connected digital LDR modules (`PIN_LDR_TL`, `TR`, `BL`, `BR`).
- **Logic Processing:** In `AUTO TRACKING` mode, the C++ logic dynamically updates current servo angles (`hAngle` and `vAngle`) to face the brightest light source.
- **Data Publishing:** Every 500ms, the ESP8266 packages these live angles, current LDR signal states, and internal operating status into a JSON payload. 
- **Cloud Sync:** Uses `Firebase.updateNode()` to push the telemetry JSON to the path `/solar_tracker/data` on your Firebase Realtime Database. 

#### 2. Telemetry Visualization (Database -> Web Dashboard)
- **Active Listening:** The frontend `script.js` uses the Firebase `onValue()` function to attach a live listener to the `/solar_tracker/data` database node.
- **Dynamic Rendering:** Instantly updates the UI when the database changes:
  - Rotates the horizontal SVG Compass graphic.
  - Fills the vertical elevation gauge.
  - Updates the binary "SP Signals" connectivity indicators.
  - Feeds the historical telemetry into the embedded Chart.js graph.

#### 3. Manual Override Controls (Dashboard -> Database)
- **Control Input:** A user toggles the primary "Manual Override" switch on the dashboard and interacts with the Horizontal/Vertical slider UI.
- **Cloud Update:** Any adjustment prompts the dashboard to write the new target trajectory directly to the `/solar_tracker/controls` node on Firebase (e.g., `{"manualMode": true, "targetH": 120, "targetV": 90}`).

#### 4. Physical Actuation (Database -> ESP8266)
- **Control Polling:** The ESP8266 pings the `/solar_tracker/controls` database path every 1000ms.
- **Validation:** It reads whether `manualMode` is activated.
- **Motor Control:** If `true`, the ESP8266 temporarily ignores the hardware light sensors and uses a smooth-step loop (`if (hAngle < targetH) hAngle++;`) into the target angles supplied from the web slider.
- **Feedback Loop:** As the physical servos move, the ESP8266 pushes its new mechanical angles back to `/solar_tracker/data` (Step 1), instantly updating the user's dashboard (Step 2) to confirm successful manual execution.

---

## 🚀 Vercel Deployment

To deploy this dashboard to Vercel and keep your API keys secure:

1. **Environment Variables**: In your Vercel Project Settings, add the following variables:
   - `WEATHER_API_KEY`: Your OpenWeatherMap key.
   - `CITY`: e.g., `Vijayawada`.
   - `FIREBASE_API_KEY`: Your Firebase `apiKey`.
   - `FIREBASE_AUTH_DOMAIN`: Your Firebase `authDomain`.
   - `FIREBASE_PROJECT_ID`: Your Firebase `projectId`.
   - `FIREBASE_DATABASE_URL`: Your Firebase `databaseURL`.
   - `FIREBASE_STORAGE_BUCKET`: Your Firebase `storageBucket`.
   - `FIREBASE_MESSAGING_SENDER_ID`: Your Firebase `messagingSenderId`.
   - `FIREBASE_APP_ID`: Your Firebase `appId`.
   - `FIREBASE_MEASUREMENT_ID`: Your Firebase `measurementId`.

2. **Automatic Build**: The project includes a `generate-config.sh` script and a `package.json`. Vercel will automatically run `npm run build` to generate your `config.js` securely using your environment variables.
