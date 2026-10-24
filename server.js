// NightKnight Cinema — Intelligent Stremio Addon
// Created by NightKnight
// Powered by The Movie Database (TMDb), Cinemeta & Intelligent Stream Speed Ranking
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseUrl } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.json');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '3157bd6dacbc3a653ae2e5a3b19beb20';
const PORT = process.env.PORT || 7000;
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

// Load Configuration
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
    prioritizeDebrid: true,
    filterHighBufferRisk: false
  };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing config.json:', e.message);
  }
}

let APP_CONFIG = loadConfig();

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
    version: '1.4.0',
    name: 'NightKnight Cinema',
    description: 'Created by NightKnight. The ultimate media hub: YouTube in-app playback & search, BYOA streaming hubs (Netflix, BBC iPlayer, ITVX, Channel 4, Disney+, Prime, Max), Curated Franchises, Critic Badges, Home Theater Audio/Video tags & intelligent zero-buffer stream ranking.',
    logo: `${baseUrl}/icon.png`,
    background: `${baseUrl}/background.png`,
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series', 'channel'],
    idPrefixes: ['tmdb:', 'tt', 'yt:'],
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
    released: date ? new Date(date).toISOString() : undefined,
    imdbRating: item.vote_average ? item.vote_average.toFixed(1) : undefined
  };
}

// YouTube Search & Video Scraper (Zero-Auth, DRM-Free & BYOA)
async function searchYouTube(query = 'Trending', skip = 0) {
  const cacheKey = `yt:search:${query}:${skip}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    const videos = [];

    for (const item of contents) {
      const vr = item.videoRenderer;
      if (vr && vr.videoId) {
        const title = vr.title?.runs?.[0]?.text || '';
        const channel = vr.ownerText?.runs?.[0]?.text || '';
        const thumbnail = vr.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
        const length = vr.lengthText?.simpleText || '';

        videos.push({
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
        });
      }
    }

    setCache(cacheKey, videos, 1800);
    return videos;
  } catch (e) {
    console.error('YouTube search error:', e.message);
    return [];
  }
}

// Fetch BYOA Streaming Platform Deep-Links & Official Trailer
async function fetchByoaStreams(type, tmdbId, title) {
  const cacheKey = `byoa:${type}:${tmdbId}`;
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

    // 2. BYOA Watch Providers (UK & Global)
    if (provRes?.results) {
      const gb = provRes.results.GB || {};
      const us = provRes.results.US || {};
      const allServices = [
        ...(gb.flatrate || []),
        ...(gb.free || []),
        ...(us.flatrate || []),
        ...(us.free || [])
      ];

      const seen = new Set();
      for (const p of allServices) {
        const name = p.provider_name;
        if (!name || seen.has(name)) continue;
        seen.add(name);

        let tag = '';
        let url = '';

        if (/bbc iplayer/i.test(name)) {
          tag = '🇬🇧 [BBC iPLAYER • FREE]';
          url = `https://www.bbc.co.uk/iplayer/search?q=${encodeURIComponent(title)}`;
        } else if (/itvx|itv/i.test(name)) {
          tag = '🇬🇧 [ITVX • FREE]';
          url = `https://www.itv.com/watch/search?q=${encodeURIComponent(title)}`;
        } else if (/channel 4/i.test(name)) {
          tag = '🇬🇧 [CHANNEL 4 • FREE]';
          url = `https://www.channel4.com/search?q=${encodeURIComponent(title)}`;
        } else if (/\b5\b|my5|five/i.test(name)) {
          tag = '🇬🇧 [MY5 • FREE]';
          url = `https://www.channel5.com/search?q=${encodeURIComponent(title)}`;
        } else if (/uktv|dave/i.test(name)) {
          tag = '🇬🇧 [U / DAVE • FREE]';
          url = `https://u.co.uk/search?q=${encodeURIComponent(title)}`;
        } else if (/sky go/i.test(name)) {
          tag = '🛰️ [SKY GO • BYOA]';
          url = `https://www.sky.com/watch/sky-go`;
        } else if (/now/i.test(name)) {
          tag = '🟣 [NOW • BYOA]';
          url = `https://www.nowtv.com/watch/search?q=${encodeURIComponent(title)}`;
        } else if (/britbox/i.test(name)) {
          tag = '🇬🇧 [BRITBOX • BYOA]';
          url = `https://www.britbox.co.uk/`;
        } else if (/discovery\+/i.test(name)) {
          tag = '🌍 [DISCOVERY+ • BYOA]';
          url = `https://www.discoveryplus.com/gb/search?q=${encodeURIComponent(title)}`;
        } else if (/disney/i.test(name)) {
          tag = '🏰 [DISNEY+ • BYOA]';
          url = `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`;
        } else if (/paramount/i.test(name)) {
          tag = '🏔️ [PARAMOUNT+ • BYOA]';
          url = `https://www.paramountplus.com/search/?q=${encodeURIComponent(title)}`;
        } else if (/prime|amazon/i.test(name)) {
          tag = '📦 [PRIME VIDEO • BYOA]';
          url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(title)}&i=instant-video`;
        } else if (/netflix/i.test(name)) {
          tag = '🔴 [NETFLIX • BYOA]';
          url = `https://www.netflix.com/search?q=${encodeURIComponent(title)}`;
        } else if (/apple tv/i.test(name)) {
          tag = '🍎 [APPLE TV+ • BYOA]';
          url = `https://tv.apple.com/search?term=${encodeURIComponent(title)}`;
        } else if (/hbo|max/i.test(name)) {
          tag = '🟣 [MAX • BYOA]';
          url = `https://play.max.com/search?q=${encodeURIComponent(title)}`;
        } else if (/hayu/i.test(name)) {
          tag = '💅 [HAYU • BYOA]';
          url = `https://www.hayu.com/`;
        } else if (/crunchyroll/i.test(name)) {
          tag = '🍜 [CRUNCHYROLL • BYOA]';
          url = `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`;
        }

        if (tag && url) {
          byoaStreams.push({
            name: `${tag}\nOfficial Stream`,
            title: `Watch "${title}" on ${name} with your account\n🔗 Opens official player / browser`,
            externalUrl: url
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
      with_keywords: '780|1701',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Cyberpunk') {
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
      with_keywords: '4565|10085',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Film-Noir') {
    const res = await fetchTmdb('/discover/movie', {
      with_genres: 80,
      with_keywords: '9840',
      sort_by: 'popularity.desc',
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

  // 2. Curated Franchises & Universes
  if (genre === 'Marvel (MCU)') {
    if (isMovie) {
      const res = await fetchTmdb('/discover/movie', {
        with_keywords: '180547',
        sort_by: 'primary_release_date.desc',
        page: tmdbPage
      });
      return (res.results || []).map(item => formatMetaPreview(item, 'movie'));
    } else {
      const res = await fetchTmdb('/discover/tv', {
        with_keywords: '180547',
        sort_by: 'popularity.desc',
        page: tmdbPage
      });
      return (res.results || []).map(item => formatMetaPreview(item, 'series'));
    }
  }

  if (genre === 'Star Wars Saga') {
    const res = await fetchTmdb(`/discover/${isMovie ? 'movie' : 'tv'}`, {
      with_companies: '1',
      sort_by: 'popularity.desc',
      page: tmdbPage
    });
    return (res.results || []).map(item => formatMetaPreview(item, type));
  }

  if (genre === 'Harry Potter' && isMovie) {
    const col = await fetchTmdb('/collection/1241');
    const fbCol = await fetchTmdb('/collection/435634').catch(() => null);
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
    const parts = (col.parts || []).sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
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
    return {
      id: `yt:${videoId}`,
      type: 'channel',
      name: 'YouTube Video',
      poster: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      background: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      description: '▶️ Watch directly inside Stremio player (DRM-Free) or launch in the YouTube app with your Google account (BYOA).',
      behaviorHints: {
        defaultVideoId: `yt:${videoId}`
      }
    };
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
        const cinRes = await fetch(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`);
        if (cinRes.ok) cinData = await cinRes.json();
      } catch (e) {}
    }

    const imdbScore = cinData?.meta?.imdbRating || (data.vote_average ? data.vote_average.toFixed(1) : null);
    const tmdbPercent = data.vote_average ? Math.round(data.vote_average * 10) : null;
    const awardsText = cinData?.meta?.awards;

    const badges = [];
    if (imdbScore) badges.push(`⭐ IMDb: ${imdbScore}/10`);
    if (tmdbPercent) badges.push(`🍅 TMDb: ${tmdbPercent}% (${(data.vote_count || 0).toLocaleString()} votes)`);
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
      imdbRating: imdbScore || (data.vote_average ? data.vote_average.toFixed(1) : undefined),
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
        const cinRes = await fetch(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
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

    const imdbScore = cinData?.meta?.imdbRating || (data.vote_average ? data.vote_average.toFixed(1) : null);
    const tmdbPercent = data.vote_average ? Math.round(data.vote_average * 10) : null;
    const awardsText = cinData?.meta?.awards;

    const badges = [];
    if (imdbScore) badges.push(`⭐ IMDb: ${imdbScore}/10`);
    if (tmdbPercent) badges.push(`🍅 TMDb: ${tmdbPercent}% (${(data.vote_count || 0).toLocaleString()} votes)`);
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
      imdbRating: imdbScore || (data.vote_average ? data.vote_average.toFixed(1) : undefined),
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
  if (/dolby\s*vision|\bdv\b/i.test(text)) video.push('✨ DV');
  if (/hdr10\+/i.test(text)) video.push('🌈 HDR10+');
  else if (/hdr10|\bhdr\b/i.test(text)) video.push('🌈 HDR');
  if (/10bit|10-bit/i.test(text)) video.push('10-bit');
  if (/remux/i.test(text)) video.push('💎 Remux');

  // Editions
  if (/imax/i.test(text)) edition.push('🎞️ IMAX');
  if (/director'?s\s*cut/i.test(text)) edition.push('🎬 Director\'s Cut');
  else if (/extended/i.test(text)) edition.push('🎬 Extended');

  return { audio, video, edition };
}

function optimizeAndRankStreams(rawStreams) {
  if (!Array.isArray(rawStreams) || rawStreams.length === 0) return [];

  const parsed = [];
  for (const s of rawStreams) {
    const title = s.title || '';
    const name = s.name || '';
    const filename = s.behaviorHints?.filename || '';

    // Check for Debrid Cached Streams (Real-Debrid, AllDebrid, TorBox, Premiumize)
    const isDebrid = /\[(RD|AD|TB|PM)\+?\]/i.test(name) || /\[(RD|AD|TB|PM)\+?\]/i.test(title);

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
    let quality = '1080p';
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
    }

    const isHdr = /HDR/i.test(name) || /HDR/i.test(title);
    const isDv = /DV|Dolby Vision/i.test(name) || /DV|Dolby Vision/i.test(title);

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
      recommendation = '⚡ Real-Debrid High-Speed Cloud Stream';
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
        const qualityWeight = is4k ? 1.2 : (is1080p ? 1.0 : 0.8);
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

    const qualityLabel = `${quality}${isDv ? ' DV' : ''}${isHdr ? ' HDR' : ''}`;
    const cleanAddonName = s.name.replace(/^Torrentio\n?/i, '').replace(/^\[[^\]]+\]\s*/, '').trim() || qualityLabel;

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

  if (APP_CONFIG.filterHighBufferRisk) {
    activeStreams = activeStreams.filter(s => !s._isBufferRisk);
  }

  activeStreams.sort((a, b) => b._speedScore - a._speedScore);

  return activeStreams.map(({ _speedScore, _seeders, _isDead, _isBufferRisk, ...clean }) => clean);
}

// Handle Streams Request
async function handleStream(type, id) {
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

  const cacheKey = `stream:${type}:${id}`;
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
      byoaStreams = await fetchByoaStreams(type, tmdbTargetId, targetTitle || 'Title');
    }

    if (!imdbTarget) return byoaStreams;

    const scraperBase = (APP_CONFIG.upstreamScraper || 'https://torrentio.strem.fun').replace(/\/$/, '');
    const upstreamUrl = `${scraperBase}/stream/${type}/${imdbTarget}.json`;

    let rawStreams = [];
    try {
      const res = await fetch(upstreamUrl, {
        headers: { 'User-Agent': 'Stremio/4.4.168' },
        signal: AbortSignal.timeout(6500)
      });
      if (res.ok) {
        const data = await res.json();
        rawStreams = data.streams || [];
      }
    } catch (e) {
      // Scraper fallback if blocked or unreachable
    }

    const optimized = optimizeAndRankStreams(rawStreams);
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
  const pathname = decodeURIComponent(parsedUrl.pathname || '/');

  // Compute dynamic baseUrl from request headers
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || `${HOST}:${PORT}`;
  const baseUrl = `${proto}://${host}`;

  try {
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

    // 1. Manifest
    if (pathname === '/manifest.json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(getManifest(baseUrl)));
      return;
    }

    // 2. Streams: /stream/:type/:id.json
    const streamMatch = pathname.match(/^\/stream\/(movie|series|channel)\/([^\/]+)\.json$/);
    if (streamMatch) {
      const [, type, id] = streamMatch;
      const streams = await handleStream(type, id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ streams }));
      return;
    }

    // 3. Catalog: /catalog/:type/:id/:extra?.json
    const catalogMatch = pathname.match(/^\/catalog\/(movie|series|channel)\/([^\/]+)(?:\/(.+))?\.json$/);
    if (catalogMatch) {
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
        const query = extra.search || (extra.genre ? `${extra.genre} videos` : 'Trending');
        const metas = await searchYouTube(query, skip);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metas }));
        return;
      }

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
      const [, type, id] = metaMatch;
      const meta = await handleMeta(type, id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ meta }));
      return;
    }

    // 5. Config API endpoint
    if (pathname === '/api/config' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const newConfig = JSON.parse(body);
          if (newConfig.upstreamScraper) {
            APP_CONFIG.upstreamScraper = newConfig.upstreamScraper;
          }
          APP_CONFIG.filterHighBufferRisk = !!newConfig.filterHighBufferRisk;
          saveConfig(APP_CONFIG);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, config: APP_CONFIG }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // 6. Landing / Configuration Web Page
    if (pathname === '/' || pathname === '/configure') {
      const stremioUrl = `stremio://${host}/manifest.json`;

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
    .input-group input[type="text"] {
      width: 100%;
      background: rgba(26, 34, 52, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      box-sizing: border-box;
    }
    .input-group input[type="text"]:focus {
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
    .save-btn {
      background: rgba(56, 189, 248, 0.18);
      color: #7dd3fc;
      border: 1px solid rgba(56, 189, 248, 0.4);
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .save-btn:hover {
      background: rgba(56, 189, 248, 0.3);
      color: #ffffff;
    }
    #save-msg {
      font-size: 12px;
      color: #34d399;
      margin-left: 10px;
      display: none;
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="overlay"></div>
  <div class="card">
    <img src="/icon.png" alt="NightKnight Logo" class="logo-img">
    <h1>NightKnight Cinema</h1>
    <div class="byline">Crafted by NightKnight</div>
    <div class="subtitle">The ultimate media hub: YouTube in-app playback & search, BYOA streaming hubs (Netflix, BBC iPlayer, ITVX, Channel 4, Disney+, Prime, Max), Curated Franchises, Critic Badges, Home Theater Audio/Video tags & intelligent zero-buffer stream ranking.</div>
    
    <a href="${stremioUrl}" class="btn">🚀 Install on Stremio</a>
    
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
        <span>Marvel MCU, Star Wars, Harry Potter, LOTR, James Bond 007 & Studio Ghibli</span>
      </div>
      <div class="feature-item">
        <span class="tag">🍅 Critic Badges</span>
        <span>IMDb, TMDb score percentages, and award / Oscar recognitions</span>
      </div>
      <div class="feature-item">
        <span class="tag">🔊 Home Cinema Tags</span>
        <span>Automatic Dolby Vision, HDR10+, Dolby Atmos, DTS-HD & IMAX stream tagging</span>
      </div>
      <div class="feature-item">
        <span class="tag">⚡ Speed Engine</span>
        <span>Ranks streams by seeders, size & CDN reliability — fastest streams first</span>
      </div>
    </div>
      <div class="feature-item">
        <span class="tag">🎬 Actor Search</span>
        <span>Search any actor or director in Stremio for their complete filmography</span>
      </div>
    </div>

    <div class="config-box">
      <h3>⚙️ Stream Optimization Settings</h3>
      <div class="input-group">
        <label>Upstream Scraper (Default: Torrentio, or paste custom Real-Debrid / Scraper URL):</label>
        <input type="text" id="upstream-input" value="${APP_CONFIG.upstreamScraper || 'https://torrentio.strem.fun'}" placeholder="https://torrentio.strem.fun">
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="filter-buffer-risk" ${APP_CONFIG.filterHighBufferRisk ? 'checked' : ''}>
        <label for="filter-buffer-risk">Auto-hide high buffer risk streams (&lt; 10 seeders on huge files)</label>
      </div>
      <button class="save-btn" onclick="saveSettings()">Save Configuration</button>
      <span id="save-msg">✓ Saved!</span>
    </div>

    <div class="footer">NightKnight Cinema • Open Stremio Addon Protocol v1.2.0</div>
  </div>

  <script>
    async function saveSettings() {
      const upstream = document.getElementById('upstream-input').value.trim() || 'https://torrentio.strem.fun';
      const filterRisk = document.getElementById('filter-buffer-risk').checked;
      
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upstreamScraper: upstream, filterHighBufferRisk: filterRisk })
      });
      if (res.ok) {
        const msg = document.getElementById('save-msg');
        msg.style.display = 'inline';
        setTimeout(() => msg.style.display = 'none', 3000);
      }
    }
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
  console.log(`🚀 NightKnight Cinema Addon running at http://${HOST}:${PORT}`);
  console.log(`👉 Stremio Install URL: stremio://${HOST}:${PORT}/manifest.json`);
});
