#!/bin/bash
# Elegant solution to start Expo with tunnel mode
# Unsets problematic ANDROID_HOME to prevent WSL path conflicts

unset ANDROID_HOME
cd "$(dirname "$0")"
npx expo start --tunnel --port 8083
