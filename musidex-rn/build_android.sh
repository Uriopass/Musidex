echo "Don't forget to change versionCode and versionName in android/app/build.gradle"
export NODE_OPTIONS=--openssl-legacy-provider
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
rm -rf ./android/app/src/main/res/drawable-*
rm -rf ./android/app/src/main/res/raw
(cd android && ./gradlew bundleRelease)
echo "built bundle in android/app/build/outputs/bundle/release"
