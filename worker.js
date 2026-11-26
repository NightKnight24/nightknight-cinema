import { handleFetch, exportStatsSnapshot, importStatsSnapshot } from './server.js';

const STATE_CACHE_URL = 'https://nightknight-state.internal/stats-v2.json';
let edgeCacheHits = 0;
let edgeCacheMisses = 0;
let stateHydrated = false;
let lastStatePersistAt = 0;

function safeAtob(str) {
  try {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  } catch (_) {
    return '';
  }
}

function decodeEdgeConfig(configSegment) {
  if (!configSegment) return {};
  if (configSegment.startsWith('realdebrid=')) {
    return { realDebrid: configSegment.slice('realdebrid='.length).trim() };
  }
  try {
    const decoded = JSON.parse(safeAtob(configSegment));
    return (decoded && typeof decoded === 'object') ? decoded : {};
  } catch (_) {
    return {};
  }
}

// Canonicalize cache keys across all users to maximize Edge Cache hit rate and avoid Cloudflare limits
function getCanonicalCacheUrl(requestUrl) {
  const url = new URL(requestUrl);
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  let configSegment = '';
  let pathSegments = segments;
  const first = segments[0];
  if (!['catalog', 'meta', 'stream', 'subtitles', 'manifest.json', 'icon.png', 'logo.png', 'background.png', 'bg.png', 'configure', 'api', 'config', 'info', 'gradio_api', 'startup-events', '_vercel'].includes(first)) {
    configSegment = first;
    pathSegments = segments.slice(1);
  }

  const endpoint = pathSegments[0];
  if (!endpoint) return null;
  const cfg = decodeEdgeConfig(configSegment);

  // 0. Dynamic Signs SRT Extractor route
  if (endpoint === 'api' && pathSegments[1] === 'sub-signs' && pathSegments[2]) {
    return `https://nightknight-cache.internal/v2/api/sub-signs/${pathSegments[2]}`;
  }

  // 1. Meta: 100% universal across all users worldwide
  if (endpoint === 'meta' && pathSegments.length >= 3) {
    const type = pathSegments[1];
    const id = pathSegments.slice(2).join('/');
    return `https://nightknight-cache.internal/meta/${type}/${id}`;
  }

  // 2. Catalogs: Shared global catalog cache (region partitioned for live TV only)
  if (endpoint === 'catalog' && pathSegments.length >= 3) {
    const type = pathSegments[1];
    const catId = pathSegments[2];
    const extra = pathSegments.slice(3).join('/');
    if (catId === 'regional_live_tv') {
      const region = cfg.region ? String(cfg.region).toUpperCase() : 'GB';
      return `https://nightknight-cache.internal/catalog/${type}/${catId}/${region}/${extra}`;
    }
    return `https://nightknight-cache.internal/catalog/${type}/${catId}/${extra}`;
  }

  // 3. Subtitles: Partitioned by language preference and subtitle track mode
  if (endpoint === 'subtitles' && pathSegments.length >= 3) {
    const type = pathSegments[1];
    const id = pathSegments.slice(2).join('/');
    const prefLang = cfg.prefLang ? String(cfg.prefLang).toLowerCase() : 'en';
    const subMode = cfg.subMode ? String(cfg.subMode).toLowerCase() : 'all';
    return `https://nightknight-cache.internal/v2/subtitles/${type}/${id}/${prefLang}/${subMode}`;
  }

  // 4. Manifest: Partitioned by Real-Debrid flag and region
  if (endpoint === 'manifest.json') {
    const hasRd = cfg.realDebrid ? 'rd' : 'free';
    const region = cfg.region ? String(cfg.region).toUpperCase() : 'GB';
    return `https://nightknight-cache.internal/manifest/${hasRd}/${region}.json`;
  }

  // 5. Streams: Free P2P streams shared by preference profile; Real-Debrid streams token-isolated
  if (endpoint === 'stream' && pathSegments.length >= 3) {
    const type = pathSegments[1];
    const id = pathSegments.slice(2).join('/');
    let rdKey = 'free';
    const rawTok = String(cfg.realDebrid || cfg.rdToken || cfg.debridToken || '').trim();
    if (rawTok) {
      rdKey = `rd_${rawTok.slice(0, 8)}_${rawTok.slice(-8)}`;
    }
    const region = cfg.region ? String(cfg.region).toUpperCase() : 'GB';
    const prefLang = cfg.prefLang ? String(cfg.prefLang).toLowerCase() : 'en';
    const dubPref = cfg.dubPref ? String(cfg.dubPref).toLowerCase() : 'dub_or_orig';
    const maxQuality = cfg.maxQuality ? String(cfg.maxQuality).toLowerCase() : 'any';
    const hideRisk = cfg.hideRisk ? '1' : '0';
    const subMode = cfg.subMode ? String(cfg.subMode).toLowerCase() : 'all';
    const upTag = cfg.upstream ? encodeURIComponent(String(cfg.upstream).slice(0, 48)) : 'def';
    return `https://nightknight-cache.internal/v7/stream/${type}/${id}/${rdKey}/${region}/${prefLang}/${dubPref}/${maxQuality}/${hideRisk}/${subMode}/${upTag}`;
  }

  return url.toString();
}

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
        out.headers.set('Cache-Control', 'public, max-age=604800, immutable');
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

    // 3. Check Cloudflare Edge Cache (caches.default) using canonicalized multi-user cache keys
    const isCacheableGet = request.method === 'GET' && /\/(manifest\.json|catalog\/|meta\/|subtitles\/|stream\/|api\/sub-signs\/)/.test(url.pathname);
    const canonicalCacheUrl = isCacheableGet ? getCanonicalCacheUrl(request.url) : null;
    const cacheKey = canonicalCacheUrl && edgeCache ? new Request(canonicalCacheUrl, { method: 'GET' }) : null;

    if (cacheKey) {
      try {
        const cached = await edgeCache.match(cacheKey);
        if (cached) {
          edgeCacheHits++;
          if (Date.now() - lastStatePersistAt > 15000) {
            persistStateToEdge(edgeCache, ctx);
          }
          const hitRes = new Response(cached.body, cached);
          hitRes.headers.set('X-NightKnight-Cache', 'HIT');
          hitRes.headers.set('Access-Control-Allow-Origin', '*');
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

    if (edgeCache && url.pathname !== '/api/stats' && (Date.now() - lastStatePersistAt > 8000 || url.pathname.includes('/stream/') || url.pathname.endsWith('/manifest.json'))) {
      persistStateToEdge(edgeCache, ctx);
    }

    return response;
  }
};
