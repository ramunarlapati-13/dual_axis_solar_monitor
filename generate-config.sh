#!/bin/bash

# generate-config.sh
# This script creates the config.js file using environment variables provided by Vercel.

cat <<EOF > config.js
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

echo "config.js has been generated successfully."
