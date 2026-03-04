# Dual-Axis Solar Monitoring System

A responsive web dashboard designed to track and monitor a dual-axis solar tracking system connected to an ESP32. This interface visualizes real-time telemetry data including tracking history plots, manual override capabilities, sun position rendering, servo azimuth/elevation status, and SP (solar panel) signals tracking.

## Recent Features Added

We've recently implemented significant enhancements to the solar tracker:

* **Dynamic ESP32 Connection:** Added a live configuration panel to the dashboard header, allowing you to manually input the target IP address and connect without modifying code. (Requests are made to the `/data` endpoint).
* **Continuous Online Verification:** Now features a consistent "Online Check" status timestamp under Daily Statistics to confirm active data polling.
* **SP Signals Section:** Updated the dashboard to accurately reflect "SP Signals" tracking directly.
* **Live Weather Integration:** Integrated real-time local weather observations for Vijayawada, as well as a 5-interval hourly forecast using the OpenWeatherMap API, styled naturally to fit the dashboard's glassy neon aesthetic.
* **API Error Handling:** If the Weather API key is disabled, inactive, or unauthorized (401 error), the dashboard gracefully displays an error notification instead of failing silently.
* **Live Estimated Power Generation:** Dynamically calculates an estimated current power output (using a baseline 100W maximum capacity) based on current local solar radiation angles and the exact percentage of live cloud cover pulled from the weather API. The math formula output is explicitly presented in the dashboard under the estimate.
* **Responsive Layout Design:** Updated CSS media queries to properly wrap and stack the weather and power estimation cards on smaller mobile and tablet displays without breaking the grid structure.

## Getting Started

Because this application relies exclusively on frontend code (HTML, CSS, JavaScript) communicating with your local ESP32 network device, there are no intense backend frameworks to build.

1.  **Environment Variables:** All secure credentials (API keys, WiFi passwords) are abstracted into a `.env` file. This `.env` file is kept out of version control.
2.  Copy your specific API keys from your `.env` file and paste them into `config.js` (for Web Dashboard) and `esp8266_tracker.ino` (for ESP8266). Ensure `config.js` stays in your `.gitignore`.
3.  Serve the current folder using a simple HTTP server (e.g., `npx serve .`).
4.  Open your browser to the localhost address provided by the utility.
5.  Enter the target ESP32's IP address (e.g., `192.168.137.23`) directly at the top of the dashboard and press `CONNECT`.

## Data Architecture & Calculations

The frontend dashboard serves as a visualizing GUI for the ESP32 hardware and dynamically computes specific analytics:

### Live Angle Rendering
- The system aggressively polls the ESP32 `/data` endpoint every 1000ms.
- **Payload Expectation:** The dashboard anticipates receiving a JSON payload containing exactly these values from the ESP32 representing the physical angles: `{"hAngle": 90, "vAngle": 45}`.
- **Azimuth Visualization (Horizontal Angle):** The `hAngle` received is bound between 0° and 180°. It dynamically rotates the SVG Compass graphic at the center of the screen via CSS transforms (`rotate(angle - 90)deg`), effectively serving as a real-time tracking compass relative to a fixed zero point.
- **Elevation Visualization (Vertical Angle):** The `vAngle` runs linearly from 0° (flat horizontally) to 180°. The corresponding vertical gauge explicitly masks a CSS conic-gradient loop to show the immediate tilt.

### Estimated Power Generation Math
The Estimated Power Generation card uses a hybrid system combining the baseline hardware knowledge with live external weather variables from OpenWeatherMap to calculate instantaneous panel output:
1.  **Baseline Capacity:** Currently fixed at a theoretical maximum `100W` base capacity for a typical small residential/hobby tracking panel setup.
2.  **Solar Angle Coefficient (Time Factor):** Calculates a simple diurnal solar radiation curve between 6:00 AM and 6:00 PM using a trigonometric sine wave (`Math.sin(((timeNow - 6) / 12) * Math.PI)`). Early morning and late evening generate minimal wattage (nearing 0%), while precisely 12:00 PM generates optimal zenith light (100% capacity). Outside 6 AM - 6 PM, it evaluates to 0. 
3.  **Atmospheric Clarity (Cloud Factor):** Ingests the live cloud cover percentage directly pulled from the OpenWeather JSON (`clouds.all`) and inverts it into a clarity score (`1 - (cloudCover / 100)`). A completely cloudy sky significantly throttles power, while clear skies maximize efficiency.
4.  **Final Output Equation:** `Output (W) = 100W × Solar Angle Coefficient × Atmospheric Clarity Score`. This breakdown is displayed live alongside the generated wattage value inside the dashboard's interface.

## Technologies Used
- HTML5 / CSS3 (Grid, Flexbox, Custom Glassmorphism Theme)
- Vanilla DOM JavaScript
- [Chart.js](https://www.chartjs.org/) for history rendering
- OpenWeatherMap API

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

### B. Smart Logic Functions
*   **Stop Logic:** If all 4 sensors are active (bright light), the servos stop moving to prevent jitter.
*   **Smooth Return:** If it stays dark for more than 3 seconds, the system moves the servos slowly back to a "Home" position (90°, 45°).
*   **Hysteresis/Step Control:** The movement uses a 2-degree step size with a 15ms delay to match the snappy response seen in high-end DIY trackers.

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
