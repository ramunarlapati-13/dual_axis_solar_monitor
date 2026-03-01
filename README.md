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

1.  Serve the current folder using a simple HTTP server (e.g., `npx serve .`).
2.  Open your browser to the localhost address provided by the utility.
3.  Enter the target ESP32's IP address (e.g., `192.168.137.23`) directly at the top of the dashboard and press `CONNECT`.

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
