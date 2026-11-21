#!/usr/bin/env bash
# Pasang APK, buka app, tunggu, dan simpan bukti. Tidak gagal awal supaya logcat sentiasa disimpan.
set -u
PKG=com.rickyazwan.kiragaji
APK=android/app/build/outputs/apk/release/app-release.apk

adb install -r "$APK" > smoke-install.txt 2>&1
adb logcat -c
adb shell am start -W -n "$PKG/.MainActivity" > smoke-start.txt 2>&1
sleep 25
adb exec-out screencap -p > smoke-skrin-1.png
# cuba tekan tab Resit dan Zakat (koordinat kasar) untuk melihat crash selepas navigasi
adb shell input tap 700 330 ; sleep 4
adb exec-out screencap -p > smoke-skrin-2.png

PID=$(adb shell pidof "$PKG" | tr -d '\r')
if [ -n "$PID" ]; then echo "HIDUP pid=$PID" > smoke-keputusan.txt; else echo "MATI (crash atau ditutup)" > smoke-keputusan.txt; fi
adb logcat -d -v time > smoke-logcat-penuh.txt
adb logcat -d -v time -b crash > smoke-logcat-crash.txt
grep -E "FATAL|AndroidRuntime|ReactNativeJS|ReactNative|Error|Exception" smoke-logcat-penuh.txt | head -400 > smoke-logcat-ringkas.txt
cat smoke-keputusan.txt
cat smoke-logcat-crash.txt | head -80
exit 0
