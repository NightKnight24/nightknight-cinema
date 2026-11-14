# ⚔️ NightKnight Cinema — Stremio Addon (v2.0.0)

> **Created by NightKnight**  
> The ultimate all-in-one cinema & media hub (**v2.0 Major Release**): Multi-Indexer Stream Failover & Deduplication (`Torrentio` + `ThePirateBay+`), Resolution Priority Selector (`4K / 1080p / Best Available`) + Automatic CAM/TS/Screener Shield, Universal Multi-Language Subtitles Engine (inline playback, 80+ languages, anime & REST fallbacks), Priority Language & Dubbing Stream Sorter (Preferred Audio, Dubbed Priority, Subbed/Original Priority), 2,200+ Free-to-Air, FAST & International Live Radio Channels across UK, US, EU & LATAM with Multi-Server Backup Failover, Interactive Right-Panel Live EPG TV Guide (Now Airing + Up Next), Next-Gen YouTube Hub (Channel pages, video browsing, @handles BYOA subscriptions, calendar sync), Next-Gen Twitch Hub (Live 1080p60 HLS feeds, streamer search, VODs, clips), Global Country Name Telemetry & Trending Leaderboards, Torrentio Real-Debrid Integration (Zero-Buffering High-Speed Cloud Caching), Native DRM-Free Cinema, BYOA streaming hubs (Netflix, BBC iPlayer, ITVX, Channel 4, Disney+, Prime, Max), Curated Franchises in release order, Verified IMDb & TMDb Ratings, Home Theater Audio/Video tags, real-time community feedback & live telemetry.

---

## 🚀 Live Addon & Community Links

* 🌐 **Live Web Portal & Configuration**: [https://nightknight-cinema.vercel.app](https://nightknight-cinema.vercel.app)
* 🚀 **Stremio 1-Click Install**: [`stremio://nightknight-cinema.vercel.app/manifest.json`](stremio://nightknight-cinema.vercel.app/manifest.json)
* 👑 **Support on Throne (Mystery Gifts & Community Goals)**: [https://throne.com/nightknight24](https://throne.com/nightknight24)
* 📖 **Step-by-Step User Guide**: [Read Tutorial Below](#-complete-step-by-step-user-guide-how-to-use-everything)
* 👨‍💻 **Developer Profile & Projects**: [https://github.com/NightKnight24](https://github.com/NightKnight24)
* 📦 **Official Releases**: [GitHub Releases (v2.0.0)](https://github.com/NightKnight24/nightknight-cinema/releases)
* 🐳 **Container Packages**: [GitHub Packages (`ghcr.io`)](https://github.com/NightKnight24/nightknight-cinema/pkgs/container/nightknight-cinema)
* 📊 **Live Anonymized Analytics & Telemetry**: [https://nightknight-cinema.vercel.app/api/stats](https://nightknight-cinema.vercel.app/api/stats)
* 🐛 **Issue Tracker & Feature Requests**: [GitHub Issues](https://github.com/NightKnight24/nightknight-cinema/issues)
* 💬 **Community Discussions**: [GitHub Discussions](https://github.com/NightKnight24/nightknight-cinema/discussions)

---

## 🆕 What’s New in v2.0.0

* **🔄 Multi-Indexer Stream Failover & Deduplication**: Whenever a title returns fewer than 3 streams (or upstream times out/rate-limits), NightKnight Cinema automatically aggregates additional verified streams from `ThePirateBay+` and deduplicates by `infoHash`/URL so you are never left without links.
* **🎯 Resolution Priority Selector (`maxQuality`)**: Choose **Best Available (4K UHD + 1080p)**, **1080p Full HD Priority** (smooth instant loads on Firestick, TV & Mobile without 60GB remuxes), or **4K Ultra HD / Dolby Vision / HDR Priority** for dedicated home theaters.
* **🛡️ Automatic CAM / Telesync / Screener Shield**: Automatically flags low-quality theater captures (`⚠️ [CAM / THEATER RIP]`) and demotes them below crisp WEB-DL and BluRay encodes.
* **🌍 Global Country Name Resolution & Expanded EU/LATAM Radio/TV**: Resolves every ISO country code automatically (`Intl.DisplayNames`) on the Global Audience Leaderboard and adds native EPG-backed Live TV & 24/7 radio broadcasts for **Germany (`DE`), France (`FR`), Spain (`ES`), Italy (`IT`), Netherlands (`NL`), Brazil (`BR`), and Mexico (`MX`)**.

---

## ✨ Core Features & Capabilities

### 1. 💬 Universal Multi-Language Subtitles Engine (v1.13.1 + v2.0)
* **Zero Missing Subtitles**: Completely resolves missing subtitles across all content types—blockbusters, obscure foreign series, multi-season anime, DRM-Free public domain classics, and YouTube videos.
* **Inline Subtitles on Every Stream**: Automatically attaches up to 30 top priority-sorted subtitle tracks directly onto each stream object (`stream.subtitles`). Stremio's player loads synchronized subtitles immediately on all platforms without relying solely on external `/subtitles` routing.
* **Parallel Multi-Source Resolution**: Simultaneously queries exact file hash matches (`videoHash`) and general catalog entries (`opensubtitles-v3.strem.io`), completely eliminating the early-return bug where a single foreign hash match previously hid the rest of the catalog.
* **Anime & Multi-Season Fallback**: Automatically falls back to Season 1 absolute episode numbering (e.g. *One Piece* `S21E1000` $\to$ `S1E1000`) so anime episodes with non-standard season numbering always have complete subtitle coverage.
* **Direct OpenSubtitles REST Fallback**: Bridges directly to OpenSubtitles REST API (`https://rest.opensubtitles.org`) and Stremio's UTF-8 SRT conversion CDN (`subs5.strem.io`) whenever upstream catalogs are empty.
* **DRM-Free & YouTube Subtitles**: Native IMDb mapping for DRM-Free classics and automated `.vtt` caption track extraction for all YouTube videos and channels.

### 2. 🌍 Priority Language, Dubbing & Best Stream Sorter (v1.13.1)
* **Preferred Audio & Subtitle Language (`prefLang`)**: Choose from 14 major languages (English, Spanish, French, German, Italian, Portuguese, Hindi, Japanese, Korean, Russian, Dutch, Polish, Turkish, Arabic) or *Any Language*. Subtitles and audio tracks matching your language are placed at the very top.
* **Smart Dubbing Priority Modes (`dubPref`)**:
  * ⚡ **Smart Best Match (`dub_or_orig`)**: Balances your preferred language with best speed, Debrid availability, and 1080p/4K resolution.
  * 🎙️ **Dubbed Priority (`dub_first`)**: Ranks Dubbed & Multi-Audio releases in your preferred language at the very top.
  * 💬 **Subbed / Original Audio Priority (`sub_orig`)**: Prioritizes clean Original Audio + Multi-Subs releases, demoting heavy voiceover packs.
* **Intelligent Audio & Dubbing Badges**: Every stream card displays exact language status badges (`🗣️ EN • Dubbed`, `🗣️ EN • Multi-Audio`, `🗣️ EN Audio`, `💬 Multi-Subs`, `🌐 Foreign Dub`).
* **BingeGroup Language Preservation**: Stremio's auto-play engine automatically preserves your chosen language and dubbing style when seamlessly advancing to the next episode.

### 3. 📡 2,200+ Free-TV / FAST Channels & Multi-Server Backup Engine (v1.13.0)
* **Massive Global Lineup**: Curates over 2,200+ legal, unencrypted Free-to-Air, FAST, and community broadcast channels sourced from verified Free-TV and IPTV-Org libraries.
* **Smart Duplicate Merging**: Instead of cluttering Stremio with dozens of duplicate channels, channels are merged into a single clean channel card with **Multi-Server Failover**:
  * `🟢 Server 1 (Primary Live)`
  * `🟡 Server 2 (Backup Failover)`
  * `🟠 Server 3 (Mirror Feed)`
  If one stream buffers or goes offline, simply switch to the backup server!
* **Multi-Protocol Stream Dispatcher**: Direct `.m3u8` HLS streams go to Stremio's native player, YouTube Live channels route through the ad-free YouTube player, and Twitch live channels route through the 1080p60 Twitch engine.

### 4. 📺 Interactive Right-Panel Live EPG TV Guide Layout
* **Top Item $\to$ Instant Live Stream**: Dynamically named `🔴 LIVE NOW: [Current Show Title]`. Clicking play immediately launches the live broadcast in Stremio's native player.
* **List Below $\to$ Up Next Timeline**: Displays upcoming programs chronologically (`⏰ [Today/Tomorrow HH:MM] Show Title`) with full plot overviews and future air timestamps.
* **Library Reminders & Phone Alerts**: Clicking `+ (Add to Library)` on any channel syncs its schedule to your Stremio Calendar and phone calendar app (Apple/Google), alerting you right before your show or match begins!

### 5. ▶️ Next-Gen YouTube Hub (BYOA Subscriptions & In-App Playback)
* **Search Everything**: Search any video, creator, music video, documentary, or podcast directly in Stremio's global search bar or browse the **YouTube (NightKnight)** catalog.
* **Channel Pages & Video Browsing**: Clicking any creator channel displays their latest uploads, premieres, and a **🔴 LIVE NOW** feed when they are streaming.
* **BYOA Subscriptions**: Add your favorite creators (e.g. `@MrBeast, @mkbhd, @SkyNews`) in `/configure` to create your own personalized **My Subscriptions (BYOA)** row.
* **100% Ad-Free**: Direct stream extraction completely bypasses pre-rolls, mid-rolls, and banner ads.
* **Premiere Calendar Alerts**: Scheduled premieres sync future start times directly to Stremio Calendar.

### 6. 🟣 Next-Gen Twitch Hub (Live Streams, Streamer Search & VODs)
* **Top Live Directory**: Real-time viewer count badges, current game category, and stream status indicator (`🔴 LIVE`) across *Just Chatting*, *GTA V*, *Valorant*, *Sports*, and more.
* **Streamer Search**: Search any streamer by username (e.g. `KaiCenat`, `shroud`, `blastpremier`).
* **1080p60 Ad-Free HLS Playback**: Plays raw source feeds directly in Stremio without commercial ad breaks.
* **Followed Streamers BYOA**: Configure your favorite Twitch creators in `/configure` for a dedicated live feed.

### 7. 📊 Live Geographic Telemetry & Trending Leaderboards
* **Zero-Knowledge Privacy**: Anonymously tracks country-level trends using salted SHA-256 hashes (100% GDPR-compliant, no personal IPs or search history stored).
* **"Trending on NightKnight" Leaderboard**: Live rankings on `/configure` showcasing the most popular movies, series, and live channels streamed by the community.

### 8. ⚡ Native DRM-Free Cinema & Public Domain Classics
* Curated collection of verified public domain classics (*Night of the Living Dead*, *Nosferatu*, *The General*, *His Girl Friday*, *House on Haunted Hill*, *The Stranger*, *Suddenly*) that stream 100% inside Stremio with zero buffering risk and full subtitle support.

### 9. 🇬🇧 Regional BYOA Streaming Hubs
* Deep-links directly to official streaming providers:
  * **UK Free Catch-Up**: **BBC iPlayer**, **ITVX**, **Channel 4**, **My5**, **STV Player**, **U (Dave / UKTV Play)**.
  * **India Streaming Hubs**: **Hotstar**, **JioCinema**, **ZEE5**, **Sony LIV**.
  * **Global Subscriptions**: **Sky Go**, **NOW**, **Netflix**, **Disney+**, **Prime Video**, **Max**, **Apple TV+**, **Paramount+**, **Crunchyroll**.

### 10. ⚡ Torrentio Real-Debrid Integration & Buffer Shield
* **User-Provided Real-Debrid Token**: Users can enter their personal Real-Debrid API token directly on `/configure`. NightKnight Cinema automatically queries Torrentio Debrid, delivering instant high-speed cloud streams (`🚀 [INSTANT CDN • 0 BUFFER]`) with zero P2P seeding and zero buffering.
* **Intelligent Speed Optimizer**: Ranks cached Debrid streams and high-seeder torrents (`⚡ [FASTEST • 600+ 👤]`) at the very top.
* **Buffer Shield**: Warns against dangerous, massive files with low seeders (`⚠️ [HIGH BUFFER RISK]`) and filters out dead streams (0 seeders).
* **Automatic P2P Fallback**: If a title has no cached Debrid copies, the addon automatically falls back to public Torrentio streams so viewers are never left stranded.
* **Direct HTTP Streams & Usenet/Debrid**: 100% compatible with direct HTTP/HLS streams (FAST channels, web streams, direct MP4/MKV) and Usenet/Debrid links (Real-Debrid, TorBox, Premiumize, EasyDebrid). Usenet NZB downloads cached on Debrid providers stream instantly as high-speed HTTP streams directly into Stremio.

### 11. 🎬 Complete Actor & Director Filmographies
* Search any actor or director in Stremio's search bar to immediately browse their complete filmography ranked by popularity and vote count.

### 12. 📅 16:9 Widescreen Landscape Feeds & Calendar Sync
* Dedicated 16:9 widescreen card feeds for upcoming theatrical releases and series airing over the next 7 days, with full air-date synchronization to Stremio's Calendar.

### 13. 💬 Community Feedback & Comments Engine
* **In-App Comment Form**: Submit comments, review features, or request new streaming platforms directly from the web portal.
* **Live Community Stream**: Real-time comment feed with category labels (`💡 Feature Request`, `📺 Streaming Service`, `🐛 Bug Report`, `⭐ Review`, `💬 General Comment`) and creator badge verification (`👑 Creator`).

### 14. 📊 Live Anonymized Analytics & Telemetry
* Real-time install counter and request telemetry via `/api/stats` using GDPR-compliant salted SHA-256 client hashes (zero raw IP addresses stored).

---

## 📖 Complete Step-by-Step User Guide (How to Use Everything)

### 1. 🚀 How to Install on Any Device
* **Desktop (Windows, macOS, Linux)**:
  1. Open [https://nightknight-cinema.vercel.app](https://nightknight-cinema.vercel.app) in your browser.
  2. Select your country region (UK, US, Canada, Australia, Ireland, India).
  3. Click **`🚀 Install on Stremio`** — the Stremio app will open and prompt you to install.
* **Android TV / Fire TV / Smart TVs**:
  1. Install the addon on your computer or phone while logged into your Stremio account.
  2. Because Stremio syncs addons across devices, NightKnight Cinema will automatically appear on your TV!
  3. Alternatively, copy your configured install link and paste it into Stremio's Addon search bar on TV.
* **iOS / Stremio Web (`web.stremio.com`)**:
  1. Visit [https://nightknight-cinema.vercel.app](https://nightknight-cinema.vercel.app).
  2. Long-press or right-click the **`🚀 Install on Stremio`** button and select **Copy Link Address**.
  3. In Stremio Web, navigate to **Addons** $\rightarrow$ paste the copied link into the search bar $\rightarrow$ tap **Install**.

---

### 2. 📺 How to Watch Live Regional TV & Read the TV Guide
* In Stremio, scroll to the **Live TV & Guide** catalog (customized to your region).
* **Choose a Channel**: Select any broadcast channel (e.g. GB News, ABC News, GREAT! Movies, NASA TV, Red Bull TV).
* **View the EPG TV Guide**: The channel details screen displays:
  * **Now Airing**: The show currently broadcasting with runtime and overview.
  * **Upcoming Shows Today**: A chronological schedule of upcoming programs with exact broadcast start times.
* **Play Live Stream**: Click **Watch** or select the `🔴 LIVE BROADCAST` stream to start unencrypted HD streaming inside Stremio's native video player.

---

### 3. ⏰ How to Set Reminders & Push Alerts for Live TV & Episodes
* **For Live TV Shows**: Open any channel in the **Live TV & Guide** feed. Browse the list of today's scheduled shows (e.g. `⏰ [AIRS AT 20:00] ...`). Click **`+` (Add to Library)** on the channel. When the show's airtime arrives, Stremio triggers a push notification alerting you that it is starting!
* **For Cinema Premieres**: Open **Upcoming Movie Releases (16:9)** and click **`+` (Add to Library)** on any upcoming movie. Stremio will display the film on your Stremio Calendar and notify you on premiere day.
* **For Ongoing Series**: Open **Upcoming TV Shows (16:9)** and click **`+` (Add to Library)** on any series to track episode air dates.
* **Make Sure Notifications Are Enabled**: In Stremio, navigate to **Settings** $\rightarrow$ **General** $\rightarrow$ toggle **Notifications: ON**.

---

### 4. ⚡ How to Stream DRM-Free Cinema Classics
* Navigate to the **DRM-Free Cinema & Classics** catalog in Stremio.
* Filter by genre: *Sci-Fi & Cyber*, *Film Noir & Crime*, *Cult Horror & Mystery*, *Cinema Classics*, *Comedy & Drama*, or *Animation & Family*.
* Select any masterpiece (e.g. *Night of the Living Dead*, *Nosferatu*, *The General*, *His Girl Friday*, *The Stranger*).
* Click **Play** — video streams instantly in high-definition directly from open-source archive CDNs with zero buffering risk.

---

### 5. ▶️ How to Use YouTube In-App & BYOA Streaming Hubs
* **YouTube In-App Playback**:
  * Type any video title or creator in Stremio's top search bar, or browse the **YouTube (NightKnight)** catalog.
  * Click to play directly inside Stremio (DRM-Free) or pick **`[YOUTUBE • BYOA]`** to hand off to the official YouTube app.
* **BYOA (Bring Your Own Account) Streaming Hubs**:
  * When viewing any movie or show, NightKnight Cinema checks if it is available on your local streaming services (BBC iPlayer, ITVX, Channel 4, Netflix, Disney+, Prime, Max, etc.).
  * Clicking the provider stream button deep-links directly into that official platform where you are already signed in.

---

### 6. 🛡️ How to Enable Real-Debrid for Encrypted Cloud Streaming
* If you have a Real-Debrid, AllDebrid, Premiumize, or TorBox subscription:
  1. Generate your configured scraper URL from Torrentio (with your API key).
  2. Visit [https://nightknight-cinema.vercel.app](https://nightknight-cinema.vercel.app).
  3. Paste that link into the **Upstream Scraper** box.
  4. Click **`🚀 Install on Stremio`**.
  5. All video streams will now download to high-speed Debrid cloud servers and stream to your device over encrypted TLS 1.3 with zero P2P exposure.

---

## ⚙️ Configuration & Custom Scrapers

Visit the web portal at **[https://nightknight-cinema.vercel.app](https://nightknight-cinema.vercel.app)** to customize your personal addon URL:

* **Regional Streaming Services**: Choose your country (United Kingdom, United States, Canada, Australia, Ireland, India) to automatically surface your local free catch-up apps, regional Live TV & Radio lineup, and subscription hubs.
* **Upstream Scraper**: Uses Torrentio (`https://torrentio.strem.fun`) by default, or paste your custom Real-Debrid / AllDebrid / Premiumize / TorBox scraper URL for instant cloud CDN streams.
* **Auto-Hide High Buffer Risk Streams**: Optional toggle to completely hide large files with low seeders.

---

## 📅 Stremio Calendar Sync Guide (Theatrical Movies & TV Shows)

NightKnight Cinema fully integrates both **Cinema Theatrical Premieres** and **TV Series/Episodes** with Stremio's native Calendar system (`stremio://calendar`):

### 1. Tracking Upcoming Cinema Releases
* Open the **Upcoming Movie Releases (16:9)** feed or search for any upcoming film in Stremio.
* Click the **`+` (Add to Library)** button on the title card.
* NightKnight Cinema detects the future release date, flags `hasScheduledVideos: true`, and injects a **Theatrical Premiere** event into Stremio's calendar feed.
* The film automatically appears on that exact release day in your Stremio Calendar grid!

### 2. Tracking Airing TV Episodes
* Browse the **Upcoming TV Shows (16:9)** feed or search any ongoing series.
* Click **`+` (Add to Library)** on the series.
* NightKnight Cinema automatically syncs all future episode air dates and times directly from TMDb's `next_episode_to_air` feed onto your Calendar.

### 3. Setting Reminders for Live TV Broadcasts
* Browse the **Live TV & Guide** catalog for your region and select any channel (e.g. GB News, ABC News, GREAT! Movies, NASA TV).
* Open the channel details to see the full list of today's upcoming scheduled programs with exact broadcast start times (`⏰ [AIRS AT 18:00] ...`, `⏰ [AIRS AT 20:00] ...`).
* Click **`+` (Add to Library)** on the channel card.
* Because NightKnight Cinema encodes future broadcast start times with ISO 8601 timestamps, Stremio automatically alerts you on your desktop or phone when that show begins!

### 4. In-App Desktop Notifications
* In Stremio, navigate to **Settings** $\rightarrow$ **General** $\rightarrow$ toggle **Notifications: ON**.
* Stremio will trigger desktop notifications on the exact morning a movie hits theaters, when a new episode airs, or when a bookmarked live broadcast goes on the air.

### 5. Mobile Calendar Sync (Apple Calendar, Google Calendar, Outlook)
* In Stremio, go to **Settings** $\rightarrow$ **General** $\rightarrow$ click **Subscribe to calendar**.
* Copy the `webcal://` link provided by Stremio.
* Paste it into your calendar application:
  * **iPhone / iPad (Apple Calendar)**: Open *Settings* $\rightarrow$ *Calendar* $\rightarrow$ *Accounts* $\rightarrow$ *Add Subscribed Calendar* $\rightarrow$ paste the link.
  * **Google Calendar**: Open *Google Calendar Web* $\rightarrow$ *Other calendars (+)* $\rightarrow$ *From URL* $\rightarrow$ paste the link.
  * **Outlook**: Open *Calendar* $\rightarrow$ *Add Calendar* $\rightarrow$ *Subscribe from web*.
* You will receive automatic lock screen alarms and reminders on your phone when movies hit theaters or new episodes air!

---

## 🛡️ Privacy, IP Protection & Debrid Cloud Encryption

### Can an Addon Run a Native VPN?
* Stremio addons are **server-side HTTP web services (APIs)**, not device operating system software.
* An addon cannot install network adapters (TUN/TAP drivers) or create OS-level WireGuard/OpenVPN tunnels on your phone, TV, or PC because addons operate exclusively through JSON over HTTPS.
* When you play a peer-to-peer torrent stream in Stremio without a proxy, the **Stremio client application itself** opens P2P connections directly from your home internet.

### The Zero-Risk Solution: Debrid Cloud Shielding
* To achieve 100% IP privacy without running a separate VPN client, NightKnight Cinema supports **Real-Debrid, AllDebrid, Premiumize, and TorBox**:
  1. Instead of your home computer connecting to P2P torrent swarms, the high-speed Debrid cloud server downloads the file remotely.
  2. The video is streamed to your Stremio player over an **encrypted HTTPS connection (TLS 1.3)**.
  3. Your ISP only sees encrypted HTTPS traffic to a cloud server, and your home IP is **never exposed** to the BitTorrent swarm.
* **How to Enable**: When generating your install link on [https://nightknight-cinema.vercel.app](https://nightknight-cinema.vercel.app), paste your Debrid-enabled Torrentio scraper URL into the **Upstream Scraper** box.

---

## 🌐 Endpoints

| Resource | URL Path | Description |
| :--- | :--- | :--- |
| **Web Portal & Config** | `/` or `/configure` | Interactive dashboard, configuration & one-click install |
| **Addon Manifest** | `/manifest.json` | Manifest definition for Stremio client registration |
| **Live Statistics** | `/api/stats` | Real-time anonymized active users, install counter & telemetry |
| **Community Feedback** | `/api/feedback` | Community comment feed & feedback submissions (GET/POST) |
| **Health Check** | `/api/health` | Addon status & upstream scraper connectivity diagnostics |
| **Speed-Ranked Streams**| `/stream/:type/:id.json` | Resolves streams sorted by seeders, speed & CDN reliability |
| **Multi-Language Subtitles** | `/subtitles/:type/:id/:extra?.json` | Native subtitles in 80+ languages (English, Spanish, French, etc.) |
| **Movies Catalog** | `/catalog/movie/actor_genre_movies.json` | Actor filmographies, search & curated movie genres |
| **Series Catalog** | `/catalog/series/actor_genre_series.json` | Actor filmographies, search & curated TV genres |
| **Upcoming Movies (16:9)** | `/catalog/movie/upcoming_movies.json` | 16:9 landscape cards for upcoming movie releases |
| **Upcoming TV Shows (16:9)**| `/catalog/series/on_the_air_series.json` | 16:9 landscape cards for shows airing next 7 days |
| **Regional Live TV & Guide** | `/catalog/channel/regional_live_tv.json` | Free-to-Air & FAST broadcast lineup personalized to user region |
| **DRM-Free Cinema** | `/catalog/movie/drmfree_cinema.json` | 100% legal public domain & open source cinema classics |
| **Calendar Videos** | `/catalog/series/calendar-videos/calendarVideosIds=...` | Stremio calendar air date feed |
| **Metadata & TV Guide** | `/meta/:type/:id.json` | Detailed media metadata, episodes, and real-time TV Guide (EPG) |

---

## 💬 Community Feedback & Support

We welcome community feedback, title suggestions, reviews, and feature requests:
- **Developer Profile & Projects**: Visit [https://github.com/NightKnight24](https://github.com/NightKnight24) to see all active open-source projects, updates, and upcoming releases.
- **On the Web Portal**: Use the built-in feedback form at [https://nightknight-cinema.vercel.app](https://nightknight-cinema.vercel.app) to post comments or request platforms.
- **GitHub Discussions**: Share ideas, movie recommendations, or ask questions on [GitHub Discussions](https://github.com/NightKnight24/nightknight-cinema/discussions).
- **GitHub Issues**: Report bugs or broken streams via our structured [Issue Templates](https://github.com/NightKnight24/nightknight-cinema/issues/new/choose).

---

## 📜 License & Credits

- **Author**: **NightKnight** (`@NightKnight24`)
- **License**: MIT
