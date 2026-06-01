import fs from 'fs';
import path from 'path';

describe('Story 6.4 service worker setup', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const swPath = path.join(projectRoot, 'public', 'sw.js');
  const htmlPath = path.join(projectRoot, 'app', '+html.tsx');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  it('adds a build:web script for static web export', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['build:web']).toBe('expo export -p web');
  });

  it('registers /sw.js in +html.tsx using non-fatal warning on failure', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    expect(html).toContain("navigator.serviceWorker.register('/sw.js')");
    expect(html).toContain("console.log('SW registered:', registration.scope);");
    expect(html).toContain("console.warn('SW registration failed:', err);");
  });

  it('defines the service worker with cache name, bypass patterns and strategies', () => {
    const sw = fs.readFileSync(swPath, 'utf8');

    expect(sw).toContain("const CACHE_NAME = 'valuesnap-v1';");
    expect(sw).toContain('/\\/api\\//');
    expect(sw).toContain('/supabase\\.co/');
    expect(sw).toContain('/onrender\\.com/');
    expect(sw).toContain('/openai\\.com/');
    expect(sw).toContain('if (parsedUrl.search)');
    expect(sw).toContain('request.mode === \'navigate\'');
    expect(sw).toContain('var cacheKey = toNavigationCacheKey(request.url);');
    expect(sw).toContain('c.put(cacheKey, copy);');
    expect(sw).not.toContain('c.put(request, copy);');
    expect(sw).toContain('cache.match(\'/\')');
    expect(sw).toContain('response.ok && response.status < 400');
  });
});
