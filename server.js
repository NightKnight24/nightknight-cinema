// NightKnight Cinema — Intelligent Stremio Addon
// Created by NightKnight
// Powered by The Movie Database (TMDb), Cinemeta & Intelligent Stream Speed Ranking
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse as parseUrl } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.json');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '3157bd6dacbc3a653ae2e5a3b19beb20';
const PORT = process.env.PORT || 7000;
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

const ADDON_VERSION = '1.5.0';

// Load server-wide DEFAULTS (read-only). Per-user settings live in the install URL, never on the server.
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Error reading config.json:', e.message);
  }
  return {
    upstreamScraper: 'https://torrentio.strem.fun',
    filterHighBufferRisk: false,
    defaultRegion: 'GB'
  };
}

const APP_CONFIG = loadConfig();

// Regions supported for "where to watch" (BYOA) and streaming hub catalogs
const REGIONS = {
  GB: 'United Kingdom',
  US: 'United States',
  IE: 'Ireland',
  CA: 'Canada',
  AU: 'Australia'
};

// -------------------------------------------------------------
// PER-USER CONFIGURATION (Stremio standard: config encoded in the install URL)
// e.g. https://host/<base64url-json>/manifest.json
// Nothing is stored server-side, so one user's settings (or Debrid key) can never affect or leak to another.
// -------------------------------------------------------------
function normalizeUpstream(raw) {
  if (typeof raw !== 'string') return null;
  let u = raw.trim();
  if (!u) return null;
  if (u.startsWith('stremio://')) u = 'https://' + u.slice('stremio://'.length);
  u = u.replace(/\/manifest\.json$/i, '').replace(/\/+$/, '');
  return isSafeUpstream(u) ? u : null;
}

// Blocks SSRF: only public https hostnames (no IP literals, localhost or internal names)
function isSafeUpstream(u) {
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:') return false;
    if (x.username || x.password) return false;
    const h = x.hostname.toLowerCase();
    if (!h || !h.includes('.')) return false;
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
    if (/^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return false;
    if (u.length > 600) return false;
    return true;
  } catch (e) {
    return false;
  }
}

const DEFAULT_USER_CONFIG = {
  upstream: normalizeUpstream(APP_CONFIG.upstreamScraper) || 'https://torrentio.strem.fun',
  hideRisk: !!APP_CONFIG.filterHighBufferRisk,
  region: REGIONS[APP_CONFIG.defaultRegion] ? APP_CONFIG.defaultRegion : 'GB'
};

function decodeUserConfig(segment) {
  const cfg = { ...DEFAULT_USER_CONFIG };
  if (!segment) return cfg;
  try {
    const json = JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8'));
    if (json && typeof json === 'object') {
      const up = normalizeUpstream(json.upstream);
      if (up) cfg.upstream = up;
      if (typeof json.hideRisk === 'boolean') cfg.hideRisk = json.hideRisk;
      if (typeof json.region === 'string' && REGIONS[json.region.toUpperCase()]) cfg.region = json.region.toUpperCase();
    }
  } catch (e) {
    // Invalid config segment -> safe defaults
  }
  return cfg;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Last upstream scraper result (diagnostics only; never includes URLs/keys)
const UPSTREAM_HEALTH = { lastStatus: null, lastError: null, lastStreams: null, at: null };

// -------------------------------------------------------------
// ANONYMIZED ANALYTICS & INSTALL COUNTER (Zero-Knowledge / GDPR Compliant)
// Tracks installs & request volume using SHA-256 salted hashes.
// Zero raw IPs or personal info are ever logged or persisted.
// -------------------------------------------------------------
const STATS_PATH = path.join(__dirname, 'stats.json');
const STATS_SALT = crypto.randomBytes(16).toString('hex');

function loadStats() {
  try {
    if (fs.existsSync(STATS_PATH)) {
      const data = JSON.parse(fs.readFileSync(STATS_PATH, 'utf-8'));
      return {
        startedAt: data.startedAt || new Date().toISOString(),
        totalRequests: data.totalRequests || 0,
        manifestRequests: data.manifestRequests || 0,
        catalogRequests: data.catalogRequests || 0,
        metaRequests: data.metaRequests || 0,
        streamRequests: data.streamRequests || 0,
        youtubeSearches: data.youtubeSearches || 0,
        estimatedInstalls: data.estimatedInstalls || 0,
        uniqueClients: new Set(data.uniqueClientHashes || []),
        lastRequestAt: data.lastRequestAt || null
      };
    }
  } catch (e) {}
  return {
    startedAt: new Date().toISOString(),
    totalRequests: 0,
    manifestRequests: 0,
    catalogRequests: 0,
    metaRequests: 0,
    streamRequests: 0,
    youtubeSearches: 0,
    estimatedInstalls: 0,
    uniqueClients: new Set(),
    lastRequestAt: null
  };
}

const STATS = loadStats();
const SERVER_BOOT_TIME = Date.now();

let saveStatsTimer = null;
function persistStats() {
  if (saveStatsTimer) return;
  saveStatsTimer = setTimeout(() => {
    saveStatsTimer = null;
    try {
      const payload = {
        startedAt: STATS.startedAt,
        totalRequests: STATS.totalRequests,
        manifestRequests: STATS.manifestRequests,
        catalogRequests: STATS.catalogRequests,
        metaRequests: STATS.metaRequests,
        streamRequests: STATS.streamRequests,
        youtubeSearches: STATS.youtubeSearches,
        estimatedInstalls: Math.max(STATS.estimatedInstalls, STATS.uniqueClients.size),
        uniqueClientHashes: Array.from(STATS.uniqueClients).slice(-5000),
        lastRequestAt: STATS.lastRequestAt,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(STATS_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {}
  }, 3000);
}

function recordClient(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const hash = crypto.createHash('sha256').update(ip + ua + STATS_SALT).digest('hex').slice(0, 16);
  STATS.uniqueClients.add(hash);
  STATS.totalRequests++;
  STATS.lastRequestAt = new Date().toISOString();
  STATS.estimatedInstalls = Math.max(STATS.estimatedInstalls, STATS.uniqueClients.size);
}

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

// Simple in-memory cache with TTL
const cache = new Map();
function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
}
function setCache(key, value, ttlSeconds = 1800) {
  if (cache.size > 3000) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// Genre mappings for TMDb
const MOVIE_GENRES = {
  'Action': 28,
  'Adventure': 12,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family': 10751,
  'Fantasy': 14,
  'History': 36,
  'Horror': 27,
  'Music': 10402,
  'Mystery': 9648,
  'Romance': 10749,
  'Science Fiction': 878,
  'Thriller': 53,
  'War': 10752,
  'Western': 37
};

const TV_GENRES = {
  'Action & Adventure': 10759,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Family': 10751,
  'Kids': 10762,
  'Mystery': 9648,
  'News': 10763,
  'Reality-TV': 10764,
  'Sci-Fi & Fantasy': 10765,
  'Soap': 10766,
  'War & Politics': 10768,
  'Western': 37
};

function getManifest(baseUrl) {
  return {
    id: 'org.stremio.nightknight.cinema',
    version: ADDON_VERSION,
    name: 'NightKnight Cinema',
    description: 'Created by NightKnight. YouTube search & in-app playback, "where to watch" links for UK & global streaming services (BBC iPlayer, ITVX, Channel 4, Netflix, Disney+, Prime & more), franchises in release order, IMDb/TMDb ratings & awards, audio/video format tags and seeder-based stream ranking.',
    logo: `${baseUrl}/icon.png`,
    background: `${baseUrl}/background.png`,
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series', 'channel'],
    idPrefixes: ['tmdb:', 'tt', 'yt:'],
    behaviorHints: {
      configurable: true,
      configurationRequired: false
    },
    catalogs: [
      {
        type: 'movie',
        id: 'actor_genre_movies',
        name: 'Movies (NightKnight)',
        pageSize: 20,
        extra: [
          {
            name: 'genre',
            options: [
              'Popular',
              'Upcoming Releases',
              'Now In Theaters',
              'Top Rated',
              'Trending Today',
              'Trending This Week',
              // Streaming Hubs
              'Netflix',
              'Apple TV+',
              'Max (HBO)',
              'Disney+',
              'Amazon Prime',
              'Paramount+',
              // Franchises & Universes
              'Marvel (MCU)',
              'Star Wars Saga',
              'Harry Potter',
              'Lord of the Rings',
              'James Bond (007)',
              'Studio Ghibli',
              'Christopher Nolan Universe',
              'Quentin Tarantino Universe',
              // Decade Time-Machine
              '2020s Cinema',
              '2010s Hits',
              '2000s Nostalgia',
              '90s Golden Age',
              '80s Retro Classics',
              '70s Vintage Cinema',
              // Curated Deep Genres
              'Action',
              'Adventure',
              'Animation',
              'Anime',
              'Comedy',
              'Crime',
              'Cyberpunk',
              'Documentary',
              'Drama',
              'Family',
              'Fantasy',
              'Film-Noir',
              'History',
              'Horror',
              'Korean Cinema',
              'Martial Arts',
              'Music',
              'Mystery',
              'Romance',
              'Science Fiction',
              'Superhero',
              'Stand-Up Comedy',
              'Thriller',
              'War',
              'Western'
            ],
            isRequired: false
          },
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'series',
        id: 'actor_genre_series',
        name: 'Series (NightKnight)',
        pageSize: 20,
        extra: [
          {
            name: 'genre',
            options: [
              'Popular',
              'Airing Next 7 Days',
              'Airing Today',
              'Top Rated',
              'Trending Today',
              'Trending This Week',
              // Streaming Hubs
              'Netflix',
              'Apple TV+',
              'Max (HBO)',
              'Disney+',
              'Amazon Prime',
              'Paramount+',
              // TV Universes
              'Marvel (MCU)',
              'Star Wars Saga',
              // Decade Time-Machine
              '2020s TV',
              '2010s TV Hits',
              '2000s TV Classics',
              '90s Nostalgia TV',
              // Curated Deep Genres
              'Action & Adventure',
              'Animation',
              'Anime',
              'Comedy',
              'Crime',
              'Documentary',
              'Drama',
              'Family',
              'Kids',
              'K-Drama',
              'Mystery',
              'News',
              'Reality-TV',
              'Sci-Fi & Fantasy',
              'War & Politics',
              'Western'
            ],
            isRequired: false
          },
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'movie',
        id: 'streaming_hub_movies',
        name: 'Streaming Networks (Movies)',
        pageSize: 20,
        extra: [
          {
            name: 'genre',
            options: ['Netflix', 'Apple TV+', 'Max (HBO)', 'Disney+', 'Amazon Prime', 'Paramount+'],
            isRequired: false
          },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'series',
        id: 'streaming_hub_series',
        name: 'Streaming Networks (Series)',
        pageSize: 20,
        extra: [
          {
            name: 'genre',
            options: ['Netflix', 'Apple TV+', 'Max (HBO)', 'Disney+', 'Amazon Prime', 'Paramount+'],
            isRequired: false
          },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'movie',
        id: 'upcoming_movies',
        name: 'Upcoming Movie Releases (16:9)',
        pageSize: 20,
        posterShape: 'landscape',
        extra: [
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'series',
        id: 'on_the_air_series',
        name: 'Upcoming TV Shows (16:9)',
        pageSize: 20,
        posterShape: 'landscape',
        extra: [
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'series',
        id: 'calendar-videos',
        name: 'Calendar videos',
        extra: [
          {
            name: 'calendarVideosIds',
            isRequired: true,
            optionsLimit: 100
          }
        ]
      },
      {
        type: 'channel',
        id: 'youtube_videos',
        name: 'YouTube (NightKnight)',
        pageSize: 20,
        extra: [
          { name: 'search', isRequired: false },
          {
            name: 'genre',
            options: ['Trending', 'Music', 'Gaming', 'Tech', 'Podcasts', 'News'],
            isRequired: false
          },
          { name: 'skip', isRequired: false }
        ]
      }
    ]
  };
}

// Helper: fetch TMDb JSON
async function fetchTmdb(endpoint, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, v);
    }
  }

  const cacheKey = url.toString();
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) {
    throw new Error(`TMDb error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  setCache(cacheKey, data, 1800);
  return data;
}

// Convert TMDb movie/tv result to Stremio meta preview
function formatMetaPreview(item, type, isLandscape = false) {
  const isMovie = type === 'movie';
  const title = isMovie ? item.title : item.name;
  const date = isMovie ? item.release_date : item.first_air_date;
  const year = date ? date.slice(0, 4) : '';

  // For landscape format, prioritize high-res 16:9 backdrop
  const posterUrl = (isLandscape && item.backdrop_path)
    ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
    : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null);

  return {
    id: `tmdb:${item.id}`,
    name: title,
    type: type,
    poster: posterUrl,
    background: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
    description: item.overview || '',
    releaseInfo: year,
    released: date ? new Date(date).toISOString() : undefined
    // Note: no `imdbRating` here — TMDb list results only carry the TMDb score,
    // and Stremio displays this field with an IMDb logo. Real IMDb ratings are added in handleMeta.
  };
}

// YouTube Search & Video Scraper (Zero-Auth, DRM-Free & BYOA)
async function searchYouTube(query = 'Trending', skip = 0) {
  const cacheKey = `yt:query:${query}`;
  let videos = getCache(cacheKey);

  if (!videos) {
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-GB,en;q=0.9'
        },
        signal: AbortSignal.timeout(6000)
      });
      const html = await res.text();
      const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
        videos = [];

        for (const item of contents) {
          const vr = item.videoRenderer;
          if (vr && vr.videoId) {
            const title = vr.title?.runs?.[0]?.text || '';
            const channel = vr.ownerText?.runs?.[0]?.text || '';
            const thumbnail = vr.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
            const length = vr.lengthText?.simpleText || '';

            const videoMeta = {
              id: `yt:${vr.videoId}`,
              type: 'channel',
              name: title,
              poster: thumbnail,
              background: `https://i.ytimg.com/vi/${vr.videoId}/maxresdefault.jpg`,
              description: `Channel: ${channel} • Duration: ${length}\n\n▶️ Plays directly inside Stremio player (DRM-Free) or opens in YouTube app (BYOA).`,
              releaseInfo: length || channel,
              behaviorHints: {
                defaultVideoId: `yt:${vr.videoId}`
              }
            };
            videos.push(videoMeta);
            // Cache individual video meta for handleMeta
            setCache(`yt:meta:${vr.videoId}`, videoMeta, 86400);
          }
        }
        setCache(cacheKey, videos, 1800);
      }
    } catch (e) {
      console.error('YouTube search error:', e.message);
    }
  }

  if (!Array.isArray(videos)) return [];
  return videos.slice(skip, skip + 20);
}

// Known TMDb Watch Provider definitions (matched by exact provider_id for 100% accuracy)
const PROVIDER_METADATA = {
  38: { name: 'BBC iPlayer', tag: '🇬🇧 [BBC iPLAYER • FREE]', url: q => `https://www.bbc.co.uk/iplayer/search?q=${encodeURIComponent(q)}` },
  41: { name: 'ITVX', tag: '🇬🇧 [ITVX • FREE]', url: q => `https://www.itv.com/watch/search?q=${encodeURIComponent(q)}` },
  2300: { name: 'ITVX Premium', tag: '🇬🇧 [ITVX PREMIUM • BYOA]', url: q => `https://www.itv.com/watch/search?q=${encodeURIComponent(q)}` },
  103: { name: 'Channel 4', tag: '🇬🇧 [CHANNEL 4 • FREE]', url: () => `https://www.channel4.com/` },
  2311: { name: 'Channel 4 Plus', tag: '🇬🇧 [CHANNEL 4+ • BYOA]', url: () => `https://www.channel4.com/` },
  333: { name: 'My5', tag: '🇬🇧 [MY5 • FREE]', url: q => `https://www.channel5.com/search?q=${encodeURIComponent(q)}` },
  137: { name: 'U (Dave / UKTV)', tag: '🇬🇧 [U / DAVE • FREE]', url: q => `https://u.co.uk/search?q=${encodeURIComponent(q)}` },
  29: { name: 'Sky Go', tag: '🛰️ [SKY GO • BYOA]', url: () => `https://www.sky.com/watch/sky-go` },
  39: { name: 'NOW', tag: '🟣 [NOW • BYOA]', url: q => `https://www.nowtv.com/watch/search?q=${encodeURIComponent(q)}` },
  591: { name: 'NOW Cinema', tag: '🟣 [NOW CINEMA • BYOA]', url: q => `https://www.nowtv.com/watch/search?q=${encodeURIComponent(q)}` },
  8: { name: 'Netflix', tag: '🔴 [NETFLIX • BYOA]', url: q => `https://www.netflix.com/search?q=${encodeURIComponent(q)}` },
  1796: { name: 'Netflix Standard with Ads', tag: '🔴 [NETFLIX • BYOA]', url: q => `https://www.netflix.com/search?q=${encodeURIComponent(q)}` },
  9: { name: 'Amazon Prime Video', tag: '📦 [PRIME VIDEO • BYOA]', url: q => `https://www.primevideo.com/search/ref=atv_nb_sug?phrase=${encodeURIComponent(q)}` },
  2100: { name: 'Prime Video with Ads', tag: '📦 [PRIME VIDEO • BYOA]', url: q => `https://www.primevideo.com/search/ref=atv_nb_sug?phrase=${encodeURIComponent(q)}` },
  337: { name: 'Disney+', tag: '🏰 [DISNEY+ • BYOA]', url: () => `https://www.disneyplus.com/` },
  350: { name: 'Apple TV+', tag: '🍎 [APPLE TV+ • BYOA]', url: q => `https://tv.apple.com/search?term=${encodeURIComponent(q)}` },
  531: { name: 'Paramount+', tag: '🏔️ [PARAMOUNT+ • BYOA]', url: q => `https://www.paramountplus.com/search/?q=${encodeURIComponent(q)}` },
  2303: { name: 'Paramount+ Premium', tag: '🏔️ [PARAMOUNT+ • BYOA]', url: q => `https://www.paramountplus.com/search/?q=${encodeURIComponent(q)}` },
  1899: { name: 'Max (HBO)', tag: '🟣 [MAX • BYOA]', url: q => `https://play.max.com/search?q=${encodeURIComponent(q)}` },
  524: { name: 'Discovery+', tag: '🌍 [DISCOVERY+ • BYOA]', url: () => `https://www.discoveryplus.com/` },
  151: { name: 'BritBox', tag: '🇬🇧 [BRITBOX • BYOA]', url: () => `https://www.britbox.com/` },
  283: { name: 'Crunchyroll', tag: '🍜 [CRUNCHYROLL • BYOA]', url: () => `https://www.crunchyroll.com/` },
  15: { name: 'Hulu', tag: '🟢 [HULU • BYOA]', url: () => `https://www.hulu.com/` },
  386: { name: 'Peacock', tag: '🦚 [PEACOCK • BYOA]', url: () => `https://www.peacocktv.com/` },
  387: { name: 'Peacock Premium Plus', tag: '🦚 [PEACOCK • BYOA]', url: () => `https://www.peacocktv.com/` },
  223: { name: 'Hayu', tag: '💅 [HAYU • BYOA]', url: () => `https://www.hayu.com/` },
  189: { name: 'Curzon Home Cinema', tag: '🎭 [CURZON • BYOA]', url: () => `https://www.curzon.com/` },
  224: { name: 'BFI Player', tag: '🎞️ [BFI PLAYER • BYOA]', url: () => `https://player.bfi.org.uk/` },
  593: { name: 'STV Player', tag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 [STV PLAYER • FREE]', url: () => `https://player.stv.tv/` },
  2663: { name: 'S4C Clic', tag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 [S4C CLIC • FREE]', url: () => `https://www.s4c.cymru/clic/` },
  11: { name: 'MUBI', tag: '🎬 [MUBI • BYOA]', url: q => `https://mubi.com/en/search/films?query=${encodeURIComponent(q)}` },
  99: { name: 'Shudder', tag: '🩸 [SHUDDER • BYOA]', url: () => `https://www.shudder.com/` },
  43: { name: 'Starz', tag: '⭐ [STARZ • BYOA]', url: () => `https://www.starz.com/` },
  34: { name: 'MGM+', tag: '🦁 [MGM+ • BYOA]', url: () => `https://www.mgmplus.com/` },
  538: { name: 'Plex', tag: '⚡ [PLEX • FREE]', url: q => `https://watch.plex.tv/search?q=${encodeURIComponent(q)}` },
  73: { name: 'Tubi', tag: '📺 [TUBI • FREE]', url: q => `https://tubitv.com/search/${encodeURIComponent(q)}` },
  300: { name: 'Pluto TV', tag: '🪐 [PLUTO TV • FREE]', url: () => `https://pluto.tv/` }
};

// Fetch BYOA Streaming Platform Deep-Links & Official Trailer
async function fetchByoaStreams(type, tmdbId, title, region = 'GB') {
  const targetRegion = REGIONS[region] ? region : 'GB';
  const cacheKey = `byoa:${type}:${tmdbId}:${targetRegion}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const byoaStreams = [];

  try {
    const endpointType = type === 'series' ? 'tv' : 'movie';
    const [tmdbData, provRes] = await Promise.all([
      fetchTmdb(`/${endpointType}/${tmdbId}`, { append_to_response: 'videos' }).catch(() => null),
      fetchTmdb(`/${endpointType}/${tmdbId}/watch/providers`).catch(() => null)
    ]);

    // 1. DRM-Free Official Trailer (Plays natively in Stremio)
    const trailer = (tmdbData?.videos?.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
    if (trailer && trailer.key) {
      byoaStreams.push({
        name: '🎬 [OFFICIAL TRAILER]\nPlay Trailer in Stremio',
        title: `${title} — Official Trailer\n▶️ Plays directly inside Stremio (DRM-Free)`,
        ytId: trailer.key
      });
    }

    // 2. BYOA Watch Providers for target region (with US fallback if target region has no stream)
    if (provRes?.results) {
      const regionData = provRes.results[targetRegion] || provRes.results['GB'] || provRes.results['US'] || {};
      const allServices = [
        ...(regionData.flatrate || []),
        ...(regionData.free || [])
      ];

      const seen = new Set();
      for (const p of allServices) {
        const pid = p.provider_id;
        if (!pid || seen.has(pid)) continue;
        seen.add(pid);

        const meta = PROVIDER_METADATA[pid];
        if (meta) {
          byoaStreams.push({
            name: `${meta.tag}\nOfficial Stream`,
            title: `Watch "${title}" on ${meta.name} with your account\n🔗 Opens official player / website`,
            externalUrl: meta.url(title)
          });
        }
      }
    }

    setCache(cacheKey, byoaStreams, 3600);
    return byoaStreams;
  } catch (e) {
    console.error('BYOA lookup error:', e.message);
    return [];
  }
}

// Handle Actor Filmography & Title Searches
async function handleSearch(type, query, skip = 0) {
  const isMovie = type === 'movie';
  
  // 1. Search if query matches a Person (Actor, Director)
  const personRes = await fetchTmdb('/search/person', { query, include_adult: false });
  const person = personRes.results && personRes.results.length > 0 ? personRes.results[0] : null;

  if (person && person.popularity > 2.0) {
    if (isMovie) {
      const creditsRes = await fetchTmdb(`/person/${person.id}/movie_credits`);
      const cast = creditsRes.cast || [];
      const crew = (creditsRes.crew || []).filter(c => c.job === 'Director');
      
      const movieMap = new Map();
      for (const m of [...cast, ...crew]) {
        if (!movieMap.has(m.id)) {
          movieMap.set(m.id, m);
        }
      }

      const sorted = Array.from(movieMap.values())
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));

      const page = sorted.slice(skip, skip + 20);
      return page.map(m => formatMetaPreview(m, 'movie'));
    } else {
      const creditsRes = await fetchTmdb(`/person/${person.id}/tv_credits`);
      const cast = creditsRes.cast || [];
      
      let filtered = cast.filter(s => !(s.genre_ids || []).includes(10767));
      if (filtered.length === 0) filtered = cast;

      const showMap = new Map();
      for (const s of filtered) {
        if (!showMap.has(s.id)) showMap.set(s.id, s);
      }

      const sorted = Array.from(showMap.values())
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));

      const page = sorted.slice(skip, skip + 20);
      return page.map(s => formatMetaPreview(s, 'series'));
    }
  }

  // 2. Fallback to standard Movie/TV title search if no actor matched
  if (isMovie) {
    const tmdbPage = Math.floor(skip / 20) + 1;
    const res = await fetchTmdb('/search/movie', { query, page: tmdbPage, include_adult: false });
    return (res.results || []).map(m => formatMetaPreview(m, 'movie'));
  } else {
    const tmdbPage = Math.floor(skip / 20) + 1;
    const res = await fetchTmdb('/search/tv', { query, page: tmdbPage, include_adult: false });
    return (res.results || []).map(s => formatMetaPreview(s, 'series'));
  }
}

// Handle Genre and Catalog Browsing
async function handleGenreCatalog(type, genre, skip = 0) {
  const isMovie = type === 'movie';
  const tmdbPage = Math.floor(skip / 20) + 1;

  if (genre === 'Upcoming Releases' && isMovie) {
    const res = await fetchTmdb('/movie/upcoming', { page: tmdbPage });
    return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'Now In Theaters' && isMovie) {
    const res = await fetchTmdb('/movie/now_playing', { page: tmdbPage });
    return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'Airing Next 7 Days' && !isMovie) {
    const res = await fetchTmdb('/tv/on_the_air', { page: tmdbPage });
    return (res.results || []).map(item => formatMetaPreview(item, 'series'));
  }

  if (genre === 'Airing Today' && !isMovie) {
    const res = await fetchTmdb('/tv/airing_today', { page: tmdbPage });
    return (res.results || []).map(item => formatMetaPreview(item, 'series'));
  }

  if (genre === 'Trending Today') {
    const res = await fetchTmdb(`/trending/${isMovie ? 'movie' : 'tv'}/day`, { page: tmdbPage });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Trending This Week') {
    const res = await fetchTmdb(`/trending/${isMovie ? 'movie' : 'tv'}/week`, { page: tmdbPage });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Top Rated') {
    const res = await fetchTmdb(`/${isMovie ? 'movie' : 'tv'}/top_rated`, { page: tmdbPage });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Anime') {
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
      with_genres: 16,
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Korean Cinema' && isMovie) {
    const res = await fetchTmdb('/discover/movie', {
      with_original_language: 'ko',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'K-Drama' && !isMovie) {
    const res = await fetchTmdb('/discover/tv', {
      with_original_language: 'ko',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, 'series'));
  }

  if (genre === 'Superhero') {
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
      with_keywords: '9715|9717|180547',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Martial Arts') {
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
      with_keywords: '779|780',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Cyberpunk') {
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
      with_keywords: '12190',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Film-Noir') {
    const res = await fetchTmdb('/discover/movie', {
      with_keywords: '9807',
      sort_by: 'vote_count.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'Stand-Up Comedy') {
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
      with_keywords: '9716',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  // 1. Streaming Service Hubs
  const providerMap = {
    'Netflix': '8',
    'Apple TV+': '350',
    'Max (HBO)': '1899|384',
    'Disney+': '337',
    'Amazon Prime': '9|119',
    'Paramount+': '531'
  };
  if (providerMap[genre]) {
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
      with_watch_providers: providerMap[genre],
      watch_region: 'US',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  // 2. Curated Franchises & Universes in Chronological Viewing Order
  const today = new Date().toISOString().slice(0, 10);

  if (genre === 'Marvel (MCU)') {
    if (isMovie) {
      const res = await fetchTmdb('/discover/movie', {
        with_keywords: '180547',
        'primary_release_date.lte': today,
        sort_by: 'primary_release_date.asc',
        page: tmdbPage
      });
      return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
    } else {
      const res = await fetchTmdb('/discover/tv', {
        with_keywords: '180547',
        'first_air_date.lte': today,
        sort_by: 'first_air_date.asc',
        page: tmdbPage
      });
      return (res.results || []).map(item => formatMetaPreview(item, 'series'));
    }
  }

  if (genre === 'Star Wars Saga') {
    if (isMovie) {
      const col = await fetchTmdb('/collection/10').catch(() => null);
      const rogue = await fetchTmdb('/movie/330459').catch(() => null);
      const solo = await fetchTmdb('/movie/348350').catch(() => null);
      const allParts = [...(col?.parts || [])];
      if (rogue && rogue.id) allParts.push(rogue);
      if (solo && solo.id) allParts.push(solo);
      allParts.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
      const slice = allParts.slice(skip, skip + 20);
      return slice.map(item => formatMetaPreview(item, 'movie'));
    } else {
      const swShowIds = [4194, 60554, 82856, 79093, 105971, 114478, 115036, 92830, 83867, 203085, 114461, 251091, 114479, 202879];
      const shows = await Promise.all(swShowIds.map(id => fetchTmdb(`/tv/${id}`).catch(() => null)));
      const validShows = shows.filter(Boolean);
      validShows.sort((a, b) => (a.first_air_date || '').localeCompare(b.first_air_date || ''));
      const slice = validShows.slice(skip, skip + 20);
      return slice.map(item => formatMetaPreview(item, 'series'));
    }
  }

  if (genre === 'Harry Potter' && isMovie) {
    const col = await fetchTmdb('/collection/1241');
    const fbCol = await fetchTmdb('/collection/435259').catch(() => null);
    const parts = [...(col.parts || []), ...(fbCol?.parts || [])];
    parts.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
    const slice = parts.slice(skip, skip + 20);
    return slice.map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'Lord of the Rings' && isMovie) {
    const lotr = await fetchTmdb('/collection/119');
    const hobbit = await fetchTmdb('/collection/121938');
    const parts = [...(lotr.parts || []), ...(hobbit.parts || [])];
    parts.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
    const slice = parts.slice(skip, skip + 20);
    return slice.map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'James Bond (007)' && isMovie) {
    const col = await fetchTmdb('/collection/645');
    const parts = (col.parts || []).sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
    const slice = parts.slice(skip, skip + 20);
    return slice.map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'Studio Ghibli' && isMovie) {
    const res = await fetchTmdb('/discover/movie', {
      with_companies: '10342',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'Christopher Nolan Universe' && isMovie) {
    const res = await fetchTmdb('/discover/movie', {
      with_crew: '525',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'Quentin Tarantino Universe' && isMovie) {
    const res = await fetchTmdb('/discover/movie', {
      with_crew: '138',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
  }

  // 3. Decade Time-Machine Filters
  const decadeMap = {
    '2020s Cinema': { gte: '2020-01-01', lte: '2029-12-31' },
    '2010s Hits': { gte: '2010-01-01', lte: '2019-12-31' },
    '2000s Nostalgia': { gte: '2000-01-01', lte: '2009-12-31' },
    '90s Golden Age': { gte: '1990-01-01', lte: '1999-12-31' },
    '80s Retro Classics': { gte: '1980-01-01', lte: '1989-12-31' },
    '70s Vintage Cinema': { gte: '1970-01-01', lte: '1979-12-31' },
    '2020s TV': { gte: '2020-01-01', lte: '2029-12-31' },
    '2010s TV Hits': { gte: '2010-01-01', lte: '2019-12-31' },
    '2000s TV Classics': { gte: '2000-01-01', lte: '2009-12-31' },
    '90s Nostalgia TV': { gte: '1990-01-01', lte: '1999-12-31' }
  };
  if (decadeMap[genre]) {
    const { gte, lte } = decadeMap[genre];
    const params = {
      sort_by: 'vote_count.desc',
      page: tmdbPage
    };
    if (isMovie) {
      params['primary_release_date.gte'] = gte;
      params['primary_release_date.lte'] = lte;
    } else {
      params['first_air_date.gte'] = gte;
      params['first_air_date.lte'] = lte;
    }
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, params);
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  const genreMap = isMovie ? MOVIE_GENRES : TV_GENRES;
  const genreId = genreMap[genre];

  const params = {
    sort_by: 'popularity.desc',
    page: tmdbPage
  };
  if (genreId) {
    params.with_genres = genreId;
  }

  const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, params);
  return (res.results || []).map(item => formatMetaPreview(item, type));
}

// Fetch episodes for a single TV season from TMDb
async function fetchTmdbSeasonVideos(tmdbId, seasonNumber, imdbId) {
  try {
    const sData = await fetchTmdb(`/tv/${tmdbId}/season/${seasonNumber}`);
    if (!sData?.episodes) return [];
    return sData.episodes.map(ep => {
      const airDate = ep.air_date ? new Date(ep.air_date).toISOString() : null;
      return {
        id: imdbId ? `${imdbId}:${ep.season_number}:${ep.episode_number}` : `tmdb:${tmdbId}:${ep.season_number}:${ep.episode_number}`,
        name: ep.name || `Episode ${ep.episode_number}`,
        season: ep.season_number,
        number: ep.episode_number,
        episode: ep.episode_number,
        firstAired: airDate,
        released: airDate,
        overview: ep.overview || '',
        thumbnail: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null
      };
    });
  } catch (e) {
    return [];
  }
}

// Fetch episodes across recent and upcoming seasons from TMDb
async function fetchTmdbVideos(tmdbId, seasons = [], imdbId) {
  const regularSeasons = (seasons || []).filter(s => s.season_number > 0);
  const targetSeasons = regularSeasons.slice(-4);
  const videos = [];
  for (const s of targetSeasons) {
    const eps = await fetchTmdbSeasonVideos(tmdbId, s.season_number, imdbId);
    videos.push(...eps);
  }
  return videos;
}

// Handle Metadata for clicked item
async function handleMeta(type, id) {
  if (id.startsWith('yt:') || type === 'channel') {
    const videoId = id.replace('yt:', '');
    const cachedMeta = getCache(`yt:meta:${videoId}`);
    if (cachedMeta) return cachedMeta;

    let videoTitle = 'YouTube Video';
    let authorName = '';

    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        signal: AbortSignal.timeout(4000)
      });
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        if (oembed.title) videoTitle = oembed.title;
        if (oembed.author_name) authorName = oembed.author_name;
      }
    } catch (e) {}

    const meta = {
      id: `yt:${videoId}`,
      type: 'channel',
      name: videoTitle,
      poster: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      background: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      description: authorName ? `Channel: ${authorName}\n\n▶️ Watch directly inside Stremio player (DRM-Free) or launch in the YouTube app with your Google account (BYOA).` : '▶️ Watch directly inside Stremio player (DRM-Free) or launch in the YouTube app with your Google account (BYOA).',
      behaviorHints: {
        defaultVideoId: `yt:${videoId}`
      }
    };
    setCache(`yt:meta:${videoId}`, meta, 86400);
    return meta;
  }

  const isMovie = type === 'movie';
  const isImdb = id.startsWith('tt');
  let tmdbId = id;

  if (isImdb) {
    const findRes = await fetchTmdb(`/find/${id}`, { external_source: 'imdb_id' });
    const match = isMovie ? findRes?.movie_results?.[0] : findRes?.tv_results?.[0];
    if (match) {
      tmdbId = String(match.id);
    } else {
      return null;
    }
  } else {
    tmdbId = id.replace('tmdb:', '');
  }

  const cacheKey = `meta:${type}:${id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  if (isMovie) {
    const data = await fetchTmdb(`/movie/${tmdbId}`, {
      append_to_response: 'external_ids,credits,videos'
    });
    const imdbId = data.external_ids?.imdb_id || (isImdb ? id : data.imdb_id);

    // Fetch Cinemeta for IMDb rating & awards
    let cinData = null;
    if (imdbId) {
      try {
        const cinRes = await fetch(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`, {
          signal: AbortSignal.timeout(4000)
        });
        if (cinRes.ok) cinData = await cinRes.json();
      } catch (e) {}
    }

    const imdbScore = cinData?.meta?.imdbRating || null;
    const tmdbScore = data.vote_average ? data.vote_average.toFixed(1) : null;
    const tmdbPercent = data.vote_average ? Math.round(data.vote_average * 10) : null;
    const awardsText = cinData?.meta?.awards;

    const badges = [];
    if (imdbScore) badges.push(`⭐ IMDb: ${imdbScore}/10`);
    if (tmdbScore) badges.push(`🎬 TMDb: ${tmdbScore}/10 (${tmdbPercent}% • ${(data.vote_count || 0).toLocaleString()} votes)`);
    if (awardsText) badges.push(`🏆 ${awardsText}`);

    const badgeHeader = badges.length > 0 ? `${badges.join('   •   ')}\n\n` : '';
    const description = `${badgeHeader}${data.overview || ''}`;

    const meta = {
      id: isImdb ? id : `tmdb:${tmdbId}`,
      imdb_id: imdbId || undefined,
      type: 'movie',
      name: data.title,
      slug: `movie/${(data.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${imdbId || tmdbId}`,
      genres: (data.genres || []).map(g => g.name),
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      background: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      description: description,
      releaseInfo: (data.release_date || '').slice(0, 4),
      released: data.release_date ? new Date(data.release_date).toISOString() : undefined,
      runtime: data.runtime ? `${data.runtime} min` : undefined,
      imdbRating: imdbScore || undefined,
      director: (data.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name),
      cast: (data.credits?.cast || []).slice(0, 10).map(c => c.name),
      trailers: (data.videos?.results || [])
        .filter(v => v.site === 'YouTube' && v.type === 'Trailer')
        .map(v => ({ source: v.key, type: 'Trailer' })),
      behaviorHints: {
        defaultVideoId: imdbId || `tmdb:${tmdbId}`,
        hasScheduledVideos: false
      }
    };

    setCache(cacheKey, meta, 3600);
    return meta;
  } else {
    // TV Series
    const data = await fetchTmdb(`/tv/${tmdbId}`, {
      append_to_response: 'external_ids,credits,videos'
    });
    const imdbId = data.external_ids?.imdb_id;

    let videos = [];
    let cinData = null;
    if (imdbId) {
      try {
        const cinRes = await fetch(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`, {
          signal: AbortSignal.timeout(4000)
        });
        if (cinRes.ok) {
          cinData = await cinRes.json();
          if (cinData.meta && cinData.meta.videos && cinData.meta.videos.length > 0) {
            videos = cinData.meta.videos;
          }
        }
      } catch (e) {
        // Fallback silently if Cinemeta is unreachable
      }
    }

    if (videos.length === 0) {
      videos = await fetchTmdbVideos(tmdbId, data.seasons, imdbId);
    } else if (data.next_episode_to_air) {
      const nextEp = data.next_episode_to_air;
      const alreadyHas = videos.some(v => v.season === nextEp.season_number && (v.number === nextEp.episode_number || v.episode === nextEp.episode_number));
      if (!alreadyHas) {
        const upcomingVideos = await fetchTmdbSeasonVideos(tmdbId, nextEp.season_number, imdbId);
        for (const ep of upcomingVideos) {
          if (!videos.some(v => v.season === ep.season && (v.number === ep.number || v.episode === ep.episode))) {
            videos.push(ep);
          }
        }
      }
    }

    const imdbScore = cinData?.meta?.imdbRating || null;
    const tmdbScore = data.vote_average ? data.vote_average.toFixed(1) : null;
    const tmdbPercent = data.vote_average ? Math.round(data.vote_average * 10) : null;
    const awardsText = cinData?.meta?.awards;

    const badges = [];
    if (imdbScore) badges.push(`⭐ IMDb: ${imdbScore}/10`);
    if (tmdbScore) badges.push(`🎬 TMDb: ${tmdbScore}/10 (${tmdbPercent}% • ${(data.vote_count || 0).toLocaleString()} votes)`);
    if (awardsText) badges.push(`🏆 ${awardsText}`);

    const badgeHeader = badges.length > 0 ? `${badges.join('   •   ')}\n\n` : '';
    const description = `${badgeHeader}${data.overview || ''}`;

    const meta = {
      id: isImdb ? id : `tmdb:${tmdbId}`,
      imdb_id: imdbId || (isImdb ? id : undefined),
      type: 'series',
      name: data.name,
      slug: `series/${(data.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${imdbId || tmdbId}`,
      genres: (data.genres || []).map(g => g.name),
      poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      background: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      description: description,
      releaseInfo: (data.first_air_date || '').slice(0, 4),
      imdbRating: imdbScore || undefined,
      cast: (data.credits?.cast || []).slice(0, 10).map(c => c.name),
      videos: videos,
      trailers: (data.videos?.results || [])
        .filter(v => v.site === 'YouTube' && v.type === 'Trailer')
        .map(v => ({ source: v.key, type: 'Trailer' })),
      behaviorHints: {
        defaultVideoId: null,
        hasScheduledVideos: true
      }
    };

    setCache(cacheKey, meta, 3600);
    return meta;
  }
}

// -------------------------------------------------------------
// INTELLIGENT STREAM SPEED RANKING & CINEMA AUDIO/VIDEO BADGES
// -------------------------------------------------------------
function extractCinemaBadges(text = '') {
  const audio = [];
  const video = [];
  const edition = [];

  // Audio Codecs & Channels
  if (/atmos/i.test(text)) audio.push('🔊 Atmos');
  else if (/truehd/i.test(text)) audio.push('🔊 TrueHD');
  else if (/dts[\s\.\-_]?hd/i.test(text)) audio.push('🔊 DTS-HD');
  else if (/dts[\s\.\-_]?x/i.test(text)) audio.push('🔊 DTS:X');
  else if (/\bdts\b/i.test(text)) audio.push('🔊 DTS');
  else if (/(?:eac3|ddp|dd\+|aac5\.1|ac3|5\.1)/i.test(text)) audio.push('🔊 5.1');
  else if (/7\.1/i.test(text)) audio.push('🔊 7.1');

  // Video & Dynamic Range
  if (/\b(dolby\s*vision|dovi)\b/i.test(text) || (/\bdv\b/i.test(text) && !/dvd/i.test(text))) video.push('✨ DV');
  if (/hdr10\+/i.test(text)) video.push('🌈 HDR10+');
  else if (/\bhdr(10)?\b/i.test(text) && !/hdrip/i.test(text)) video.push('🌈 HDR');
  if (/10bit|10-bit/i.test(text)) video.push('10-bit');
  if (/remux/i.test(text)) video.push('💎 Remux');

  // Editions
  if (/imax/i.test(text)) edition.push('🎞️ IMAX');
  if (/director'?s\s*cut/i.test(text)) edition.push('🎬 Director\'s Cut');
  else if (/extended/i.test(text)) edition.push('🎬 Extended');

  return { audio, video, edition };
}

function optimizeAndRankStreams(rawStreams, userConfig = DEFAULT_USER_CONFIG) {
  if (!Array.isArray(rawStreams) || rawStreams.length === 0) return [];

  const parsed = [];
  for (const s of rawStreams) {
    const title = s.title || '';
    const name = s.name || '';
    const filename = s.behaviorHints?.filename || '';

    // Check for Debrid Cached Streams (Real-Debrid, AllDebrid, TorBox, Premiumize)
    let debridProvider = '';
    const debridMatch = (name + ' ' + title).match(/\[(RD|AD|TB|PM)\+?\]/i);
    if (debridMatch) {
      const code = debridMatch[1].toUpperCase();
      if (code === 'RD') debridProvider = 'Real-Debrid';
      else if (code === 'AD') debridProvider = 'AllDebrid';
      else if (code === 'TB') debridProvider = 'TorBox';
      else if (code === 'PM') debridProvider = 'Premiumize';
    }
    const isDebrid = Boolean(debridProvider);

    // Parse Seeders
    const seedMatch = title.match(/👤\s*(\d+)/);
    const seeders = seedMatch ? parseInt(seedMatch[1], 10) : 0;

    // Parse File Size in GB
    const sizeMatch = title.match(/💾\s*([\d\.]+)\s*(GB|MB)/i);
    let sizeGB = 0;
    if (sizeMatch) {
      const val = parseFloat(sizeMatch[1]);
      sizeGB = sizeMatch[2].toUpperCase() === 'MB' ? val / 1024 : val;
    }

    // Quality & Codec Detection
    let quality = '';
    let is4k = false;
    let is1080p = false;
    let is720p = false;
    if (/4k|2160p/i.test(name) || /4k|2160p/i.test(title)) {
      quality = '4K';
      is4k = true;
    } else if (/1080p/i.test(name) || /1080p/i.test(title)) {
      quality = '1080p';
      is1080p = true;
    } else if (/720p/i.test(name) || /720p/i.test(title)) {
      quality = '720p';
      is720p = true;
    } else if (/480p|576p|dvdrip|sd/i.test(name) || /480p|576p|dvdrip|sd/i.test(title)) {
      quality = 'SD';
    }

    const isHdr = /HDR/i.test(name) || /HDR/i.test(title);
    const isDv = /\b(dolby\s*vision|dovi)\b/i.test(name + ' ' + title) || (/\bdv\b/i.test(name + ' ' + title) && !/dvd/i.test(name + ' ' + title));

    // Extract Home Cinema Badges (Audio/Video/Edition)
    const badgesObj = extractCinemaBadges(`${title} ${name} ${filename}`);
    const cinemaHighlights = [...badgesObj.video, ...badgesObj.audio, ...badgesObj.edition];
    const cinemaTag = cinemaHighlights.length > 0 ? ` • ${cinemaHighlights.slice(0, 3).join(' ')}` : '';

    // Calculate Speed & Buffer-Free Score
    let speedScore = 0;
    let speedBadge = '';
    let recommendation = '';

    if (isDebrid) {
      speedScore = 100000 + (is4k ? 1000 : 500) + (isDv || isHdr ? 100 : 0) - (sizeGB * 0.1);
      speedBadge = '🚀 [INSTANT CDN • 0 BUFFER]';
      recommendation = `⚡ ${debridProvider} High-Speed Cloud Stream`;
    } else {
      if (seeders === 0) {
        speedScore = -1000;
        speedBadge = '❌ [DEAD • 0 SEEDERS]';
        recommendation = 'Do not stream (No seeders)';
      } else if (seeders < 10 && sizeGB > 25) {
        speedScore = -500 + seeders;
        speedBadge = `⚠️ [HIGH BUFFER RISK • ${seeders} 👤]`;
        recommendation = 'High buffering risk (Huge file, low seeders)';
      } else {
        const qualityWeight = is4k ? 1.2 : (is1080p ? 1.0 : (is720p ? 0.8 : 0.7));
        const seederPoints = seeders * 12;
        const sizePenalty = seeders < 50 ? (sizeGB * 8) : (sizeGB * 2);
        
        speedScore = (seederPoints - sizePenalty) * qualityWeight;

        if (seeders >= 150) {
          speedBadge = `⚡ [FASTEST • ${seeders} 👤]`;
          recommendation = 'Instant start • Zero buffering recommended';
        } else if (seeders >= 50) {
          speedBadge = `⚡ [HIGH SPEED • ${seeders} 👤]`;
          recommendation = 'Smooth streaming • High seeders';
        } else if (seeders >= 15) {
          speedBadge = `🟡 [MODERATE • ${seeders} 👤]`;
          recommendation = 'Normal speed';
        } else {
          speedBadge = `⚠️ [BUFFER RISK • ${seeders} 👤]`;
          recommendation = 'May buffer occasionally';
        }
      }
    }

    const qualityLabel = [quality, isDv ? 'DV' : '', isHdr && !isDv ? 'HDR' : ''].filter(Boolean).join(' ');
    const cleanAddonName = s.name.replace(/^Torrentio\n?/i, '').replace(/^\[[^\]]+\]\s*/, '').trim() || qualityLabel || 'Stream';

    parsed.push({
      ...s,
      _speedScore: speedScore,
      _seeders: seeders,
      _isDead: seeders === 0 && !isDebrid,
      _isBufferRisk: seeders < 10 && sizeGB > 25,
      name: `${speedBadge}\n${cleanAddonName}${cinemaTag}`,
      title: `${title}\n🎬 Cinema Format: ${cinemaHighlights.join(' | ') || 'Standard Digital'}\n🛡️ NightKnight Buffer Shield: ${recommendation}`
    });
  }

  let activeStreams = parsed.filter(s => !s._isDead);

  if (userConfig.hideRisk) {
    activeStreams = activeStreams.filter(s => !s._isBufferRisk);
  }

  activeStreams.sort((a, b) => b._speedScore - a._speedScore);

  return activeStreams.map(({ _speedScore, _seeders, _isDead, _isBufferRisk, ...clean }) => clean);
}

// Handle Streams Request
async function handleStream(type, id, userConfig = DEFAULT_USER_CONFIG) {
  if (id.startsWith('yt:') || type === 'channel') {
    const videoId = id.replace('yt:', '');
    return [
      {
        name: '▶️ [STREMIO PLAYER]\nYouTube Native Stream',
        title: 'Watch directly inside Stremio (DRM-Free)',
        ytId: videoId
      },
      {
        name: '🔴 [YOUTUBE • BYOA]\nOfficial YouTube App',
        title: 'Watch on YouTube with your account (likes, comments, subscriptions)\n🔗 Opens YouTube',
        externalUrl: `https://www.youtube.com/watch?v=${videoId}`
      }
    ];
  }

  const region = userConfig.region || 'GB';
  const cacheKey = `stream:${type}:${id}:${region}:${userConfig.upstream}:${userConfig.hideRisk}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    let imdbTarget = id;
    let tmdbTargetId = null;
    let targetTitle = '';

    if (id.startsWith('tmdb:')) {
      if (type === 'movie') {
        tmdbTargetId = id.replace('tmdb:', '');
        const movieData = await fetchTmdb(`/movie/${tmdbTargetId}`, { append_to_response: 'external_ids' });
        imdbTarget = movieData.external_ids?.imdb_id || movieData.imdb_id;
        targetTitle = movieData.title || '';
      } else {
        const parts = id.replace('tmdb:', '').split(':');
        tmdbTargetId = parts[0];
        const season = parts[1];
        const ep = parts[2];
        const tvData = await fetchTmdb(`/tv/${tmdbTargetId}`, { append_to_response: 'external_ids' });
        const showImdb = tvData.external_ids?.imdb_id;
        targetTitle = tvData.name || '';
        if (showImdb && season && ep) {
          imdbTarget = `${showImdb}:${season}:${ep}`;
        } else {
          imdbTarget = showImdb;
        }
      }
    } else if (id.startsWith('tt')) {
      const imdbBase = id.split(':')[0];
      const findRes = await fetchTmdb(`/find/${imdbBase}`, { external_source: 'imdb_id' });
      const match = (type === 'movie') ? findRes?.movie_results?.[0] : findRes?.tv_results?.[0];
      if (match) {
        tmdbTargetId = String(match.id);
        targetTitle = match.title || match.name || '';
      }
    }

    // 1. Fetch BYOA Streams & Official Trailer
    let byoaStreams = [];
    if (tmdbTargetId) {
      byoaStreams = await fetchByoaStreams(type, tmdbTargetId, targetTitle || 'Title', region);
    }

    if (!imdbTarget) return byoaStreams;

    const scraperBase = (userConfig.upstream || APP_CONFIG.upstreamScraper || 'https://torrentio.strem.fun').replace(/\/$/, '');
    const upstreamUrl = `${scraperBase}/stream/${type}/${imdbTarget}.json`;

    let rawStreams = [];
    try {
      const res = await fetch(upstreamUrl, {
        headers: { 'User-Agent': 'Stremio/4.4.168' },
        signal: AbortSignal.timeout(6500)
      });
      UPSTREAM_HEALTH.lastStatus = res.status;
      UPSTREAM_HEALTH.at = new Date().toISOString();
      if (res.ok) {
        const data = await res.json();
        rawStreams = data.streams || [];
        UPSTREAM_HEALTH.lastStreams = rawStreams.length;
        UPSTREAM_HEALTH.lastError = null;
      } else {
        UPSTREAM_HEALTH.lastError = `HTTP ${res.status}`;
      }
    } catch (e) {
      UPSTREAM_HEALTH.lastError = e.message;
      UPSTREAM_HEALTH.at = new Date().toISOString();
    }

    const optimized = optimizeAndRankStreams(rawStreams, userConfig);
    const combined = [...byoaStreams, ...optimized];
    setCache(cacheKey, combined, 600);
    return combined;
  } catch (e) {
    console.error(`Stream lookup error for ${type}/${id}:`, e.message);
    return [];
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'max-age=3600, public');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = parseUrl(req.url, true);
  const rawPathname = decodeURIComponent(parsedUrl.pathname || '/');

  // Strip optional user config segment from path (Stremio standard: /:config?/...)
  let userConfig = DEFAULT_USER_CONFIG;
  let configSegment = '';
  let pathname = rawPathname;

  const segments = rawPathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const first = segments[0];
    if (!['catalog', 'meta', 'stream', 'manifest.json', 'icon.png', 'logo.png', 'background.png', 'bg.png', 'configure', 'api'].includes(first)) {
      configSegment = first;
      userConfig = decodeUserConfig(configSegment);
      pathname = '/' + segments.slice(1).join('/');
    }
  }

  // Compute dynamic baseUrl from request headers
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || `${HOST}:${PORT}`;
  const baseUrl = configSegment ? `${proto}://${host}/${configSegment}` : `${proto}://${host}`;

  try {
    recordClient(req);

    // Static files: /icon.png & /background.png
    if (pathname === '/icon.png' || pathname === '/logo.png') {
      const iconPath = path.join(__dirname, 'public', 'icon.png');
      if (fs.existsSync(iconPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(iconPath).pipe(res);
        return;
      }
    }

    if (pathname === '/background.png' || pathname === '/bg.png') {
      const bgPath = path.join(__dirname, 'public', 'background.png');
      if (fs.existsSync(bgPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(bgPath).pipe(res);
        return;
      }
    }

    // Health & diagnostic check (read-only)
    if (pathname === '/api/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        version: ADDON_VERSION,
        status: 'online',
        upstream: UPSTREAM_HEALTH
      }));
      return;
    }

    // Live Stats & Anonymized Install Counter
    if (pathname === '/api/stats') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        addon: 'NightKnight Cinema',
        version: ADDON_VERSION,
        status: 'online',
        uptime: formatUptime(Date.now() - SERVER_BOOT_TIME),
        startedAt: STATS.startedAt,
        estimatedInstalls: Math.max(STATS.estimatedInstalls, STATS.uniqueClients.size),
        uniqueActiveClients: STATS.uniqueClients.size,
        manifestRequests: STATS.manifestRequests,
        totalRequests: STATS.totalRequests,
        catalogRequests: STATS.catalogRequests,
        streamRequests: STATS.streamRequests,
        metaRequests: STATS.metaRequests,
        youtubeSearches: STATS.youtubeSearches,
        lastRequestAt: STATS.lastRequestAt,
        privacy: '100% Zero-Knowledge Anonymized (No IP addresses stored)'
      }, null, 2));
      return;
    }

    // 1. Manifest
    if (pathname === '/manifest.json') {
      STATS.manifestRequests++;
      STATS.estimatedInstalls = Math.max(STATS.estimatedInstalls, STATS.uniqueClients.size);
      persistStats();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(getManifest(baseUrl)));
      return;
    }

    // 2. Streams: /stream/:type/:id.json
    const streamMatch = pathname.match(/^\/stream\/(movie|series|channel)\/([^\/]+)\.json$/);
    if (streamMatch) {
      STATS.streamRequests++;
      persistStats();
      const [, type, id] = streamMatch;
      const streams = await handleStream(type, id, userConfig);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ streams }));
      return;
    }

    // 3. Catalog: /catalog/:type/:id/:extra?.json
    const catalogMatch = pathname.match(/^\/catalog\/(movie|series|channel)\/([^\/]+)(?:\/(.+))?\.json$/);
    if (catalogMatch) {
      STATS.catalogRequests++;
      const [, type, catalogId, extraStr] = catalogMatch;
      let extra = {};
      if (extraStr) {
        const searchParams = new URLSearchParams(extraStr.replace(/\//g, '&'));
        for (const [k, v] of searchParams.entries()) {
          extra[k] = v;
        }
      }

      const skip = parseInt(extra.skip, 10) || 0;

      // Handle YouTube Catalog & Search
      if (catalogId === 'youtube_videos' || type === 'channel') {
        if (extra.search) STATS.youtubeSearches++;
        persistStats();
        const query = extra.search || (extra.genre ? `${extra.genre} videos` : 'Trending');
        const metas = await searchYouTube(query, skip);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metas }));
        return;
      }
      persistStats();

      // Handle Calendar Videos: /catalog/series/calendar-videos/calendarVideosIds=...
      if (type === 'series' && catalogId === 'calendar-videos') {
        const idsStr = extra.calendarVideosIds || '';
        const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);
        const metasDetailed = [];

        for (const rawId of ids) {
          try {
            let tmdbId = null;
            if (rawId.startsWith('tmdb:')) {
              tmdbId = rawId.slice(5);
            } else if (rawId.startsWith('tt')) {
              const findRes = await fetchTmdb(`/find/${rawId}`, { external_source: 'imdb_id' });
              if (findRes.tv_results && findRes.tv_results.length > 0) {
                tmdbId = findRes.tv_results[0].id;
              }
            } else if (/^\d+$/.test(rawId)) {
              tmdbId = rawId;
            }

            if (tmdbId) {
              const meta = await handleMeta('series', `tmdb:${tmdbId}`);
              if (meta) {
                metasDetailed.push({
                  ...meta,
                  id: rawId
                });
              }
            }
          } catch (e) {
            console.error(`Error loading calendar meta for ${rawId}:`, e.message);
          }
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metasDetailed }));
        return;
      }

      // Handle Dedicated Upcoming Movie Releases catalog (Landscape cards)
      if (catalogId === 'upcoming_movies') {
        const tmdbPage = Math.floor(skip / 20) + 1;
        const resData = await fetchTmdb('/movie/upcoming', { page: tmdbPage });
        const metas = (resData.results || []).map(item => formatMetaPreview(item, 'movie', true));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metas }));
        return;
      }

      // Handle Dedicated Upcoming Series catalog (Landscape cards)
      if (catalogId === 'on_the_air_series') {
        const tmdbPage = Math.floor(skip / 20) + 1;
        const resData = await fetchTmdb('/tv/on_the_air', { page: tmdbPage });
        const metas = (resData.results || []).map(item => formatMetaPreview(item, 'series', true));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metas }));
        return;
      }

      // Handle Dedicated Streaming Hub Catalogs (Netflix, Apple TV+, Max, Disney+, Prime, Paramount+)
      if (catalogId === 'streaming_hub_movies' || catalogId === 'streaming_hub_series') {
        const genre = extra.genre || 'Netflix';
        const metas = await handleGenreCatalog(type, genre, skip);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metas }));
        return;
      }

      // Standard Catalog (Search or Genre)
      let metas = [];
      if (extra.search) {
        metas = await handleSearch(type, extra.search, skip);
      } else {
        const genre = extra.genre || 'Popular';
        metas = await handleGenreCatalog(type, genre, skip);
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ metas }));
      return;
    }

    // 4. Meta: /meta/:type/:id.json (supports tmdb:123, tt1234567, and yt:VIDEO_ID)
    const metaMatch = pathname.match(/^\/meta\/(movie|series|channel)\/((?:tmdb:[0-9]+)|(?:tt[0-9]+)|(?:yt:[a-zA-Z0-9_\-]+))\.json$/);
    if (metaMatch) {
      STATS.metaRequests++;
      persistStats();
      const [, type, id] = metaMatch;
      const meta = await handleMeta(type, id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ meta }));
      return;
    }

    // 5. Landing / Configuration Web Page (Generates user-specific URL; no server-side mutation)
    if (pathname === '/' || pathname === '/configure') {
      const initialUpstream = escapeHtml(userConfig.upstream || 'https://torrentio.strem.fun');
      const initialRegion = userConfig.region || 'GB';
      const initialHideRisk = userConfig.hideRisk;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NightKnight Cinema — Stremio Addon</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" href="/icon.png">
  <style>
    body {
      background: #090d16 url('/background.png') no-repeat center center fixed;
      background-size: cover;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .overlay {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center, rgba(9, 13, 22, 0.75) 0%, rgba(9, 13, 22, 0.95) 100%);
      z-index: 1;
    }
    .card {
      position: relative;
      z-index: 2;
      background: rgba(18, 24, 38, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px;
      padding: 44px;
      max-width: 640px;
      width: 100%;
      text-align: center;
      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.1);
    }
    .logo-img {
      width: 96px;
      height: 96px;
      border-radius: 22px;
      margin-bottom: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      margin: 0 0 6px 0;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .byline {
      font-size: 13px;
      font-weight: 600;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 14.5px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%);
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      padding: 15px 36px;
      border-radius: 14px;
      box-shadow: 0 10px 20px -3px rgba(14, 165, 233, 0.4);
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.6);
    }
    .features {
      text-align: left;
      margin-top: 30px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 13.5px;
      color: #cbd5e1;
    }
    .tag {
      background: rgba(56, 189, 248, 0.15);
      color: #7dd3fc;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }
    .config-box {
      margin-top: 28px;
      background: rgba(11, 15, 25, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 22px;
      text-align: left;
    }
    .config-box h3 {
      font-size: 15px;
      color: #e2e8f0;
      margin-top: 0;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .input-group {
      margin-bottom: 16px;
    }
    .input-group label {
      display: block;
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .input-group input[type="text"], .input-group select {
      width: 100%;
      background: rgba(26, 34, 52, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      box-sizing: border-box;
    }
    .input-group input[type="text"]:focus, .input-group select:focus {
      outline: none;
      border-color: #38bdf8;
    }
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 16px;
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #64748b;
    }
    .stats-box {
      margin-top: 24px;
      background: rgba(11, 15, 25, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      text-align: left;
    }
    .stats-title {
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .stat-card {
      background: rgba(26, 34, 52, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 12px 8px;
      text-align: center;
    }
    .stat-val {
      font-size: 18px;
      font-weight: 800;
      color: #38bdf8;
    }
    .stat-lbl {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }
    @media (max-width: 500px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="overlay"></div>
  <div class="card">
    <img src="/icon.png" alt="NightKnight Logo" class="logo-img">
    <h1>NightKnight Cinema</h1>
    <div class="byline">Crafted by NightKnight</div>
    <div class="subtitle">The ultimate media hub: YouTube in-app playback & search, BYOA streaming hubs (Netflix, BBC iPlayer, ITVX, Channel 4, Disney+, Prime, Max), Curated Franchises, Critic Badges, Home Theater Audio/Video tags & intelligent stream speed ranking.</div>
    
    <a id="install-btn" href="stremio://${host}/manifest.json" class="btn">🚀 Install on Stremio</a>
    
    <div class="features">
      <div class="feature-item">
        <span class="tag">▶️ YouTube In-App</span>
        <span>Search & stream YouTube videos directly inside Stremio player (DRM-Free) + BYOA app links</span>
      </div>
      <div class="feature-item">
        <span class="tag">🇬🇧 UK & Global BYOA</span>
        <span>Instant launch links for BBC iPlayer, ITVX, Channel 4, My5, U/Dave, Sky Go, Prime & Disney+</span>
      </div>
      <div class="feature-item">
        <span class="tag">🎬 Official Trailers</span>
        <span>Watch official studio trailers directly inside Stremio before picking a title</span>
      </div>
      <div class="feature-item">
        <span class="tag">🍿 Curated Universes</span>
        <span>Marvel MCU, Star Wars, Harry Potter, LOTR, James Bond 007 & Studio Ghibli in viewing order</span>
      </div>
      <div class="feature-item">
        <span class="tag">⭐ Verified Ratings</span>
        <span>Real IMDb scores, TMDb ratings, and award / Oscar recognitions</span>
      </div>
      <div class="feature-item">
        <span class="tag">🔊 Home Cinema Tags</span>
        <span>Automatic Dolby Vision, HDR10+, Dolby Atmos, DTS-HD & IMAX stream tagging</span>
      </div>
      <div class="feature-item">
        <span class="tag">⚡ Speed Engine</span>
        <span>Ranks streams by seeders, size & CDN reliability — fastest streams first</span>
      </div>
      <div class="feature-item">
        <span class="tag">🎬 Actor Search</span>
        <span>Search any actor or director in Stremio for their complete filmography</span>
      </div>
    </div>

    <div class="config-box">
      <h3>⚙️ Personal Addon Configuration</h3>
      <div class="input-group">
        <label>Your Region (for Streaming Services / BYOA):</label>
        <select id="region-select">
          <option value="GB" ${initialRegion === 'GB' ? 'selected' : ''}>United Kingdom (BBC iPlayer, ITVX, Channel 4, My5, U, Sky Go, NOW)</option>
          <option value="US" ${initialRegion === 'US' ? 'selected' : ''}>United States (Hulu, Peacock, Max, Prime, Disney+)</option>
          <option value="CA" ${initialRegion === 'CA' ? 'selected' : ''}>Canada (Crave, CBC Gem, Prime, Disney+)</option>
          <option value="AU" ${initialRegion === 'AU' ? 'selected' : ''}>Australia (Stan, ABC iview, Binge, Disney+)</option>
          <option value="IE" ${initialRegion === 'IE' ? 'selected' : ''}>Ireland (RTÉ Player, Sky Go, NOW)</option>
        </select>
      </div>
      <div class="input-group">
        <label>Upstream Scraper (Default: Torrentio, or paste custom Real-Debrid / Scraper URL):</label>
        <input type="text" id="upstream-input" value="${initialUpstream}" placeholder="https://torrentio.strem.fun">
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="filter-buffer-risk" ${initialHideRisk ? 'checked' : ''}>
        <label for="filter-buffer-risk">Auto-hide high buffer risk streams (&lt; 10 seeders on huge files)</label>
      </div>
    </div>

    <div class="stats-box">
      <div class="stats-title">📊 Live Addon Statistics</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val" id="stat-installs">1</div>
          <div class="stat-lbl">Active Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="stat-manifests">-</div>
          <div class="stat-lbl">Manifest Hits</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="stat-streams">-</div>
          <div class="stat-lbl">Streams Served</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="stat-requests">-</div>
          <div class="stat-lbl">Total Requests</div>
        </div>
      </div>
    </div>

    <div class="footer">NightKnight Cinema • v${ADDON_VERSION}</div>
  </div>

  <script>
    function updateInstallLink() {
      const upstream = document.getElementById('upstream-input').value.trim() || 'https://torrentio.strem.fun';
      const region = document.getElementById('region-select').value;
      const hideRisk = document.getElementById('filter-buffer-risk').checked;

      const isDefault = upstream === 'https://torrentio.strem.fun' && region === 'GB' && !hideRisk;
      const host = window.location.host;

      let href = 'stremio://' + host + '/manifest.json';
      if (!isDefault) {
        const configJson = JSON.stringify({ upstream, region, hideRisk });
        // Base64URL encode
        const b64 = btoa(configJson).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
        href = 'stremio://' + host + '/' + b64 + '/manifest.json';
      }

      document.getElementById('install-btn').href = href;
    }

    document.getElementById('upstream-input').addEventListener('input', updateInstallLink);
    document.getElementById('region-select').addEventListener('change', updateInstallLink);
    document.getElementById('filter-buffer-risk').addEventListener('change', updateInstallLink);
    updateInstallLink();

    fetch('/api/stats')
      .then(r => r.json())
      .then(d => {
        if (d.estimatedInstalls !== undefined) document.getElementById('stat-installs').textContent = d.estimatedInstalls;
        if (d.manifestRequests !== undefined) document.getElementById('stat-manifests').textContent = d.manifestRequests.toLocaleString();
        if (d.streamRequests !== undefined) document.getElementById('stat-streams').textContent = d.streamRequests.toLocaleString();
        if (d.totalRequests !== undefined) document.getElementById('stat-requests').textContent = d.totalRequests.toLocaleString();
      })
      .catch(() => {});
  </script>
</body>
</html>
      `);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 NightKnight Cinema Addon (v${ADDON_VERSION}) running at http://${HOST}:${PORT}`);
  console.log(`👉 Stremio Install URL: stremio://${HOST}:${PORT}/manifest.json`);
});
