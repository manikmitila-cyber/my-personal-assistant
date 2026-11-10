#!/usr/bin/env bash
# ব্যবহার: Android SDK (ANDROID_HOME) + JDK 17 + Node 20+ থাকা মেশিনে `bash build-apk.sh`
set -euo pipefail
cd "$(dirname "$0")"
npm install
npx expo install --fix
npx tsc --noEmit            # টাইপ ত্রুটি থাকলে এখানে থামবে; আগে ঠিক করুন
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease   # সাইনিং কী না থাকলে: ./gradlew assembleDebug
APK=$(ls app/build/outputs/apk/*/app-*.apk | head -1)
cp "$APK" ../MyPersonalAssistant.apk
unzip -l ../MyPersonalAssistant.apk | grep -q AndroidManifest.xml && echo "যাচাই ঠিক আছে: $(pwd)/../MyPersonalAssistant.apk"
