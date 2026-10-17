#!/bin/bash
# Injects NSMicrophoneUsageDescription into the bundled app (voice capture).
# Tauri regenerates Info.plist on every build; run this after `tauri build`.
set -euo pipefail
APP="${1:-apps/desktop/src-tauri/target/release/bundle/macos/AppraiseMe.app}"
PLIST="$APP/Contents/Info.plist"
if [ ! -f "$PLIST" ]; then
  echo "Info.plist not found at $PLIST" >&2
  exit 1
fi
/usr/libexec/PlistBuddy -c "Add :NSMicrophoneUsageDescription string 'AppraiseMe uses the microphone only for voice quick-capture. Audio goes to your connected AI provider for transcription and is never stored.'" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :NSMicrophoneUsageDescription 'AppraiseMe uses the microphone only for voice quick-capture. Audio goes to your connected AI provider for transcription and is never stored.'" "$PLIST"
echo "patched $PLIST"
