'use strict';

const CACHE_NAME = 'valuesnap-v1';

/**
 * URL patterns that must never be cached.
 * API calls, auth tokens, and external service responses stay on the network.
 */
const BYPASS_PATTERNS = [
  /\/api\//, // Backend API endpoints
  /supabase\.co/, // Supabase auth + storage
  /onrender\.com/, // Render.com backend
  /openai\.com/, // OpenAI (belt-and-suspenders)
];

function shouldBypass(url) {
  return BYPASS_PATTERNS.some(function (pattern) {
    return pattern.test(url);
  });
}

function toNavigationCacheKey(url) {
  try {
    var parsed = new URL(url);
    return parsed.pathname || '/';
  } catch (e) {
    return '/';
  }
}

// Precache root on install so offline navigation fallback works immediately on first visit.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.add('/');
      })
      .then(function () {
        return self.skipWaiting();
      }),
  );
});

// Delete stale caches and claim all open clients.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE_NAME;
            })
            .map(function (key) {
              return caches.delete(key);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Only handle GET requests.
  if (request.method !== 'GET') {
    return;
  }

  var url = request.url;

  // Never intercept bypass patterns (API, auth, external services).
  if (shouldBypass(url)) {
    return;
  }

  // Only handle same-origin requests.
  var parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return;
  }
  if (parsedUrl.origin !== self.location.origin) {
    return;
  }

  // Do not cache query-bearing URLs to avoid persisting auth tokens in cache keys.
  if (parsedUrl.search) {
    return;
  }

  // Navigation (HTML) requests: network-first.
  // Expo static export uses content-hashed JS/CSS referenced from HTML.
  // Serving stale HTML after a redeploy would reference deleted asset hashes.
  if (request.mode === 'navigate') {
    var cacheKey = toNavigationCacheKey(request.url);

    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (c) {
              c.put(cacheKey, copy);
            });
          }
          return response;
        })
        .catch(function () {
          // Offline: serve cached version of this route, or fall back to cached root.
          return caches.open(CACHE_NAME).then(function (cache) {
            return cache.match(cacheKey).then(function (cached) {
              return cached || cache.match('/');
            });
          });
        }),
    );
    return;
  }

  // Hashed static assets (JS, CSS, images, fonts): cache-first.
  // Content hash guarantees the cached file is always correct.
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request).then(function (cached) {
        if (cached) {
          return cached;
        }

        return fetch(request).then(function (response) {
          // Only cache successful non-opaque responses.
          if (response.ok && response.status < 400) {
            cache.put(request, response.clone());
          }
          return response;
        });
      });
    }),
  );
});
