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
