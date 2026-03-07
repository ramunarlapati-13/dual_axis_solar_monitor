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
// 2. HARDWARE PINS
// ==========================================
#define PIN_TL 5  // D1
#define PIN_TR 4  // D2
#define PIN_BL 14 // D5
#define PIN_BR 12 // D6

const int sensorPin = A0; 

Servo horizontal; 
Servo vertical;

// ==========================================
// 3. SYSTEM VARIABLES
// ==========================================
int posH = 90; 
int posV = 90;

const int homeH = 90;
const int homeV = 90;

unsigned long darkStartTime = 0;
bool isHome = false;

FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastPublishTime = 0;
unsigned long lastFetchTime = 0;
const int PUBLISH_INTERVAL = 500;

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
    delay(30);
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(PIN_TL, INPUT);
  pinMode(PIN_TR, INPUT);
  pinMode(PIN_BL, INPUT);
  pinMode(PIN_BR, INPUT);

  horizontal.attach(13); // D7
  vertical.attach(15);   // D8
  
  horizontal.write(posH);
  vertical.write(posV);

  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  config.api_key = FIREBASE_AUTH;
  config.database_url = FIREBASE_HOST;
  config.signer.test_mode = true;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Firebase.setBool(firebaseData, "/.info/connected", true);
}

void loop() {
  if (millis() - lastFetchTime >= 1000) { 
    lastFetchTime = millis();
    if (Firebase.getBool(firebaseData, "/solar_tracker/controls/manualMode")) {
      manualMode = firebaseData.boolData();
    }
    if (manualMode) {
      if (Firebase.getInt(firebaseData, "/solar_tracker/controls/targetH")) {
        targetH = firebaseData.intData();
      }
      if (Firebase.getInt(firebaseData, "/solar_tracker/controls/targetV")) {
        targetV = firebaseData.intData();
      }
    }
  }

  if (manualMode) {
    if (posH < targetH) posH++;
    else if (posH > targetH) posH--;

    if (posV < targetV) posV++;
    else if (posV > targetV) posV--;

    horizontal.write(posH);
    vertical.write(posV);
    delay(15); 
  } 
  else {
    bool tl = digitalRead(PIN_TL) == LOW;
    bool tr = digitalRead(PIN_TR) == LOW;
    bool bl = digitalRead(PIN_BL) == LOW;
    bool br = digitalRead(PIN_BR) == LOW;

    if (!tl && !tr && !bl && !br) {
      if (darkStartTime == 0) darkStartTime = millis();
      if (millis() - darkStartTime > 3000 && !isHome) {
        smoothReturn();
        isHome = true;
      }
    } 
    else {
      darkStartTime = 0;
      isHome = false;
      if (!(tl && tr && bl && br)) { 
        if ((tl || tr) && !(bl || br)) {
          if (posV < 150) posV -= 2; 
        } else if (!(tl || tr) && (bl || br)) {
          if (posV > 20) posV += 2;  
        }

        bool leftSeen  = (tl && bl);
        bool rightSeen = (tr && br);
        if (leftSeen && !rightSeen) {
          if (posH > 0) posH -= 2;
        } else if (rightSeen && !leftSeen) {
          if (posH < 180) posH += 2;
        }

        vertical.write(posV);
        horizontal.write(posH);
        delay(15); 
      }
    }
  }

  if (millis() - lastPublishTime >= PUBLISH_INTERVAL) {
    lastPublishTime = millis();
    FirebaseJson json;
    json.set("h", posH);
    json.set("v", posV);
    
    int rawValue = analogRead(sensorPin);
    if (rawValue < 10) rawValue = 0; 
    float voltage = rawValue * (5.0 / 1023.0);
    json.set("voltage", voltage);
    
    json.set("ldrTL", digitalRead(PIN_TL) == LOW ? 1024 : 0);
    json.set("ldrTR", digitalRead(PIN_TR) == LOW ? 1024 : 0);
    json.set("ldrBL", digitalRead(PIN_BL) == LOW ? 1024 : 0);
    json.set("ldrBR", digitalRead(PIN_BR) == LOW ? 1024 : 0);
    
    String statusStr = manualMode ? "MANUAL OVERRIDE" : "AUTO TRACKING";
    json.set("status", statusStr);

    Firebase.updateNode(firebaseData, "/solar_tracker/data", json);
  }
}
