#!/usr/bin/env bash
# Capture the current Android screen for review.
#
# Usage: capture.sh <out-dir> <name>
#
# Writes to <out-dir>:
#   <name>.png        screenshot
#   <name>.xml        raw UI tree (uiautomator)
#   <name>.json       parsed UI tree: one entry per node, with sizes in dp
#   <name>-log.txt    React Native warnings and errors since the last capture
#
# Prints DEVICE, DENSITY, SCREENSHOT_MD5 and the file paths.
# Exit codes: 0 done, 1 no usable device, 2 capture failed.

set -uo pipefail

out=${1:?usage: capture.sh <out-dir> <name>}
name=${2:?usage: capture.sh <out-dir> <name>}
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"

# First device in the "device" state. Skips "offline" and "unauthorized" entries,
# such as a non-Android program listening on an emulator port.
# ANDROID_SERIAL, if set, picks the device.
serial=${ANDROID_SERIAL:-$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')}
if [ -z "$serial" ]; then
  echo "NO_DEVICE"
  adb devices
  exit 1
fi
# MSYS_NO_PATHCONV stops Git Bash on Windows from rewriting device paths like /sdcard.
a() { MSYS_NO_PATHCONV=1 adb -s "$serial" "$@"; }

density=$(a shell wm density | grep -oE '[0-9]+' | tail -1)

a exec-out screencap -p > "$out/$name.png" || exit 2
a shell uiautomator dump /sdcard/ui-review.xml >/dev/null || exit 2
a exec-out cat /sdcard/ui-review.xml > "$out/$name.xml" || exit 2
a shell rm -f /sdcard/ui-review.xml
node "$here/parse-ui.js" "$out/$name.xml" "$density" > "$out/$name.json" || exit 2

a logcat -d -s ReactNativeJS:W ReactNative:W AndroidRuntime:E > "$out/$name-log.txt"
a logcat -c

foreground=$(a shell dumpsys activity activities | grep -m1 -E 'topResumedActivity|ResumedActivity' | grep -oE '[a-z][a-z0-9_.]+/' | head -1 | tr -d '/')

echo "DEVICE $serial"
echo "DENSITY $density"
echo "FOREGROUND $foreground"
echo "SCREENSHOT_MD5 $(md5sum "$out/$name.png" | cut -d' ' -f1)"
echo "PNG $out/$name.png"
echo "TREE $out/$name.json"
echo "LOG $out/$name-log.txt"
