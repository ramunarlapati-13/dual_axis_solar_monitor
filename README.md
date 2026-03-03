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

## 2. Wiring & Pin Configuration

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

## 3. Circuit Schematic Notes

*   **Voltage Levels:** LDR modules are powered by the 3.3V pin to ensure the digital signals do not exceed the ESP8266's logic limits.
*   **Servo Power:** Servos are connected to the Vin pin (5V) for higher torque.
*   **Common Ground:** All GND pins from the servos, sensors, and ESP8266 must be tied together.
*   **Stability:** A 1000µF capacitor is recommended across the servo power lines to prevent WiFi dropouts during motor movement.

## 4. Software Features

### A. The Web Dashboard
The ESP8266 hosts a local web server. When you navigate to the device's IP address, you see:
*   **Live Angle Gauges:** Real-time feedback of the current servo positions.
*   **Manual Sliders:** Override the auto-tracking to position the panel manually.
*   **Mode Toggle:** Switch between "Auto" and "Manual" control.

### B. Smart Logic Functions
*   **Stop Logic:** If all 4 sensors are active (bright light), the servos stop moving to prevent jitter.
*   **Smooth Return:** If it stays dark for more than 3 seconds, the system moves the servos slowly back to a "Home" position (90°, 45°).
*   **Hysteresis/Step Control:** The movement uses a 2-degree step size with a 15ms delay to match the snappy response seen in high-end DIY trackers.

## 5. Calibration Procedure

*   **Hardware:** Use a screwdriver on the blue potentiometer of each LDR module. Adjust until the onboard LED turns ON in direct light and OFF in shadow.
*   **Software:** Set your WiFi SSID and Password in the code.
*   **Deployment:** Monitor the Serial Monitor (115200 baud) to find the local IP address for the dashboard.

## 6. Maintenance & Safety

*   **Mechanical Limits:** Do not set servo angles beyond the physical capability of your frame (20° and 150° are safe defaults for vertical).
*   **Weatherproofing:** If used outdoors, the ESP8266 and sensors must be protected from moisture.
