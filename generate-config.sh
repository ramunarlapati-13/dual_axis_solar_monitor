#!/bin/bash

# generate-config.sh
# This script creates the config.js file and prepares the public folder for Vercel.

# 1. Create the public directory
mkdir -p public

# 2. Copy static files into public
cp index.html style.css script.js public/
cp -r images public/

# 3. Generate config.js inside the public folder
cat <<EOF > public/config.js
const CONFIG = {
    WEATHER_API_KEY: '${WEATHER_API_KEY}',
    CITY: '${CITY:-Vijayawada}',
    FIREBASE_CONFIG: {
        apiKey: "${FIREBASE_API_KEY}",
        authDomain: "${FIREBASE_AUTH_DOMAIN}",
        projectId: "${FIREBASE_PROJECT_ID}",
        databaseURL: "${FIREBASE_DATABASE_URL}",
        storageBucket: "${FIREBASE_STORAGE_BUCKET}",
        messagingSenderId: "${FIREBASE_MESSAGING_SENDER_ID}",
        appId: "${FIREBASE_APP_ID}",
        measurementId: "${FIREBASE_MEASUREMENT_ID}"
    }
};
EOF

echo "Build complete: public folder prepared with config.js"
