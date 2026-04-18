'use strict';
const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'expo-ngrok-v3.cjs');
const targetPath = path.join(__dirname, '..', 'node_modules', '@expo', 'ngrok', 'index.js');

if (!fs.existsSync(sourcePath)) {
  console.error('Missing source patch file:', sourcePath);
  process.exit(1);
}

if (!fs.existsSync(targetPath)) {
  console.warn('Skipping @expo/ngrok patch because target file does not exist:', targetPath);
  process.exit(0);
}

const source = fs.readFileSync(sourcePath, 'utf8');
const current = fs.readFileSync(targetPath, 'utf8');

if (current === source) {
  console.log('expo ngrok patch already applied');
  process.exit(0);
}

fs.writeFileSync(targetPath, source);
console.log('applied expo ngrok v3 patch');
