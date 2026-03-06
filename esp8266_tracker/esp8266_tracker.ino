#include <ESP8266WiFi.h>
#include <Servo.h>
#include <FirebaseESP8266.h>


// ==========================================
// 1. CONFIGURATION
// ==========================================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#define FIREBASE_HOST "YOUR_FIREBASE_HOST"
#define FIREBASE_AUTH "YOUR_FIREBASE_AUTH"

// ==========================================
// 2. HARDWARE PINS (From User's Perfect Code)
// ==========================================
#define PIN_TL 5  // D1
#define PIN_TR 4  // D2
#define PIN_BL 14 // D5
#define PIN_BR 12 // D6

// Voltage Monitor Pin
const int sensorPin = A0; 

Servo horizontal; 
Servo vertical;

// ==========================================
// 3. SYSTEM VARIABLES
// ==========================================
// Current Positions
int posH = 90; 
int posV = 90;

// Home Positions
const int homeH = 90;
const int homeV = 90;

unsigned long darkStartTime = 0;
bool isHome = false;

// Cloud Sync Variables
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;



// Timers
unsigned long lastPublishTime = 0;
unsigned long lastFetchTime = 0;  // Stop Firebase from freezing the servos
const int PUBLISH_INTERVAL = 500; // Cloud update every 0.5 seconds

// Control States
bool manualMode = false;
int targetH = 90;
int targetV = 45;

// ==========================================
// FUNCTION: Smooth Return home
// ==========================================
void smoothReturn() {
  while (posH != homeH || posV != homeV) {
    if (posH < homeH) posH++;
    else if (posH > homeH) posH--;

    if (posV < homeV) posV++;
    else if (posV > homeV) posV--;

    horizontal.write(posH);
    vertical.write(posV);
    delay(30); // Controls the "Smoothness" of the return
  }
}

// ==========================================
// SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(100);

  // Configure LDR Input Pins
  pinMode(PIN_TL, INPUT);
  pinMode(PIN_TR, INPUT);
  pinMode(PIN_BL, INPUT);
  pinMode(PIN_BR, INPUT);

  // Attach & Initialize Servos to Home Position
  horizontal.attach(13); // D7
  vertical.attach(15);   // D8
  
  horizontal.write(posH);
  vertical.write(posV);

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
  if (millis() - lastFetchTime >= 1000) { 
    lastFetchTime = millis();
    
    // 1. Only grab the true/false state first.
    if (Firebase.getBool(firebaseData, "/solar_tracker/controls/manualMode")) {
      manualMode = firebaseData.boolData();
    }
    
    // 2. Only grab target angles IF manual control is active!
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
    if (posH < targetH) posH++;
    else if (posH > targetH) posH--;

    if (posV < targetV) posV++;
    else if (posV > targetV) posV--;

    horizontal.write(posH);
    vertical.write(posV);
    delay(15); 
  } 
  // ----------------------------------------------------
  // C. SMART AUTO-TRACKING LOGIC (Perfect Code)
  // ----------------------------------------------------
  else {
    // Read sensors (On these modules: LOW = Light, HIGH = Dark/0)
    bool tl = digitalRead(PIN_TL) == LOW;
    bool tr = digitalRead(PIN_TR) == LOW;
    bool bl = digitalRead(PIN_BL) == LOW;
    bool br = digitalRead(PIN_BR) == LOW;

    // --- DARKNESS / HOME CHECK ---
    if (!tl && !tr && !bl && !br) {
      if (darkStartTime == 0) darkStartTime = millis();
      
      // If it has been dark for 3 seconds and we aren't home yet
      if (millis() - darkStartTime > 3000 && !isHome) {
        smoothReturn();
        isHome = true;
      }
      // Note: We skip tracking movements here, but we don't 'return;' 
      // so we can still publish telemetry to Firebase.
    } 
    else {
      // Light detected - reset the timer
      darkStartTime = 0;
      isHome = false;

      // --- STOP LOGIC (When perfectly centered) ---
      // We skip movement if perfectly centered, but don't return to allow telemetry
      if (!(tl && tr && bl && br)) { 
        
        // --- FAST MOVEMENT LOGIC ---
        // Vertical
        if ((tl || tr) && !(bl || br)) {
          if (posV < 150) posV -= 2; 
        } else if (!(tl || tr) && (bl || br)) {
          if (posV > 20) posV += 2;  
        }

        // Horizontal — require BOTH sensors on one side to agree (deadband)
        // This prevents one slightly-brighter LDR from sweeping servo to 180°
        bool leftSeen  = (tl && bl);  // BOTH left sensors must see light
        bool rightSeen = (tr && br);  // BOTH right sensors must see light
        if (leftSeen && !rightSeen) {
          if (posH > 0) posH -= 2;
        } else if (rightSeen && !leftSeen) {
          if (posH < 180) posH += 2;
        }
        // If only ONE right sensor fires, hold position — avoids 180° creep

        vertical.write(posV);
        horizontal.write(posH);
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
    json.set("h", posH);
    json.set("v", posV);
    
    // Voltage Monitoring with Noise Filtering
    int rawValue = analogRead(sensorPin);
    
    // SOFTWARE NOISE FLOOR: 
    // If the panel is removed, the A0 pin "floats" and picks up noise.
    // We ignore any signals below a threshold (approx 0.05V) to show a clean 0V.
    if (rawValue < 10) rawValue = 0; 
    
    float voltage = rawValue * (5.0 / 1023.0);
    json.set("voltage", voltage);
    
    // Digital Sensors (Translated to 0 or 1024 for Web Dashboard math)
    json.set("ldrTL", digitalRead(PIN_TL) == LOW ? 1024 : 0);
    json.set("ldrTR", digitalRead(PIN_TR) == LOW ? 1024 : 0);
    json.set("ldrBL", digitalRead(PIN_BL) == LOW ? 1024 : 0);
    json.set("ldrBR", digitalRead(PIN_BR) == LOW ? 1024 : 0);
    
    // Operating Status
    String statusStr = manualMode ? "MANUAL OVERRIDE" : "AUTO TRACKING";
    json.set("status", statusStr);

    Firebase.updateNode(firebaseData, "/solar_tracker/data", json);

    // Print to Serial Monitor
    Serial.print("IP: ");
    Serial.print(WiFi.localIP());
    Serial.print(" | Status: ");
    Serial.print(statusStr);
    Serial.print(" | Voltage: ");
    Serial.print(voltage, 2);
    Serial.println(" V");
  }
}
