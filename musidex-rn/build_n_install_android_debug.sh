#!/bin/bash
set -e

export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH

(cd android && ./gradlew assembleDebug)
ADB=$ANDROID_HOME/platform-tools/adb
$ADB install -r android/app/build/outputs/apk/debug/app-debug.apk
$ADB reverse tcp:8081 tcp:8081
echo "Installed on device"
