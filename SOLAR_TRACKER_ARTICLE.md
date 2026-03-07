# Maximizing Energy: The Dual-Axis Solar Tracker with Real-Time Cloud Monitoring

![Solar Tracker Hero](images/solar-tracker-hero.png)

## Introduction
The search for sustainable energy efficiency has led to significant innovations in how we capture sunlight. While static solar panels are common, they lose a massive percentage of potential energy as the sun moves across the sky. This project presents a **Dual-Axis Solar Tracker** powered by the **ESP8266**, which follows the sun in real-time and streams live data to a global dashboard via **Firebase**.

## The Hardware: Precision Movement
At the core of the system is an ESP8266 microcontroller managing a 4-point LDR (Light Dependent Resistor) sensor array.

- **Dual-Axis Mobility**: Using two servo motors (Horizontal and Vertical), the system can rotate nearly 180 degrees in multiple directions.
- **Sensor Array**: Four LDRs (Top-Left, Top-Right, Bottom-Left, Bottom-Right) provide a high-resolution "vision" of where the light is strongest.
- **Voltage Monitoring**: A dedicated sensor on the solar panel monitors energy generation in real-time, allowing for efficiency calculation.

## Wiring & Connection Diagram
To build this project, follow the wiring schematic below. The ESP8266 acts as the brain, reading digital signals from the LDR modules and controlling the PWM signals for the servos.

![Connection Diagram](images/solar-tracker-diagram.png)

<p style="color: #ff3333; font-weight: bold;">⚠️ IMPORTANT: Use a separate 5V power supply for the servo motors. This is very important to prevent system resets and ensure stable operation!</p>

### Pin Mapping Table
| Component | ESP8266 Pin | NodeMCU Label | Function |
| :--- | :--- | :--- | :--- |
| **LDR Top Left** | GPIO 5 | D1 | Light Sensor Input |
| **LDR Top Right** | GPIO 4 | D2 | Light Sensor Input |
| **LDR Bottom Left** | GPIO 14 | D5 | Light Sensor Input |
| **LDR Bottom Right** | GPIO 12 | D6 | Light Sensor Input |
| **Horizontal Servo** | GPIO 13 | D7 | Movement Control |
| **Vertical Servo** | GPIO 15 | D8 | Movement Control |
| **Voltage Sensor** | A0 | A0 | Analog Voltage Read |
| **Power (VCC)** | 3.3V / 5V | 3V / Vin | 5V recommended for Servos |
| **Ground** | GND | G | Common Ground |

## The "Smart" Tracking Logic
Unlike simple trackers, this system uses a **Differential Centering Algorithm** to ensure the panel is always perpendicular to the sun's rays.

### Servo Movement Algorithm
The algorithm works by comparing the state of the four LDR sensors to determine the necessary corrective movement:

| Logic Phase | Condition | Resulting Action |
| :--- | :--- | :--- |
| **Vertical Axis** | (Top Left OR Top Right) detect light while Bottoms are dark | **Tilt UP**: Increment Vertical Servo |
| **Vertical Axis** | (Bottom Left OR Bottom Right) detect light while Tops are dark | **Tilt DOWN**: Decrement Vertical Servo |
| **Horizontal Axis** | (Top Left OR Bottom Left) detect light while Rights are dark | **Turn LEFT**: Decrement Horizontal Servo |
| **Horizontal Axis** | (Top Right OR Bottom Right) detect light while Lefts are dark | **Turn RIGHT**: Increment Horizontal Servo |

### Key Optimization Features:
1. **Deadzone Management**: To prevent jittery motor movement and unnecessary "hunting," the system only triggers movement when a clear imbalance is detected.
2. **Smooth Step-Motion**: To prevent current spikes from the servos (which could reset the ESP8266), the motors move in small, 2-degree increments with a 15ms buffer between steps.
3. **Auto-Home Function**: When darkness is detected for more than 3 continuous seconds (sunset), the system performs a "Smooth Return" to its 90/45 home position, positioning it perfectly for the next morning's sunrise.

## Full-Stack Connectivity with Firebase
What sets this project apart is its **IoT integration**. By leveraging **Firebase Realtime Database**, the tracker becomes accessible from anywhere in the world.

- **Live Telemetry**: Every 500ms, the tracker sends its current angles, voltage, and individual sensor readings to the cloud.
- **The Dashboard**: A sleek, dark-themed Web Dashboard visualizes this data using Gauges and Real-time Charts.
- **Manual Override (Global Control)**: From the dashboard, a user can toggle "Manual Mode" and control the solar panel's direction using sliders on their phone or laptop.

## Cloud Dashboard Interface
The web interface is designed with a premium, futuristic dark-mode aesthetic, providing a comprehensive view of the tracker's health and performance.

![Dashboard Top](images/solar-tracker-ui-1.png)

![Dashboard Bottom](images/solar-tracker-ui-2.png)

### Key Features of the UI:
- **Real-Time Gauges**: Visual indicators for horizontal (azimuth) and vertical (elevation) angles.
- **Power Analytics**: Live calculation of estimated power output in Watts based on current voltage and panel specifications.
- **Historical Data Charts**: Dynamic line charts powered by Chart.js that track motor response and voltage fluctuations over time.
- **Remote Control Panel**: Interactive sliders and toggles for seamless switching between Auto and Manual tracking modes.
- **Live Status System**: A heartbeat monitor that confirms whether the ESP8266 is actively synced with the Firebase cloud.

## Technical Stack
- **Firmware**: C++ (Arduino/ESP8266)
- **Database**: Firebase Realtime DB
- **Frontend**: HTML5, Vanilla CSS3, JavaScript (ES6+)
- **Communication**: WebSockets & REST API

## Conclusion
This Dual-Axis Solar Tracker demonstrates how low-cost microcontrollers and cloud technologies can significantly improve renewable energy infrastructure. By keeping the panel perfectly perpendicular to the sun and providing instant diagnostic data to the user, we bridge the gap between simple hardware and intelligent energy management.

---

*Written by Antigravity*
*Project Repository: [GitHub](https://github.com/ramunarlapati-13/dual_axis_solar_monitor)*
*[Read full documentation](https://dual-axis-solar-monitor.vercel.app/)*
