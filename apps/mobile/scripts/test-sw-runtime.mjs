#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

import { chromium } from '@playwright/test';

const DIST_DIR = 'dist-sw-runtime-check';
const PORT = 4310;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const exportEnv = {
    ...process.env,
    EXPO_NO_DOTENV: '1',
    EXPO_PUBLIC_USE_MOCK: 'false',
    EXPO_PUBLIC_SUPABASE_URL: 'https://guard.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'guard-anon-key',
    EXPO_PUBLIC_API_URL: 'http://localhost:8000',
  };

  await rm(DIST_DIR, { recursive: true, force: true });
  await run('npx', ['expo', 'export', '-p', 'web', '--output-dir', DIST_DIR], {
    env: exportEnv,
  });

  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', DIST_DIR], {
    stdio: 'ignore',
  });

  try {
    await waitForServer(`${BASE_URL}/`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    await page.goto(`${BASE_URL}/auth/update-password?code=SECRET_REVIEW_TOKEN`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(1200);

    const cacheMeta = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false };
      }

      const reg = await navigator.serviceWorker.ready;
      const cache = await caches.open('valuesnap-v1');
      const keys = await cache.keys();
      const urls = keys.map((req) => req.url);
      const hasRoot = urls.some((url) => {
        const parsed = new URL(url);
        return parsed.pathname === '/' || parsed.pathname === '/index.html';
      });
      const hasTokenizedUrl = urls.some((url) => url.includes('code='));

      return {
        supported: true,
        scope: reg.scope,
        hasRoot,
        hasTokenizedUrl,
      };
    });

    if (!cacheMeta.supported) {
      throw new Error('Service workers are not supported in runtime check');
    }
    if (cacheMeta.scope !== `${BASE_URL}/`) {
      throw new Error(`Unexpected SW scope: ${cacheMeta.scope}`);
    }
    if (!cacheMeta.hasRoot) {
      throw new Error('Root document was not cached');
    }
    if (cacheMeta.hasTokenizedUrl) {
      throw new Error('Sensitive tokenized URL was cached');
    }

    await context.setOffline(true);

    await page.goto(`${BASE_URL}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
    await page.goto(`${BASE_URL}/history`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });

    await browser.close();
    console.log('SW runtime check passed');
  } finally {
    server.kill('SIGTERM');
    await rm(DIST_DIR, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
