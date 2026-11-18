import { handleFetch, exportStatsSnapshot, importStatsSnapshot } from './server.js';

const STATE_CACHE_URL = 'https://nightknight-state.internal/stats-v2.json';
let edgeCacheHits = 0;
let edgeCacheMisses = 0;
let stateHydrated = false;
let lastStatePersistAt = 0;

function withEdgeHeaders(request, colo, cfCountry) {
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-cf-colo', colo);
  reqHeaders.set('x-cf-edge-hits', String(edgeCacheHits));
  reqHeaders.set('x-cf-edge-misses', String(edgeCacheMisses));
  if (cfCountry && !reqHeaders.has('cf-ipcountry')) {
    reqHeaders.set('cf-ipcountry', cfCountry);
  }
  const init = { method: request.method, headers: reqHeaders };
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    init.body = request.body;
  }
  return new Request(request.url, init);
}

function persistStateToEdge(edgeCache, ctx) {
  if (!edgeCache) return;
  try {
    lastStatePersistAt = Date.now();
    const snap = {
      ...exportStatsSnapshot(),
      edgeCacheHits,
      edgeCacheMisses
    };
    const stateRes = new Response(JSON.stringify(snap), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=2592000'
      }
    });
    const putPromise = edgeCache.put(STATE_CACHE_URL, stateRes);
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(putPromise);
    }
  } catch (_) {}
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const colo = (request.cf && request.cf.colo) ? String(request.cf.colo) : 'EDGE';
    const cfCountry = (request.cf && request.cf.country) ? String(request.cf.country) : '';

    // 1. Serve static PNG assets from Cloudflare Workers Assets binding (free, unlimited)
    const assetMatch = url.pathname.match(/(?:^|\/)(icon|logo|background|bg)\.png$/);
    if (request.method === 'GET' && assetMatch && env && env.ASSETS) {
      const targetFile = (assetMatch[1] === 'icon' || assetMatch[1] === 'logo') ? '/icon.png' : '/background.png';
      const assetUrl = new URL(targetFile, url.origin);
      const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
      if (assetRes && assetRes.ok) {
        const out = new Response(assetRes.body, assetRes);
        out.headers.set('Access-Control-Allow-Origin', '*');
        out.headers.set('Cache-Control', 'public, max-age=86400');
        return out;
      }
    }

    const edgeCache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;

    // 2. Hydrate telemetry snapshot into fresh Worker isolates from persistent edge cache
    if (!stateHydrated && edgeCache) {
      stateHydrated = true;
      try {
        const savedRes = await edgeCache.match(STATE_CACHE_URL);
        if (savedRes && savedRes.ok) {
          const savedData = await savedRes.json();
          importStatsSnapshot(savedData);
          edgeCacheHits = Math.max(edgeCacheHits, Number(savedData?.edgeCacheHits) || 0);
          edgeCacheMisses = Math.max(edgeCacheMisses, Number(savedData?.edgeCacheMisses) || 0);
        }
      } catch (_) {}
    }

    // 3. Check Cloudflare Edge Cache (caches.default) for cacheable Stremio JSON endpoints
    const isCacheableGet = request.method === 'GET' && /\/(manifest\.json|catalog\/|meta\/|subtitles\/|stream\/)/.test(url.pathname);
    const cacheKey = isCacheableGet && edgeCache ? new Request(url.toString(), { method: 'GET' }) : null;

    if (cacheKey) {
      try {
        const cached = await edgeCache.match(cacheKey);
        if (cached) {
          edgeCacheHits++;
          if (Date.now() - lastStatePersistAt > 5000) {
            persistStateToEdge(edgeCache, ctx);
          }
          const hitRes = new Response(cached.body, cached);
          hitRes.headers.set('X-NightKnight-Cache', 'HIT');
          return hitRes;
        }
      } catch (_) {}
      edgeCacheMisses++;
    }

    // 4. Dispatch to universal NightKnight Cinema handler with edge metadata headers
    const response = await handleFetch(withEdgeHeaders(request, colo, cfCountry));

    // 5. Populate Cloudflare Edge Cache on 200 public JSON responses & persist stats snapshot
    if (cacheKey && response && response.status === 200) {
      const cc = response.headers.get('cache-control') || '';
      if (cc.includes('public')) {
        try {
          const putPromise = edgeCache.put(cacheKey, response.clone());
          if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(putPromise);
          } else {
            await putPromise;
          }
        } catch (_) {}
      }
    }

    if (edgeCache && url.pathname !== '/api/stats' && (Date.now() - lastStatePersistAt > 3000 || url.pathname.includes('/stream/') || url.pathname.endsWith('/manifest.json'))) {
      persistStateToEdge(edgeCache, ctx);
    }

    return response;
  }
};
