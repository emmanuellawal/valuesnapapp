const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const source = path.join(__dirname, '../assets/images/icon.png');
const publicDir = path.join(__dirname, '../public');
const assetsDir = path.join(__dirname, '../assets/images');
const public192 = path.join(publicDir, 'icon-192.png');
const public512 = path.join(publicDir, 'icon-512.png');
const asset192 = path.join(assetsDir, 'icon-192.png');
const asset512 = path.join(assetsDir, 'icon-512.png');

function convertImage(size, outPath) {
  const resizeArg = `${size}x${size}`;

  try {
    // ImageMagick v7 style: magick input -resize 192x192 output
    execFileSync('magick', [source, '-resize', resizeArg, outPath], { stdio: 'inherit' });
    return;
  } catch {
    // Fallback for environments with legacy "convert" command.
    execFileSync('convert', [source, '-resize', resizeArg, outPath], { stdio: 'inherit' });
  }
}

function run() {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing icon source: ${source}`);
  }

  fs.mkdirSync(publicDir, { recursive: true });

  convertImage(192, public192);
  convertImage(512, public512);

  fs.copyFileSync(public192, asset192);
  fs.copyFileSync(public512, asset512);

  console.log(`Generated ${public192}`);
  console.log(`Generated ${public512}`);
  console.log(`Generated ${asset192}`);
  console.log(`Generated ${asset512}`);
}

try {
  run();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.error(
    'Icon generation requires ImageMagick (`magick` or `convert`) to be installed on your machine.'
  );
  process.exit(1);
}
