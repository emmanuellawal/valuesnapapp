import fs from 'node:fs';
import path from 'node:path';

const outputDir = process.argv[2];

if (!outputDir) {
  console.error('Expected output directory argument.');
  process.exit(1);
}

const forbiddenMarkers = [
  '__VALUESNAP_E2E_AUTH__',
  '__VALUESNAP_E2E_USE_MOCK__',
  '__VALUESNAP_E2E_FORCE_REAL_API__',
  '__VALUESNAP_AUTH_SNAPSHOT__',
  'valuesnap:e2e-auth',
  // Demo mode must not ship to real production builds (only allowed via demo:export script)
  '"EXPO_PUBLIC_DEMO","true"',
  "'EXPO_PUBLIC_DEMO','true'",
];

function collectJsFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectJsFiles(fullPath);
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      return [fullPath];
    }

    return [];
  });
}

if (!fs.existsSync(outputDir)) {
  console.error(`Output directory does not exist: ${outputDir}`);
  process.exit(1);
}

const jsFiles = collectJsFiles(outputDir);
const violations = [];

for (const filePath of jsFiles) {
  const contents = fs.readFileSync(filePath, 'utf8');
  for (const marker of forbiddenMarkers) {
    if (contents.includes(marker)) {
      violations.push({ filePath, marker });
    }
  }
}

if (violations.length > 0) {
  console.error('Forbidden browser test harness markers found in production bundle:');
  for (const violation of violations) {
    console.error(`- ${violation.marker} in ${violation.filePath}`);
  }
  process.exit(1);
}

console.log(`Production bundle guard passed. Scanned ${jsFiles.length} JS files.`);