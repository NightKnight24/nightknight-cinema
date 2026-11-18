import { handleFetch } from './server.js';

let edgeCacheHits = 0;
let edgeCacheMisses = 0;

function withEdgeHeaders(request, colo, cfCountry, edgeOnly = false) {
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-cf-colo', colo);
  reqHeaders.set('x-cf-edge-hits', String(edgeCacheHits));
  reqHeaders.set('x-cf-edge-misses', String(edgeCacheMisses));
  if (cfCountry && !reqHeaders.has('cf-ipcountry')) {
    reqHeaders.set('cf-ipcountry', cfCountry);
  }
  if (edgeOnly) {
    reqHeaders.set('x-cf-edge-only', '1');
  }
  const init = { method: request.method, headers: reqHeaders };
  if (!edgeOnly && request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    init.body = request.body;
  }
  return new Request(request.url, init);
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

    // 2. Check Cloudflare Edge Cache (caches.default) for cacheable Stremio JSON endpoints
    const isCacheableGet = request.method === 'GET' && /\/(manifest\.json|catalog\/|meta\/|subtitles\/|stream\/)/.test(url.pathname);
    const edgeCache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
    const cacheKey = isCacheableGet && edgeCache ? new Request(url.toString(), { method: 'GET' }) : null;

    if (cacheKey) {
      try {
        const cached = await edgeCache.match(cacheKey);
        if (cached) {
          edgeCacheHits++;
          const hitRes = new Response(cached.body, cached);
          hitRes.headers.set('X-NightKnight-Cache', 'HIT');
          return hitRes;
        }
      } catch (_) {}
      edgeCacheMisses++;
    }

    // 3. Dispatch to universal NightKnight Cinema handler with edge metadata headers
    const response = await handleFetch(withEdgeHeaders(request, colo, cfCountry, false));

    // 4. Populate Cloudflare Edge Cache on 200 public JSON responses
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

    return response;
  }
};
