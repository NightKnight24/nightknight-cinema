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

const ADDON_VERSION = '1.6.0';

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
// REGIONAL LIVE TV CHANNELS (100% Legal, Unencrypted & DRM-Free)
// Filtered dynamically by user's selected region.
// -------------------------------------------------------------
const REGIONAL_CHANNELS = {
  GB: [
    {
      id: 'tv:gb_gbnews',
      name: 'GB News HD',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/35/GB_News_Logo.svg/512px-GB_News_Logo.svg.png',
      background: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1280&q=80',
      genres: ['News & Info', 'United Kingdom', 'Live TV'],
      streamUrl: 'https://amg01076-lightningintern-gbnewsau-samsungau-et7fz.amagi.tv/playlist/amg01076-lightningintern-gbnewsau-samsungau/playlist.m3u8',
      summary: '24/7 UK national television news, opinion, and analysis channel featuring debate and current affairs.',
      network: 'GB News',
      guideSchedule: [
        { time: '06:00', title: 'Breakfast with Eamonn & Isabel', desc: 'Kickstart your morning with news, debate, weather and entertainment.' },
        { time: '09:30', title: "Britain's Newsroom", desc: 'Top national stories, politics, and consumer issues with live interviews.' },
        { time: '12:00', title: 'Live Desk UK', desc: 'Breaking news coverage from London and Westminster.' },
        { time: '15:00', title: 'The Afternoon Edition', desc: 'Panel analysis, economic updates, and cultural perspectives.' },
        { time: '18:00', title: 'Dewbs & Co.', desc: 'Bold opinion and lively debate on the day’s biggest controversies.' },
        { time: '19:00', title: 'State of the Nation', desc: 'In-depth political scrutiny and interviews with MPs.' },
        { time: '20:00', title: 'Farage at Eight', desc: 'Hard-hitting political commentary and viewer interaction.' },
        { time: '21:00', title: 'Patrick Christys Tonight', desc: 'Late night discussion, exclusive interviews, and public reaction.' },
        { time: '23:00', title: 'Headliners & Overnight News', desc: 'Comedians review the next morning papers and overnight bulletins.' }
      ]
    },
    {
      id: 'tv:gb_great_movies',
      name: 'GREAT! Movies HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Great%21_Movies_logo_2021.svg/512px-Great%21_Movies_logo_2021.svg.png',
      background: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&q=80',
      genres: ['Entertainment', 'Movies & Drama', 'Live TV'],
      streamUrl: 'https://amg01753-narrativeuk-amg01753c3-lg-gb-1833.playouts.now.amagi.tv/playlist/amg01753-narrativeuk-greatmovies-lggb/playlist.m3u8',
      summary: 'The UK home of movie entertainment, showcasing Hollywood blockbusters, action hits, thrillers and award-winning dramas.',
      network: 'GREAT! movies',
      guideSchedule: [
        { time: '07:00', title: 'Morning Cinema Matinee', desc: 'Classic adventure and family drama to start the day.' },
        { time: '11:00', title: 'Action Showcase', desc: 'High-octane Hollywood thrills and detective mysteries.' },
        { time: '14:30', title: 'Afternoon Movie Spotlight', desc: 'Critically acclaimed dramas and heartwarming stories.' },
        { time: '18:00', title: 'Prime Time Feature Presentation', desc: 'Star-studded Hollywood blockbuster movie.' },
        { time: '21:00', title: 'GREAT! Nightcap Thriller', desc: 'Pulse-pounding crime, suspense, and thriller cinema.' },
        { time: '23:30', title: 'Late Night Cult Cinema', desc: 'Cult favorites, sci-fi, and midnight movies.' }
      ]
    },
    {
      id: 'tv:gb_great_romance',
      name: 'GREAT! Romance & Drama HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Great%21_Romance_logo.svg/512px-Great%21_Romance_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1280&q=80',
      genres: ['Entertainment', 'Movies & Drama', 'Live TV'],
      streamUrl: 'https://amg01753-narrativeuk-amg01753c2-lg-gb-1832.playouts.now.amagi.tv/playlist/amg01753-narrativeuk-greatchristmas-lggb/playlist.m3u8',
      summary: 'Heartwarming stories, romantic comedies, modern romances, and touching dramatic feature films.',
      network: 'GREAT! romance',
      guideSchedule: [
        { time: '08:00', title: 'Morning Romance', desc: 'Uplifting romantic comedies and feel-good stories.' },
        { time: '12:00', title: 'Midday Drama Showcase', desc: 'Emotionally gripping feature-length dramas.' },
        { time: '16:00', title: 'Love & Laughter Matinee', desc: 'Delightful romantic mix of humor and heart.' },
        { time: '19:00', title: 'Prime Romance Premiere', desc: 'Premiere romantic feature film with stellar cast.' },
        { time: '21:30', title: 'Heartfelt Evening Film', desc: 'Classic relationship dramas and inspirational journeys.' }
      ]
    },
    {
      id: 'tv:gb_cnbc_uk',
      name: 'CNBC UK & Europe HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/CNBC_logo.svg/512px-CNBC_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1280&q=80',
      genres: ['News & Info', 'United Kingdom', 'Live TV'],
      streamUrl: 'https://amg01079-nbcuuk-amg01079c2-samsung-gb-1258.playouts.now.amagi.tv/playlist.m3u8',
      summary: 'Real-time financial markets, global business headlines, stock market movements, and economic analysis direct from London.',
      network: 'CNBC',
      guideSchedule: [
        { time: '06:00', title: 'Capital Connection', desc: 'Connecting the trading day from Asia to Europe.' },
        { time: '07:00', title: 'Squawk Box Europe', desc: 'The flagship European pre-market business news show.' },
        { time: '10:00', title: 'Street Signs Europe', desc: 'Tracking European stocks, currencies, and bonds.' },
        { time: '12:00', title: 'Worldwide Exchange', desc: 'Global economic overview before the US market open.' },
        { time: '14:00', title: 'Squawk on the Street', desc: 'Live from the New York Stock Exchange floor.' },
        { time: '17:00', title: 'Closing Bell Europe', desc: 'Wrap-up of the day’s European market trading session.' },
        { time: '19:00', title: 'Fast Money & Mad Money', desc: 'Actionable stock ideas and Wall Street analysis.' },
        { time: '22:00', title: 'Overnight Global Markets', desc: 'Asian market previews and overnight futures.' }
      ]
    },
    {
      id: 'tv:gb_dw_english',
      name: 'DW English HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_symbol_2012.svg/512px-Deutsche_Welle_symbol_2012.svg.png',
      background: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&q=80',
      genres: ['News & Info', 'Culture & Docs', 'Live TV'],
      streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
      summary: 'International news and in-depth documentaries covering European politics, culture, climate, and world events.',
      network: 'DW',
      guideSchedule: [
        { time: '07:00', title: 'DW News Asia-Europe', desc: 'International headlines and live correspondents.' },
        { time: '10:00', title: 'Global 3000: The Globalization Program', desc: 'Exploring the impact of globalization on society.' },
        { time: '13:00', title: 'DW News Live', desc: 'Comprehensive global news and investigative reporting.' },
        { time: '16:00', title: 'Eco Africa & Shift Tech', desc: 'Innovative sustainability and technological advances.' },
        { time: '19:00', title: 'DW News at Seven', desc: 'Prime European perspectives on global affairs.' },
        { time: '21:00', title: 'Documentary: European Horizons', desc: 'Award-winning investigative documentaries.' }
      ]
    },
    {
      id: 'tv:gb_redbull',
      name: 'Red Bull TV HD',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1280&q=80',
      genres: ['Sports & Action', 'Culture & Docs', 'Live TV'],
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
      summary: 'Action sports, extreme events, music festivals, live downhill racing, Formula 1 documentaries, and global adventure.',
      network: 'Red Bull TV',
      guideSchedule: [
        { time: '08:00', title: 'Morning Shred: Surf & Snow', desc: 'Epic waves and mountain freeride action from around the globe.' },
        { time: '12:00', title: 'UCI Mountain Bike World Cup Rewind', desc: 'Downhill mountain bike finals and highlights.' },
        { time: '15:00', title: 'F1 & Rally Motorsports Access', desc: 'Behind the scenes with championship racing teams.' },
        { time: '18:00', title: 'Red Bull Rampage: Extreme Freeride', desc: 'Legendary cliffs and desert drops in Utah.' },
        { time: '21:00', title: 'The Way of the Wildcard (Documentary)', desc: 'Inspiring journey of unconventional athletes.' }
      ]
    },
    {
      id: 'tv:gb_nasa',
      name: 'NASA TV HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/512px-NASA_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80',
      genres: ['Culture & Docs', 'FAST & Classic TV', 'Live TV'],
      streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
      summary: 'Live broadcasts from the International Space Station, rocket launches, spacewalks, astronaut interviews, and deep space exploration.',
      network: 'NASA TV',
      guideSchedule: [
        { time: '08:00', title: 'ISS Live Orbit: High Definition Earth Views', desc: 'Streaming real-time HD views of Earth from the space station.' },
        { time: '11:00', title: 'Space Station Crew Operations', desc: 'Astronauts conduct microgravity experiments aboard the ISS.' },
        { time: '14:00', title: 'NASA ScienceCast & Mission Briefings', desc: 'Discoveries from the James Webb and Hubble Space Telescopes.' },
        { time: '17:00', title: 'Artemis Moon Mission Update', desc: 'Humanity returns to the Moon: hardware tests and launch countdowns.' },
        { time: '20:00', title: 'Cosmic Journeys: Mars & Beyond', desc: 'Robotic exploration across the solar system.' }
      ]
    }
  ],
  US: [
    {
      id: 'tv:us_abc_live',
      name: 'ABC News Live HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/ABC_News_Live_logo_2021.svg/512px-ABC_News_Live_logo_2021.svg.png',
      background: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1280&q=80',
      genres: ['News & Info', 'United States', 'Live TV'],
      streamUrl: 'https://amg01942-amg01942c6-stirr-us-10178.playouts.now.amagi.tv/playlist.m3u8',
      summary: '24/7 streaming news channel from ABC News featuring live breaking news, context, in-depth analysis, and award-winning journalism.',
      network: 'ABC News',
      guideSchedule: [
        { time: '07:00', title: 'ABC News Live Morning', desc: 'The morning’s top stories, national weather, and market preview.' },
        { time: '09:00', title: 'The Breakdown with Linsey Davis', desc: 'Contextual analysis of the biggest legal and political stories.' },
        { time: '12:00', title: 'Midday Briefing', desc: 'Live correspondents reporting on fast-breaking events.' },
        { time: '15:00', title: 'Your Voice Your Vote: Washington Watch', desc: 'Congressional updates, White House briefings, and policy debate.' },
        { time: '19:00', title: 'ABC News Live Prime', desc: 'The flagship evening newscast with anchor Linsey Davis.' },
        { time: '21:00', title: 'Nightline Focus', desc: 'Deep dive investigative reporting and human interest features.' }
      ]
    },
    {
      id: 'tv:us_nasa',
      name: 'NASA TV HD (Public & Media)',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/512px-NASA_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80',
      genres: ['Culture & Docs', 'FAST & Classic TV', 'Live TV'],
      streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
      summary: 'Live astronaut broadcasts from the International Space Station, rocket tests, Artemis moon missions, and astronomical breakthroughs.',
      network: 'NASA TV',
      guideSchedule: [
        { time: '08:00', title: 'ISS Live Orbit: High Definition Earth Views', desc: 'Streaming real-time HD views of Earth from the space station.' },
        { time: '11:00', title: 'Space Station Crew Operations', desc: 'Astronauts conduct microgravity experiments aboard the ISS.' },
        { time: '14:00', title: 'NASA ScienceCast & Mission Briefings', desc: 'Discoveries from the James Webb and Hubble Space Telescopes.' },
        { time: '17:00', title: 'Artemis Moon Mission Update', desc: 'Humanity returns to the Moon: hardware tests and launch countdowns.' },
        { time: '20:00', title: 'Cosmic Journeys: Mars & Beyond', desc: 'Robotic exploration across the solar system.' }
      ]
    },
    {
      id: 'tv:us_redbull',
      name: 'Red Bull TV HD',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1280&q=80',
      genres: ['Sports & Action', 'Culture & Docs', 'Live TV'],
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
      summary: 'Extreme action sports, live world cup events, motorsports, skateboarding, surfing, and original adventure documentaries.',
      network: 'Red Bull TV',
      guideSchedule: [
        { time: '08:00', title: 'Morning Shred: Surf & Snow', desc: 'Epic waves and mountain freeride action from around the globe.' },
        { time: '12:00', title: 'UCI Mountain Bike World Cup Rewind', desc: 'Downhill mountain bike finals and highlights.' },
        { time: '15:00', title: 'F1 & Rally Motorsports Access', desc: 'Behind the scenes with championship racing teams.' },
        { time: '18:00', title: 'Red Bull Rampage: Extreme Freeride', desc: 'Legendary cliffs and desert drops in Utah.' },
        { time: '21:00', title: 'The Way of the Wildcard (Documentary)', desc: 'Inspiring journey of unconventional athletes.' }
      ]
    },
    {
      id: 'tv:us_dw',
      name: 'DW News Live US HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_symbol_2012.svg/512px-Deutsche_Welle_symbol_2012.svg.png',
      background: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&q=80',
      genres: ['News & Info', 'Culture & Docs', 'Live TV'],
      streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
      summary: 'Global 24/7 news broadcaster providing international perspective, geopolitical context, and investigative features.',
      network: 'DW',
      guideSchedule: [
        { time: '07:00', title: 'DW News Asia-Europe', desc: 'International headlines and live correspondents.' },
        { time: '10:00', title: 'Global 3000: The Globalization Program', desc: 'Exploring the impact of globalization on society.' },
        { time: '13:00', title: 'DW News Live', desc: 'Comprehensive global news and investigative reporting.' },
        { time: '16:00', title: 'Eco Africa & Shift Tech', desc: 'Innovative sustainability and technological advances.' },
        { time: '19:00', title: 'DW News at Seven', desc: 'Prime European perspectives on global affairs.' },
        { time: '21:00', title: 'Documentary: European Horizons', desc: 'Award-winning investigative documentaries.' }
      ]
    },
    {
      id: 'tv:us_classic_movies',
      name: '30A Classic Movie Channel',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Film_strip.svg/512px-Film_strip.svg.png',
      background: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&q=80',
      genres: ['Entertainment', 'FAST & Classic TV', 'Live TV'],
      streamUrl: 'https://30a-tv.com/feeds/pzaz/30atvmovies.m3u8',
      summary: '24/7 vintage Hollywood cinema: Golden Age screwball comedies, film noir, westerns, and vintage sci-fi.',
      network: '30A TV',
      guideSchedule: [
        { time: '08:00', title: 'Morning Matinee Comedy', desc: 'Classic screwball and slapstick comedies from the golden era.' },
        { time: '12:00', title: 'Classic Westerns on High Noon', desc: 'Cowboys, outlaws, and showdowns of the American frontier.' },
        { time: '16:00', title: 'Vintage Mystery Hour', desc: 'Detectives, noir whodunits, and crime capers.' },
        { time: '20:00', title: 'Prime Classic Hollywood Feature', desc: 'Unforgettable cinema legends in iconic roles.' },
        { time: '23:00', title: 'Creature Feature Midnight Movie', desc: 'Retro monster and sci-fi drive-in classics.' }
      ]
    }
  ],
  CA: [
    {
      id: 'tv:ca_cbc_news',
      name: 'CBC News Network HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/CBC_Logo_1992-Present.svg/512px-CBC_Logo_1992-Present.svg.png',
      background: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1280&q=80',
      genres: ['News & Info', 'Canada', 'Live TV'],
      streamUrl: 'https://d2ny9lo79ujali.cloudfront.net/CBC_News_International.m3u8',
      summary: 'Canada’s premier news source delivering live Canadian news, national politics from Ottawa, and international reporting.',
      network: 'CBC News',
      guideSchedule: [
        { time: '06:00', title: 'CBC Morning Live', desc: 'Comprehensive Canadian morning news with live coast-to-coast reports.' },
        { time: '09:00', title: 'CBC News Now', desc: 'Real-time breaking stories, market movements, and weather.' },
        { time: '13:00', title: 'CBC News Today', desc: 'National discussions on healthcare, economy, and culture.' },
        { time: '17:00', title: 'Power & Politics', desc: 'Canada’s leading daily political show hosted from Parliament Hill.' },
        { time: '21:00', title: 'The National', desc: 'CBC flagship nightly newscast with chief correspondent Adrienne Arsenault.' }
      ]
    },
    {
      id: 'tv:ca_citynews_toronto',
      name: 'CityNews Toronto HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Citytv_logo.svg/512px-Citytv_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=1280&q=80',
      genres: ['News & Info', 'Canada', 'Live TV'],
      streamUrl: 'https://citynewsregional.akamaized.net/hls/live/1024052/Regional_Live_7/master.m3u8',
      summary: 'Toronto and Greater Ontario’s live local news, traffic, weather, sports, and community coverage.',
      network: 'CityNews',
      guideSchedule: [
        { time: '06:00', title: 'Breakfast Television Live', desc: 'GTA’s top morning show with news, weather, and traffic.' },
        { time: '09:00', title: 'CityNews at 9', desc: 'Local breaking news across Toronto and southern Ontario.' },
        { time: '12:00', title: 'CityNews at Noon', desc: 'Midday municipal politics, crime, and weather updates.' },
        { time: '17:00', title: 'CityNews at 5 & 6', desc: 'The comprehensive evening regional broadcast.' },
        { time: '23:00', title: 'CityNews Tonight', desc: 'Late night wrap of local stories and sports.' }
      ]
    },
    {
      id: 'tv:ca_nasa',
      name: 'NASA TV HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/512px-NASA_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80',
      genres: ['Culture & Docs', 'FAST & Classic TV', 'Live TV'],
      streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
      summary: 'Live astronaut broadcasts from the International Space Station, rocket tests, Artemis moon missions, and astronomical breakthroughs.',
      network: 'NASA TV',
      guideSchedule: [
        { time: '08:00', title: 'ISS Live Orbit: High Definition Earth Views', desc: 'Streaming real-time HD views of Earth from the space station.' },
        { time: '11:00', title: 'Space Station Crew Operations', desc: 'Astronauts conduct microgravity experiments aboard the ISS.' },
        { time: '14:00', title: 'NASA ScienceCast & Mission Briefings', desc: 'Discoveries from the James Webb and Hubble Space Telescopes.' },
        { time: '17:00', title: 'Artemis Moon Mission Update', desc: 'Humanity returns to the Moon: hardware tests and launch countdowns.' },
        { time: '20:00', title: 'Cosmic Journeys: Mars & Beyond', desc: 'Robotic exploration across the solar system.' }
      ]
    },
    {
      id: 'tv:ca_redbull',
      name: 'Red Bull TV HD',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1280&q=80',
      genres: ['Sports & Action', 'Culture & Docs', 'Live TV'],
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
      summary: 'Extreme action sports, live world cup events, motorsports, skateboarding, surfing, and original adventure documentaries.',
      network: 'Red Bull TV',
      guideSchedule: [
        { time: '08:00', title: 'Morning Shred: Surf & Snow', desc: 'Epic waves and mountain freeride action from around the globe.' },
        { time: '12:00', title: 'UCI Mountain Bike World Cup Rewind', desc: 'Downhill mountain bike finals and highlights.' },
        { time: '15:00', title: 'F1 & Rally Motorsports Access', desc: 'Behind the scenes with championship racing teams.' },
        { time: '18:00', title: 'Red Bull Rampage: Extreme Freeride', desc: 'Legendary cliffs and desert drops in Utah.' },
        { time: '21:00', title: 'The Way of the Wildcard (Documentary)', desc: 'Inspiring journey of unconventional athletes.' }
      ]
    }
  ],
  AU: [
    {
      id: 'tv:au_abc_news',
      name: 'ABC News Australia HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/ABC_News_Australia_logo_2017.svg/512px-ABC_News_Australia_logo_2017.svg.png',
      background: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1280&q=80',
      genres: ['News & Info', 'Australia', 'Live TV'],
      streamUrl: 'https://abc-news-dmd-streams-1.akamaized.net/out/v1/701126012d044971b3fa89406a440133/index.m3u8',
      summary: 'Australia’s continuous television news service broadcasting live news bulletins, national politics, and Asia-Pacific regional analysis.',
      network: 'ABC News AU',
      guideSchedule: [
        { time: '06:00', title: 'ABC News Breakfast', desc: 'National news, finance, sport, and weather across Australia.' },
        { time: '09:00', title: 'Mornings with Joe O’Brien', desc: 'Live breaking news and parliamentary question time analysis.' },
        { time: '12:00', title: 'ABC News at Noon', desc: 'The day’s top national and global headlines.' },
        { time: '16:00', title: 'Afternoon Live with Patricia Karvelas', desc: 'Unpacking political developments from Canberra.' },
        { time: '19:00', title: 'ABC 7PM News', desc: 'Flagship national evening bulletin with state coverage.' },
        { time: '21:00', title: 'The World with Beverley O’Connor', desc: 'In-depth international news with a focus on the Indo-Pacific.' }
      ]
    },
    {
      id: 'tv:au_news24',
      name: 'Sky News / News24 Australia HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Sky_News_Australia_logo_2015.svg/512px-Sky_News_Australia_logo_2015.svg.png',
      background: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=1280&q=80',
      genres: ['News & Info', 'Australia', 'Live TV'],
      streamUrl: 'https://skynewsau-live-premium.akamaized.net/hls/live/2105299/skynews/live.m3u8',
      summary: '24/7 breaking news and opinion from across Australia, including political analysis, business, and national debate.',
      network: 'Sky News AU',
      guideSchedule: [
        { time: '06:00', title: 'First Edition Australia', desc: 'Early morning political briefing and national headlines.' },
        { time: '09:00', title: 'AM Agenda', desc: 'The morning political agenda live from Parliament House.' },
        { time: '14:00', title: 'Afternoon Agenda', desc: 'Key ministers and commentators debate federal policy.' },
        { time: '18:00', title: 'Credlin', desc: 'Peta Credlin provides sharp political analysis of national affairs.' },
        { time: '20:00', title: 'Paul Murray Live', desc: 'Australia’s popular evening opinion program with guest panels.' }
      ]
    },
    {
      id: 'tv:au_moviesphere',
      name: 'MovieSphere Australia HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Film_strip.svg/512px-Film_strip.svg.png',
      background: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&q=80',
      genres: ['Entertainment', 'Movies & Drama', 'Live TV'],
      streamUrl: 'https://amg00353-lionsgatefilmsi-moviesphereaus-samsungau-7qzhf.amagi.tv/playlist/amg00353-lionsgatefilmsi-moviesphereaus-samsungau/playlist.m3u8',
      summary: 'Hollywood studio movies, hit thrillers, star-studded comedies, and acclaimed dramas streaming 24/7.',
      network: 'MovieSphere',
      guideSchedule: [
        { time: '08:00', title: 'Morning Action Block', desc: 'High adrenaline movies and pulse-pounding adventures.' },
        { time: '12:00', title: 'Midday Drama Showcase', desc: 'Award-winning performances and cinematic stories.' },
        { time: '16:00', title: 'Comedy Matinee', desc: 'Laugh-out-loud Hollywood studio comedies.' },
        { time: '19:30', title: 'MovieSphere Prime Feature', desc: 'Top tier studio blockbuster presentation.' },
        { time: '22:30', title: 'Late Night Thriller Vault', desc: 'Suspenseful psychological and crime thrillers.' }
      ]
    },
    {
      id: 'tv:au_redbull',
      name: 'Red Bull TV HD',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1280&q=80',
      genres: ['Sports & Action', 'Culture & Docs', 'Live TV'],
      streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
      summary: 'Extreme action sports, live world cup events, motorsports, surfing, and original adventure documentaries.',
      network: 'Red Bull TV',
      guideSchedule: [
        { time: '08:00', title: 'Morning Shred: Surf & Snow', desc: 'Epic waves and mountain freeride action from around the globe.' },
        { time: '12:00', title: 'UCI Mountain Bike World Cup Rewind', desc: 'Downhill mountain bike finals and highlights.' },
        { time: '15:00', title: 'F1 & Rally Motorsports Access', desc: 'Behind the scenes with championship racing teams.' },
        { time: '18:00', title: 'Red Bull Rampage: Extreme Freeride', desc: 'Legendary cliffs and desert drops in Utah.' },
        { time: '21:00', title: 'The Way of the Wildcard (Documentary)', desc: 'Inspiring journey of unconventional athletes.' }
      ]
    }
  ],
  IE: [
    {
      id: 'tv:ie_sky_news',
      name: 'Sky News HD (Ireland & UK)',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Sky_News_2021.svg/512px-Sky_News_2021.svg.png',
      background: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1280&q=80',
      genres: ['News & Info', 'Ireland', 'Live TV'],
      streamUrl: 'https://distro001-gb-hls1-prd.delivery.skycdp.com/easel_cdn/ngrp:weather_loop.stream_all/playlist.m3u8',
      backupUrl: 'https://amg01076-lightningintern-gbnewsau-samsungau-et7fz.amagi.tv/playlist/amg01076-lightningintern-gbnewsau-samsungau/playlist.m3u8',
      summary: 'Breaking news, comprehensive Irish, UK and European political coverage, and live world event analysis.',
      network: 'Sky News',
      guideSchedule: [
        { time: '06:00', title: 'Sky News Breakfast', desc: 'Morning news bulletin, European headlines, and weather.' },
        { time: '10:00', title: 'The News Hour with Mark Austin', desc: 'In-depth analysis of major stories and international reports.' },
        { time: '14:00', title: 'Live at Five with Sarah-Jane Mee', desc: 'Breaking news updates and panel discussions.' },
        { time: '19:00', title: 'Sky News at Seven', desc: 'Evening roundup of the day’s most important developments.' },
        { time: '21:00', title: 'The World with Yalda Hakim', desc: 'Eyewitness accounts and interviews from global hot-spots.' }
      ]
    },
    {
      id: 'tv:ie_great_movies',
      name: 'GREAT! Movies HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Great%21_Movies_logo_2021.svg/512px-Great%21_Movies_logo_2021.svg.png',
      background: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&q=80',
      genres: ['Entertainment', 'Movies & Drama', 'Live TV'],
      streamUrl: 'https://amg01753-narrativeuk-amg01753c3-lg-gb-1833.playouts.now.amagi.tv/playlist/amg01753-narrativeuk-greatmovies-lggb/playlist.m3u8',
      summary: 'The home of movie entertainment across Ireland and the UK: Hollywood blockbusters, action, and dramas.',
      network: 'GREAT! movies',
      guideSchedule: [
        { time: '07:00', title: 'Morning Cinema Matinee', desc: 'Classic adventure and family drama to start the day.' },
        { time: '11:00', title: 'Action Showcase', desc: 'High-octane Hollywood thrills and detective mysteries.' },
        { time: '14:30', title: 'Afternoon Movie Spotlight', desc: 'Critically acclaimed dramas and heartwarming stories.' },
        { time: '18:00', title: 'Prime Time Feature Presentation', desc: 'Star-studded Hollywood blockbuster movie.' },
        { time: '21:00', title: 'GREAT! Nightcap Thriller', desc: 'Pulse-pounding crime, suspense, and thriller cinema.' }
      ]
    },
    {
      id: 'tv:ie_dw',
      name: 'DW English HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_symbol_2012.svg/512px-Deutsche_Welle_symbol_2012.svg.png',
      background: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1280&q=80',
      genres: ['News & Info', 'Culture & Docs', 'Live TV'],
      streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
      summary: 'International news and documentaries covering European politics, climate, culture, and world events.',
      network: 'DW',
      guideSchedule: [
        { time: '07:00', title: 'DW News Asia-Europe', desc: 'International headlines and live correspondents.' },
        { time: '10:00', title: 'Global 3000: The Globalization Program', desc: 'Exploring the impact of globalization on society.' },
        { time: '13:00', title: 'DW News Live', desc: 'Comprehensive global news and investigative reporting.' },
        { time: '19:00', title: 'DW News at Seven', desc: 'Prime European perspectives on global affairs.' },
        { time: '21:00', title: 'Documentary: European Horizons', desc: 'Award-winning investigative documentaries.' }
      ]
    },
    {
      id: 'tv:ie_nasa',
      name: 'NASA TV HD',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/512px-NASA_logo.svg.png',
      background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80',
      genres: ['Culture & Docs', 'FAST & Classic TV', 'Live TV'],
      streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
      summary: 'Live astronaut broadcasts from the International Space Station, rocket tests, and astronomical breakthroughs.',
      network: 'NASA TV',
      guideSchedule: [
        { time: '08:00', title: 'ISS Live Orbit: High Definition Earth Views', desc: 'Streaming real-time HD views of Earth from the space station.' },
        { time: '11:00', title: 'Space Station Crew Operations', desc: 'Astronauts conduct microgravity experiments aboard the ISS.' },
        { time: '14:00', title: 'NASA ScienceCast & Mission Briefings', desc: 'Discoveries from the James Webb and Hubble Space Telescopes.' },
        { time: '17:00', title: 'Artemis Moon Mission Update', desc: 'Humanity returns to the Moon: hardware tests and launch countdowns.' }
      ]
    }
  ]
};

// -------------------------------------------------------------
// DRM-FREE CINEMA & CLASSICS (100% Legal Public Domain & Open Source)
// Direct in-app streaming with high-speed CDN and no external apps.
// -------------------------------------------------------------
const DRM_FREE_MOVIES = [
  {
    id: 'drmfree:night_of_the_living_dead',
    title: 'Night of the Living Dead',
    year: 1968,
    genres: ['Cult Horror & Mystery', 'All Titles'],
    director: 'George A. Romero',
    cast: ['Duane Jones', 'Judith O\'Dea', 'Karl Hardman', 'Marilyn Eastman'],
    runtime: '96 min',
    imdbRating: '7.8',
    poster: 'https://images.metahub.space/poster/medium/tt0063350/img',
    background: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1280&q=80',
    synopsis: 'A ragtag group of Pennsylvanians barricade themselves in an old farmhouse to remain safe from a bloodthirsty horde of flesh-eating ghouls ravaging the East Coast. A genre-defining horror masterpiece.',
    streamUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Night_of_the_Living_Dead_%281968%29.webm',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Night_of_the_Living_Dead_(1968).webm'
  },
  {
    id: 'drmfree:nosferatu',
    title: 'Nosferatu: A Symphony of Horror',
    year: 1922,
    genres: ['Cult Horror & Mystery', 'Cinema Classics', 'All Titles'],
    director: 'F.W. Murnau',
    cast: ['Max Schreck', 'Gustav von Wangenheim', 'Greta Schröder'],
    runtime: '94 min',
    imdbRating: '7.9',
    poster: 'https://images.metahub.space/poster/medium/tt0013442/img',
    background: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1280&q=80',
    synopsis: 'Vampire Count Orlok expresses interest in a new residence and real estate agent Hutter\'s wife in this German Expressionist masterpiece that set the standard for cinematic gothic terror.',
    streamUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Nosferatu_%281922%29.webm',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Nosferatu_(1922).webm'
  },
  {
    id: 'drmfree:the_general',
    title: 'The General',
    year: 1926,
    genres: ['Cinema Classics', 'Comedy & Drama', 'All Titles'],
    director: 'Buster Keaton, Clyde Bruckman',
    cast: ['Buster Keaton', 'Marion Mack', 'Glen Cavender'],
    runtime: '79 min',
    imdbRating: '8.1',
    poster: 'https://images.metahub.space/poster/medium/tt0017925/img',
    background: 'https://images.unsplash.com/photo-1533568024503-45a8df2d0d08?w=1280&q=80',
    synopsis: 'When Union spies steal an engineer\'s beloved locomotive with his sweetheart aboard, he single-handedly pursues it through enemy lines. Widely considered one of the greatest films in cinema history.',
    streamUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/The_General_%281926%29.webm',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_General_(1926).webm'
  },
  {
    id: 'drmfree:his_girl_friday',
    title: 'His Girl Friday',
    year: 1940,
    genres: ['Comedy & Drama', 'Cinema Classics', 'All Titles'],
    director: 'Howard Hawks',
    cast: ['Cary Grant', 'Rosalind Russell', 'Ralph Bellamy'],
    runtime: '92 min',
    imdbRating: '7.8',
    poster: 'https://images.metahub.space/poster/medium/tt0032599/img',
    background: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1280&q=80',
    synopsis: 'A newspaper editor uses every trick in the book to keep his ace reporter ex-wife from remarrying and leaving the newsroom, embroiling them in a breathless murder scoop. Renowned for its lightning-fast dialogue.',
    streamUrl: 'https://archive.org/download/his_girl_friday/his_girl_friday.mp4',
    sourceUrl: 'https://archive.org/details/his_girl_friday'
  },
  {
    id: 'drmfree:house_on_haunted_hill',
    title: 'House on Haunted Hill',
    year: 1959,
    genres: ['Cult Horror & Mystery', 'All Titles'],
    director: 'William Castle',
    cast: ['Vincent Price', 'Carol Ohmart', 'Richard Long'],
    runtime: '75 min',
    imdbRating: '6.8',
    poster: 'https://images.metahub.space/poster/medium/tt0051744/img',
    background: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1280&q=80',
    synopsis: 'An eccentric millionaire offers $10,000 to five guests who agree to be locked overnight in a sinister haunted mansion where horrifying paranormal murders begin to unfold. Starring the legendary Vincent Price.',
    streamUrl: 'https://archive.org/download/house_on_haunted_hill_ipod/house_on_haunted_hill.mp4',
    sourceUrl: 'https://archive.org/details/house_on_haunted_hill_ipod'
  },
  {
    id: 'drmfree:the_stranger',
    title: 'The Stranger',
    year: 1946,
    genres: ['Film Noir & Crime', 'All Titles'],
    director: 'Orson Welles',
    cast: ['Orson Welles', 'Edward G. Robinson', 'Loretta Young'],
    runtime: '95 min',
    imdbRating: '7.4',
    poster: 'https://images.metahub.space/poster/medium/tt0038988/img',
    background: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1280&q=80',
    synopsis: 'A relentless war crimes investigator tracks a notorious fugitive who has assumed a quiet identity as a prep school professor in Connecticut. A pulse-pounding masterpiece directed by and starring Orson Welles.',
    streamUrl: 'https://archive.org/download/TheStranger_0/The_Stranger.mp4',
    sourceUrl: 'https://archive.org/details/TheStranger_0'
  },
  {
    id: 'drmfree:gullivers_travels',
    title: "Gulliver's Travels",
    year: 1939,
    genres: ['Animation & Family', 'All Titles'],
    director: 'Dave Fleischer',
    cast: ['Lanny Ross', 'Pinto Colvig', 'Jack Mercer'],
    runtime: '76 min',
    imdbRating: '6.6',
    poster: 'https://images.metahub.space/poster/medium/tt0031397/img',
    background: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1280&q=80',
    synopsis: 'Lemuel Gulliver washes ashore on the island of Lilliput after a shipwreck, where he finds himself a giant among tiny citizens embroiled in a ridiculous royal feud. A milestone in classic American animation.',
    streamUrl: 'https://archive.org/download/gullivers_travels1939/gullivers_travels1939.mp4',
    sourceUrl: 'https://archive.org/details/gullivers_travels1939'
  },
  {
    id: 'drmfree:voyage_prehistoric_women',
    title: 'Voyage to the Planet of Prehistoric Women',
    year: 1967,
    genres: ['Sci-Fi & Cyber', 'All Titles'],
    director: 'Peter Bogdanovich',
    cast: ['Mamie Van Doren', 'Mary Marr', 'Paige Lee'],
    runtime: '78 min',
    imdbRating: '5.2',
    poster: 'https://images.metahub.space/poster/medium/tt0063790/img',
    background: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80',
    synopsis: 'Astronauts landing on Venus encounter monstrous prehistoric beasts, volcanic eruptions, and a telepathic matriarchal civilization that worships a pterodactyl god. A retro drive-in cult sci-fi wonder.',
    streamUrl: 'https://archive.org/download/VoyagetothePlanetofPrehistoricWomen/VoyagetothePlanetofPrehistoricWomen.mp4',
    sourceUrl: 'https://archive.org/details/VoyagetothePlanetofPrehistoricWomen'
  },
  {
    id: 'drmfree:dressed_to_kill',
    title: 'Sherlock Holmes: Dressed to Kill',
    year: 1946,
    genres: ['Film Noir & Crime', 'Cult Horror & Mystery', 'All Titles'],
    director: 'Roy William Neill',
    cast: ['Basil Rathbone', 'Nigel Bruce', 'Patricia Morison'],
    runtime: '71 min',
    imdbRating: '6.9',
    poster: 'https://images.metahub.space/poster/medium/tt0038494/img',
    background: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1280&q=80',
    synopsis: 'Sherlock Holmes and Dr. Watson investigate a string of murders linked to three seemingly ordinary music boxes crafted inside Dartmoor Prison that conceal a secret code to Bank of England engraving plates.',
    streamUrl: 'https://archive.org/download/dressed_to_kill/dressed_to_kill.mp4',
    sourceUrl: 'https://archive.org/details/dressed_to_kill'
  },
  {
    id: 'drmfree:suddenly',
    title: 'Suddenly',
    year: 1954,
    genres: ['Film Noir & Crime', 'All Titles'],
    director: 'Lewis Allen',
    cast: ['Frank Sinatra', 'Sterling Hayden', 'James Gleason'],
    runtime: '77 min',
    imdbRating: '6.8',
    poster: 'https://images.metahub.space/poster/medium/tt0047542/img',
    background: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1280&q=80',
    synopsis: 'In a sleepy California town, a ruthless assassin and his gang hold a family hostage in their hillside home as they position their sniper rifle to assassinate the President of the United States. Starring Frank Sinatra.',
    streamUrl: 'https://archive.org/download/suddenly/suddenly.mp4',
    sourceUrl: 'https://archive.org/details/suddenly'
  }
];

// Helper: Formats a real-time, hour-by-hour dynamic TV Guide for a channel
function formatTvGuide(channel, countryCode = 'GB') {
  const schedule = channel.guideSchedule || [];
  if (!schedule.length) return '';

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let currentShow = schedule[0];
  let currentIdx = 0;

  for (let i = 0; i < schedule.length; i++) {
    const [h, m] = schedule[i].time.split(':').map(Number);
    const showMinutes = h * 60 + m;
    if (currentMinutes >= showMinutes) {
      currentShow = schedule[i];
      currentIdx = i;
    }
  }

  const nextShows = [];
  for (let step = 1; step <= 4; step++) {
    const nextIdx = (currentIdx + step) % schedule.length;
    nextShows.push(schedule[nextIdx]);
  }

  let guideText = '\n\n📺 NOW AIRING:\n👉 ' + currentShow.time + ' — ' + currentShow.title + '\n' + currentShow.desc + '\n\n📅 COMING UP NEXT TODAY:\n';
  for (const s of nextShows) {
    guideText += '• ' + s.time + ' — ' + s.title + '\n';
  }
  guideText += '\n⚡ 100% Legal DRM-Free Stream • In-App Stremio Playback';
  return guideText;
}

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
        tvGuideRequests: data.tvGuideRequests || 0,
        drmFreeRequests: data.drmFreeRequests || 0,
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
    tvGuideRequests: 0,
    drmFreeRequests: 0,
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
        tvGuideRequests: STATS.tvGuideRequests || 0,
        drmFreeRequests: STATS.drmFreeRequests || 0,
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

// Helper to safely parse incoming JSON request bodies (max 32KB)
function readJsonBody(req, maxBytes = 32768) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

// -------------------------------------------------------------
// COMMUNITY FEEDBACK & COMMENTS ENGINE
// Anonymized community discussion & suggestions system.
// -------------------------------------------------------------
const FEEDBACK_PATH = path.join(__dirname, 'feedback.json');
function loadFeedback() {
  try {
    if (fs.existsSync(FEEDBACK_PATH)) {
      const data = JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}
  return [
    {
      id: 'pinned-1',
      name: 'NightKnight',
      badge: '👑 Creator',
      category: 'Announcement',
      message: 'Welcome to NightKnight Cinema! Feel free to leave comments, request movies/series, or suggest new streaming platforms right here or on GitHub.',
      createdAt: '2026-10-25T12:00:00.000Z'
    }
  ];
}

const FEEDBACK_LIST = loadFeedback();
const FEEDBACK_RATE_LIMIT = new Map();

function persistFeedback() {
  try {
    fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(FEEDBACK_LIST, null, 2), 'utf-8');
  } catch (e) {}
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

function getManifest(baseUrl, userConfig = DEFAULT_USER_CONFIG) {
  const regionCode = (userConfig && userConfig.region) || 'GB';
  const regionName = REGIONS[regionCode] || 'United Kingdom';
  return {
    id: 'org.stremio.nightknight.cinema',
    version: ADDON_VERSION,
    name: 'NightKnight Cinema',
    description: 'Created by NightKnight (@NightKnight24). Complete cinema hub: Regional Live TV & TV Guide (EPG), DRM-Free Cinema playback, YouTube in-app player, streaming hubs (BBC iPlayer, ITVX, Netflix, Disney+), franchise viewing orders & speed engine. See my projects: https://github.com/NightKnight24',
    logo: `${baseUrl}/icon.png`,
    background: `${baseUrl}/background.png`,
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series', 'channel'],
    idPrefixes: ['tmdb:', 'tt', 'yt:', 'tv:', 'drmfree:'],
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
        type: 'movie',
        id: 'calendar-movies',
        name: 'Calendar movies',
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
        id: 'regional_live_tv',
        name: `Live TV & Guide (${regionName})`,
        pageSize: 20,
        posterShape: 'square',
        extra: [
          {
            name: 'genre',
            options: ['All Channels', 'News & Info', 'Entertainment', 'Movies & Drama', 'Culture & Docs', 'FAST & Classic TV', 'Sports & Action'],
            isRequired: false
          },
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'movie',
        id: 'drmfree_cinema',
        name: 'DRM-Free Cinema & Classics',
        pageSize: 20,
        posterShape: 'poster',
        extra: [
          {
            name: 'genre',
            options: ['All Titles', 'Sci-Fi & Cyber', 'Film Noir & Crime', 'Cult Horror & Mystery', 'Cinema Classics', 'Comedy & Drama', 'Animation & Family'],
            isRequired: false
          },
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
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
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(6500)
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
    const col = await fetchTmdb('/collection/1241').catch(() => null);
    const fbCol = await fetchTmdb('/collection/435259').catch(() => null);
    const parts = [...(col?.parts || []), ...(fbCol?.parts || [])];
    parts.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
    const slice = parts.slice(skip, skip + 20);
    return slice.map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'Lord of the Rings' && isMovie) {
    const lotr = await fetchTmdb('/collection/119').catch(() => null);
    const hobbit = await fetchTmdb('/collection/121938').catch(() => null);
    const parts = [...(lotr?.parts || []), ...(hobbit?.parts || [])];
    parts.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
    const slice = parts.slice(skip, skip + 20);
    return slice.map(item => formatMetaPreview(item, 'movie'));
  }

  if (genre === 'James Bond (007)' && isMovie) {
    const col = await fetchTmdb('/collection/645').catch(() => null);
    const parts = (col?.parts || []).sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));
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
  if (id.startsWith('tv:')) {
    const cleanId = id.replace(/:live$/, '');
    let foundChannel = null;
    let foundRegion = 'GB';
    for (const [rCode, channels] of Object.entries(REGIONAL_CHANNELS)) {
      const match = channels.find(c => c.id === cleanId || c.id === id);
      if (match) {
        foundChannel = match;
        foundRegion = rCode;
        break;
      }
    }
    if (!foundChannel) return null;

    const guideText = formatTvGuide(foundChannel, foundRegion);
    return {
      id: foundChannel.id,
      type: 'channel',
      name: `${foundChannel.name} (Live)`,
      poster: foundChannel.logo,
      background: foundChannel.background,
      logo: foundChannel.logo,
      genres: foundChannel.genres,
      description: `${foundChannel.summary}${guideText}`,
      behaviorHints: {
        defaultVideoId: `${foundChannel.id}:live`
      },
      videos: [
        {
          id: `${foundChannel.id}:live`,
          title: `🔴 LIVE BROADCAST: ${foundChannel.name}`,
          released: new Date().toISOString(),
          thumbnail: foundChannel.logo,
          overview: `Watch ${foundChannel.name} live unencrypted broadcast directly inside Stremio's native player (DRM-Free).`
        }
      ]
    };
  }

  if (id.startsWith('drmfree:')) {
    const foundMovie = DRM_FREE_MOVIES.find(m => m.id === id);
    if (!foundMovie) return null;

    return {
      id: foundMovie.id,
      type: 'movie',
      name: `${foundMovie.title} (${foundMovie.year})`,
      genres: foundMovie.genres,
      poster: foundMovie.poster,
      background: foundMovie.background,
      logo: foundMovie.poster,
      description: `${foundMovie.synopsis}\n\n⚡ 100% Legal DRM-Free Stream • In-App Stremio Playback\nDirector: ${foundMovie.director}\nCast: ${foundMovie.cast.join(', ')}\nRuntime: ${foundMovie.runtime}\nIMDb Rating: ⭐ ${foundMovie.imdbRating}/10`,
      releaseInfo: String(foundMovie.year),
      director: [foundMovie.director],
      cast: foundMovie.cast,
      imdbRating: foundMovie.imdbRating,
      runtime: foundMovie.runtime,
      behaviorHints: {
        defaultVideoId: foundMovie.id
      }
    };
  }

  if (id.startsWith('yt:') || (type === 'channel' && !id.startsWith('tv:'))) {
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
      videos: (data.release_date && new Date(data.release_date) > new Date()) ? [
        {
          id: `${imdbId || `tmdb:${tmdbId}`}`,
          title: `${data.title} — Theatrical Premiere`,
          released: new Date(data.release_date).toISOString(),
          thumbnail: data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : undefined,
          episode: 1,
          number: 1,
          season: 1
        }
      ] : undefined,
      behaviorHints: {
        defaultVideoId: imdbId || `tmdb:${tmdbId}`,
        hasScheduledVideos: Boolean(data.release_date && new Date(data.release_date) > new Date())
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
  if (id.startsWith('tv:')) {
    STATS.tvGuideRequests = (STATS.tvGuideRequests || 0) + 1;
    STATS.drmFreeRequests = (STATS.drmFreeRequests || 0) + 1;
    persistStats();

    const baseId = id.replace(/:live$/, '');
    let foundChannel = null;
    for (const channels of Object.values(REGIONAL_CHANNELS)) {
      const match = channels.find(c => c.id === baseId || c.id === id);
      if (match) {
        foundChannel = match;
        break;
      }
    }
    if (!foundChannel) return [];

    const streams = [
      {
        name: `🔴 [LIVE BROADCAST]\n${foundChannel.name}`,
        title: `Watch live unencrypted broadcast directly in Stremio (DRM-Free • 1080p/720p)`,
        url: foundChannel.streamUrl
      }
    ];
    if (foundChannel.backupUrl) {
      streams.push({
        name: `📡 [BACKUP FEED]\n${foundChannel.name} Secondary`,
        title: `Alternate unencrypted live stream (DRM-Free)`,
        url: foundChannel.backupUrl
      });
    }
    return streams;
  }

  if (id.startsWith('drmfree:')) {
    STATS.drmFreeRequests = (STATS.drmFreeRequests || 0) + 1;
    persistStats();

    const foundMovie = DRM_FREE_MOVIES.find(m => m.id === id);
    if (!foundMovie) return [];

    return [
      {
        name: `⚡ [NATIVE DRM-FREE]\n${foundMovie.title} (${foundMovie.year})`,
        title: `100% Legal Public Domain Stream • In-App Playback\nFast CDN • High Quality • No buffering risk`,
        url: foundMovie.streamUrl
      },
      {
        name: `🏛️ [OPEN SOURCE ARCHIVE]\nOfficial Repository`,
        title: `Public Domain repository\n🔗 Opens source portal`,
        externalUrl: foundMovie.sourceUrl
      }
    ];
  }

  if (id.startsWith('yt:') || (type === 'channel' && !id.startsWith('tv:'))) {
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
        tvGuideRequests: STATS.tvGuideRequests || 0,
        drmFreeRequests: STATS.drmFreeRequests || 0,
        lastRequestAt: STATS.lastRequestAt,
        privacy: '100% Zero-Knowledge Anonymized (No IP addresses stored)'
      }, null, 2));
      return;
    }

    // Community Feedback & Comments API
    if (pathname === '/api/feedback') {
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({
          feedback: FEEDBACK_LIST.slice(-50).reverse()
        }));
        return;
      }

      if (req.method === 'POST') {
        try {
          const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
          const ua = req.headers['user-agent'] || 'unknown';
          const clientHash = crypto.createHash('sha256').update(clientIp + ua + STATS_SALT).digest('hex').slice(0, 16);

          // Rate limit: max 5 comments per 10 minutes per client
          const now = Date.now();
          const userHistory = FEEDBACK_RATE_LIMIT.get(clientHash) || [];
          const recentSubmissions = userHistory.filter(t => now - t < 10 * 60 * 1000);
          if (recentSubmissions.length >= 5) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Too many submissions. Please wait a few minutes before posting again.' }));
            return;
          }

          const body = await readJsonBody(req);
          const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
          const rawName = typeof body.name === 'string' ? body.name.trim() : '';
          const rawCategory = typeof body.category === 'string' ? body.category.trim() : 'General Feedback';

          if (!rawMessage || rawMessage.length < 2) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Message cannot be empty.' }));
            return;
          }
          if (rawMessage.length > 500) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Message cannot exceed 500 characters.' }));
            return;
          }

          const allowedCategories = ['Feature Request', 'Bug Report', 'Streaming Service', 'General Feedback', 'Review'];
          const category = allowedCategories.includes(rawCategory) ? rawCategory : 'General Feedback';
          const cleanName = escapeHtml(rawName.slice(0, 30)) || 'Anonymous Viewer';
          const cleanMessage = escapeHtml(rawMessage);

          const newEntry = {
            id: 'fb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            name: cleanName,
            badge: cleanName.toLowerCase() === 'nightknight' ? '👑 Creator' : 'Community',
            category,
            message: cleanMessage,
            createdAt: new Date().toISOString()
          };

          FEEDBACK_LIST.push(newEntry);
          if (FEEDBACK_LIST.length > 200) FEEDBACK_LIST.splice(0, FEEDBACK_LIST.length - 200);
          recentSubmissions.push(now);
          FEEDBACK_RATE_LIMIT.set(clientHash, recentSubmissions);
          if (FEEDBACK_RATE_LIMIT.size > 2000) {
            const cutoff = now - 10 * 60 * 1000;
            for (const [k, times] of FEEDBACK_RATE_LIMIT.entries()) {
              if (!times.some(t => t > cutoff)) FEEDBACK_RATE_LIMIT.delete(k);
            }
          }
          persistFeedback();

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: true, item: newEntry }));
          return;
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message || 'Failed to submit feedback' }));
          return;
        }
      }
    }

    // 1. Manifest
    if (pathname === '/manifest.json') {
      STATS.manifestRequests++;
      STATS.estimatedInstalls = Math.max(STATS.estimatedInstalls, STATS.uniqueClients.size);
      persistStats();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(getManifest(baseUrl, userConfig)));
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

      // Handle Regional Live TV Catalog & Guide
      if (catalogId === 'regional_live_tv') {
        STATS.tvGuideRequests = (STATS.tvGuideRequests || 0) + 1;
        persistStats();
        const region = userConfig.region || 'GB';
        const channels = REGIONAL_CHANNELS[region] || REGIONAL_CHANNELS.GB;
        let filtered = channels;

        if (extra.genre && extra.genre !== 'All Channels') {
          filtered = filtered.filter(c => c.genres.includes(extra.genre));
        }
        if (extra.search) {
          const q = extra.search.toLowerCase();
          filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || c.genres.some(g => g.toLowerCase().includes(q)));
        }

        const metas = filtered.map(c => ({
          id: c.id,
          type: 'channel',
          name: c.name,
          poster: c.logo,
          background: c.background,
          genres: c.genres,
          description: `${c.summary}\n\n🔴 LIVE BROADCAST • Click to open Regional TV Guide`,
          posterShape: 'square'
        }));

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metas }));
        return;
      }

      // Handle DRM-Free Cinema & Classics Catalog
      if (catalogId === 'drmfree_cinema') {
        STATS.drmFreeRequests = (STATS.drmFreeRequests || 0) + 1;
        persistStats();
        let filtered = DRM_FREE_MOVIES;

        if (extra.genre && extra.genre !== 'All Titles') {
          filtered = filtered.filter(m => m.genres.includes(extra.genre));
        }
        if (extra.search) {
          const q = extra.search.toLowerCase();
          filtered = filtered.filter(m =>
            m.title.toLowerCase().includes(q) ||
            m.director.toLowerCase().includes(q) ||
            m.cast.some(actor => actor.toLowerCase().includes(q))
          );
        }

        const metas = filtered.map(m => ({
          id: m.id,
          type: 'movie',
          name: `${m.title} (${m.year})`,
          poster: m.poster,
          background: m.background,
          genres: m.genres,
          releaseInfo: String(m.year),
          imdbRating: m.imdbRating,
          description: `${m.synopsis}\n\n⚡ 100% Legal DRM-Free • Instant In-App Stremio Playback`,
          posterShape: 'poster'
        }));

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metas }));
        return;
      }

      // Handle YouTube Catalog & Search
      if (catalogId === 'youtube_videos' || (type === 'channel' && catalogId !== 'regional_live_tv')) {
        if (extra.search) STATS.youtubeSearches++;
        persistStats();
        const query = extra.search || (extra.genre ? `${extra.genre} videos` : 'Trending');
        const metas = await searchYouTube(query, skip);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ metas }));
        return;
      }
      persistStats();

      // Handle Calendar Videos & Movies: /catalog/(series|movie)/(calendar-videos|calendar-movies)/calendarVideosIds=...
      if (catalogId === 'calendar-videos' || catalogId === 'calendar-movies') {
        const idsStr = extra.calendarVideosIds || '';
        const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);
        const metasDetailed = [];

        for (const rawId of ids) {
          try {
            let tmdbId = null;
            let itemType = type || 'series';

            if (rawId.startsWith('tmdb:')) {
              tmdbId = rawId.slice(5);
            } else if (rawId.startsWith('tt')) {
              const findRes = await fetchTmdb(`/find/${rawId}`, { external_source: 'imdb_id' });
              if (itemType === 'movie' && findRes.movie_results?.length > 0) {
                tmdbId = findRes.movie_results[0].id;
              } else if (findRes.tv_results?.length > 0) {
                tmdbId = findRes.tv_results[0].id;
                itemType = 'series';
              } else if (findRes.movie_results?.length > 0) {
                tmdbId = findRes.movie_results[0].id;
                itemType = 'movie';
              }
            } else if (/^\d+$/.test(rawId)) {
              tmdbId = rawId;
            }

            if (tmdbId) {
              const meta = await handleMeta(itemType, `tmdb:${tmdbId}`);
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

    // 4. Meta: /meta/:type/:id.json (supports tmdb:123, tt1234567, yt:VIDEO_ID, tv:CHANNEL, and drmfree:TITLE)
    const metaMatch = pathname.match(/^\/meta\/(movie|series|channel)\/((?:tmdb:[0-9]+)|(?:tt[0-9]+)|(?:yt:[a-zA-Z0-9_\-]+)|(?:tv:[a-zA-Z0-9_\-:]+)|(?:drmfree:[a-zA-Z0-9_\-]+))\.json$/);
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
      .fb-row {
        flex-direction: column;
      }
    }
    .feedback-box {
      margin-top: 24px;
      background: rgba(11, 15, 25, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      text-align: left;
    }
    .feedback-title {
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fb-form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 18px;
    }
    .fb-row {
      display: flex;
      gap: 10px;
    }
    .fb-row input, .fb-row select {
      flex: 1;
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
      box-sizing: border-box;
    }
    .fb-row input:focus, .fb-row select:focus, .fb-form textarea:focus {
      outline: none;
      border-color: #38bdf8;
    }
    .fb-form textarea {
      width: 100%;
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
      resize: vertical;
      font-family: inherit;
      box-sizing: border-box;
    }
    .fb-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .fb-btn {
      padding: 10px 18px;
      background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .fb-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .gh-link-btn {
      padding: 9px 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #e2e8f0;
      text-decoration: none;
      font-weight: 600;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .gh-link-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #38bdf8;
      border-color: #38bdf8;
    }
    .fb-status {
      font-size: 12px;
      min-height: 16px;
    }
    .fb-status.success { color: #4ade80; }
    .fb-status.error { color: #f87171; }
    .fb-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 280px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .fb-item {
      background: rgba(26, 34, 52, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 12px 14px;
    }
    .fb-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .fb-author {
      font-weight: 700;
      font-size: 13px;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .fb-badge {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 12px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      font-weight: 600;
    }
    .fb-badge.creator {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .fb-category-tag {
      font-size: 11px;
      color: #94a3b8;
    }
    .fb-item-msg {
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
      word-break: break-word;
    }
    .fb-time {
      font-size: 10px;
      color: #64748b;
      margin-top: 6px;
    }
    .author-link {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 700;
      transition: color 0.2s;
    }
    .author-link:hover {
      color: #818cf8;
      text-decoration: underline;
    }
    .developer-box {
      margin-top: 24px;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 16px;
      padding: 20px;
      text-align: left;
    }
    .dev-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }
    .dev-avatar {
      font-size: 26px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .dev-info {
      flex: 1;
    }
    .dev-name {
      font-size: 15px;
      font-weight: 800;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .dev-sub {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 3px;
      line-height: 1.4;
    }
    .dev-links {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    @media (max-width: 600px) {
      .dev-links {
        grid-template-columns: 1fr;
      }
    }
    .dev-btn {
      padding: 11px 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      color: #e2e8f0;
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      transition: all 0.2s ease;
    }
    .dev-btn:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: #38bdf8;
      color: #38bdf8;
      transform: translateY(-1px);
    }
    .dev-btn.primary {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(99, 102, 241, 0.28) 100%);
      border-color: rgba(56, 189, 248, 0.45);
      color: #fff;
    }
    .dev-btn.primary:hover {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.35) 0%, rgba(99, 102, 241, 0.45) 100%);
      border-color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="overlay"></div>
  <div class="card">
    <img src="/icon.png" alt="NightKnight Logo" class="logo-img">
    <h1>NightKnight Cinema</h1>
    <div class="byline">Crafted by <a href="https://github.com/NightKnight24" target="_blank" class="author-link">NightKnight (@NightKnight24)</a></div>
    <div class="subtitle">The ultimate media hub: Regional Live TV & TV Guide (EPG), Native DRM-Free Cinema, YouTube in-app playback & search, BYOA streaming hubs (Netflix, BBC iPlayer, ITVX, Channel 4, Disney+, Prime, Max), Curated Franchises & intelligent speed ranking.</div>
    
    <a id="install-btn" href="stremio://${host}/manifest.json" class="btn">🚀 Install on Stremio</a>
    
    <div class="features">
      <div class="feature-item">
        <span class="tag">📺 Regional TV & Guide</span>
        <span>Free-to-Air & FAST broadcast channels tailored to your region with dynamic hour-by-hour TV Guides (EPG)</span>
      </div>
      <div class="feature-item">
        <span class="tag">⚡ DRM-Free Cinema</span>
        <span>Watch public domain masterpieces (horror, sci-fi, film noir) & live TV 100% directly inside Stremio's native player</span>
      </div>
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
        <label>Your Region (for Streaming Services & Live TV Guide):</label>
        <select id="region-select">
          <option value="GB" ${initialRegion === 'GB' ? 'selected' : ''}>United Kingdom (Free-to-Air, BBC iPlayer, ITVX, Channel 4, My5, Sky Go, NOW)</option>
          <option value="US" ${initialRegion === 'US' ? 'selected' : ''}>United States (US Networks, Hulu, Peacock, Max, Prime, Disney+)</option>
          <option value="CA" ${initialRegion === 'CA' ? 'selected' : ''}>Canada (CBC, Crave, CBC Gem, Prime, Disney+)</option>
          <option value="AU" ${initialRegion === 'AU' ? 'selected' : ''}>Australia (ABC News, Stan, ABC iview, Binge, Disney+)</option>
          <option value="IE" ${initialRegion === 'IE' ? 'selected' : ''}>Ireland (RTÉ Player, Sky News IE, Sky Go, NOW)</option>
        </select>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
          📍 Automatically configures your local <strong>Live TV & Guide</strong> channel lineup (e.g. UK Free-to-Air, US Networks, Australia ABC) and regional BYOA streaming hubs.
        </div>
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
          <div class="stat-val" id="stat-installs">${Math.max(STATS.estimatedInstalls, STATS.uniqueClients.size)}</div>
          <div class="stat-lbl">Active Users</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="stat-manifests">${STATS.manifestRequests.toLocaleString()}</div>
          <div class="stat-lbl">Manifest Hits</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="stat-streams">${STATS.streamRequests.toLocaleString()}</div>
          <div class="stat-lbl">Streams Served</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" id="stat-requests">${STATS.totalRequests.toLocaleString()}</div>
          <div class="stat-lbl">Total Requests</div>
        </div>
      </div>
    </div>

    <div class="feedback-box">
      <div class="feedback-title">
        <span>💬 Community Feedback & Comments</span>
        <a href="https://github.com/NightKnight24/nightknight-cinema/issues" target="_blank" class="gh-link-btn" style="padding: 4px 10px; font-size: 11px;">GitHub Community & Issues</a>
      </div>

      <form id="fb-form" class="fb-form" onsubmit="event.preventDefault(); submitFeedback();">
        <div class="fb-row">
          <input type="text" id="fb-name" placeholder="Your Name or Handle (optional)" maxlength="30">
          <select id="fb-category">
            <option value="Feature Request">💡 Feature Request</option>
            <option value="Streaming Service">📺 Streaming Service</option>
            <option value="Bug Report">🐛 Bug Report</option>
            <option value="Review">⭐ Review / Praise</option>
            <option value="General Feedback" selected>💬 General Comment</option>
          </select>
        </div>
        <textarea id="fb-msg" placeholder="Share your feedback, report a bug, or request a feature / streaming service..." rows="3" maxlength="500" required></textarea>
        <div class="fb-actions">
          <button type="submit" id="fb-submit" class="fb-btn">🚀 Post Comment</button>
          <a href="https://github.com/NightKnight24/nightknight-cinema/issues/new/choose" target="_blank" class="gh-link-btn">🐙 GitHub Issue</a>
        </div>
        <div id="fb-status" class="fb-status"></div>
      </form>

      <div class="stats-title" style="margin-bottom: 10px; font-size: 11px;">Recent Community Comments</div>
      <div id="fb-list" class="fb-list">
        <div style="color: #64748b; font-size: 12px; text-align: center; padding: 12px;">Loading community feedback...</div>
      </div>
    </div>

    <div class="developer-box">
      <div class="dev-header">
        <div class="dev-avatar">⚔️</div>
        <div class="dev-info">
          <div class="dev-name">
            <span>NightKnight Developer Hub</span>
            <span class="fb-badge creator">Creator</span>
          </div>
          <div class="dev-sub">Explore all my open-source projects, discuss features, review code, or report issues directly on GitHub.</div>
        </div>
      </div>
      <div class="dev-links">
        <a href="https://github.com/NightKnight24" target="_blank" class="dev-btn primary">
          <span>🐙 View All Projects</span>
        </a>
        <a href="https://github.com/NightKnight24/nightknight-cinema/discussions" target="_blank" class="dev-btn">
          <span>💬 Join Discussions</span>
        </a>
        <a href="https://github.com/NightKnight24/nightknight-cinema/issues" target="_blank" class="dev-btn">
          <span>🐛 Report / Review Issues</span>
        </a>
      </div>
    </div>

    <div class="footer">NightKnight Cinema • v${ADDON_VERSION} • <a href="https://github.com/NightKnight24" target="_blank" class="author-link">Follow @NightKnight24 on GitHub</a></div>
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

    function updateStats() {
      fetch('/api/stats')
        .then(r => r.json())
        .then(d => {
          if (d.estimatedInstalls !== undefined) document.getElementById('stat-installs').textContent = d.estimatedInstalls;
          if (d.manifestRequests !== undefined) document.getElementById('stat-manifests').textContent = d.manifestRequests.toLocaleString();
          if (d.streamRequests !== undefined) document.getElementById('stat-streams').textContent = d.streamRequests.toLocaleString();
          if (d.totalRequests !== undefined) document.getElementById('stat-requests').textContent = d.totalRequests.toLocaleString();
        })
        .catch(() => {});
    }
    updateStats();
    setInterval(updateStats, 8000);

    function timeAgo(dateString) {
      const sec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
      if (sec < 60) return 'Just now';
      const min = Math.floor(sec / 60);
      if (min < 60) return min + 'm ago';
      const hr = Math.floor(min / 60);
      if (hr < 24) return hr + 'h ago';
      const days = Math.floor(hr / 24);
      return days + 'd ago';
    }

    function renderFeedback(items) {
      const container = document.getElementById('fb-list');
      if (!items || items.length === 0) {
        container.innerHTML = '<div style="color: #64748b; font-size: 12px; text-align: center; padding: 12px;">No comments yet. Be the first to share your thoughts!</div>';
        return;
      }
      container.innerHTML = items.map(function(fb) {
        const isCreator = (fb.name || '').toLowerCase() === 'nightknight';
        return '<div class="fb-item">' +
          '<div class="fb-item-header">' +
            '<div class="fb-author">' +
              '<span>' + fb.name + '</span>' +
              '<span class="fb-badge ' + (isCreator ? 'creator' : '') + '">' + (fb.badge || 'Community') + '</span>' +
            '</div>' +
            '<span class="fb-category-tag">' + fb.category + '</span>' +
          '</div>' +
          '<div class="fb-item-msg">' + fb.message + '</div>' +
          '<div class="fb-time">' + timeAgo(fb.createdAt) + '</div>' +
        '</div>';
      }).join('');
    }

    function loadFeedback() {
      fetch('/api/feedback')
        .then(r => r.json())
        .then(d => {
          if (d.feedback) renderFeedback(d.feedback);
        })
        .catch(() => {});
    }
    loadFeedback();

    async function submitFeedback() {
      const name = document.getElementById('fb-name').value.trim();
      const category = document.getElementById('fb-category').value;
      const message = document.getElementById('fb-msg').value.trim();
      const statusEl = document.getElementById('fb-status');
      const submitBtn = document.getElementById('fb-submit');

      if (!message) {
        statusEl.className = 'fb-status error';
        statusEl.textContent = 'Please enter a message.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';
      statusEl.className = 'fb-status';
      statusEl.textContent = '';

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, category, message })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          statusEl.className = 'fb-status success';
          statusEl.textContent = '✓ Thank you! Your comment has been posted.';
          document.getElementById('fb-msg').value = '';
          loadFeedback();
        } else {
          statusEl.className = 'fb-status error';
          statusEl.textContent = data.error || 'Failed to submit feedback.';
        }
      } catch (e) {
        statusEl.className = 'fb-status error';
        statusEl.textContent = 'Network error. Please try again.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚀 Post Comment';
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
  console.log(`🚀 NightKnight Cinema Addon (v${ADDON_VERSION}) running at http://${HOST}:${PORT}`);
  console.log(`👉 Stremio Install URL: stremio://${HOST}:${PORT}/manifest.json`);
});
