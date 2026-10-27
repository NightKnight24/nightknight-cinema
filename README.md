---
title: NightKnight Cinema
emoji: ⚔️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
---
# ⚔️ NightKnight Cinema — Stremio Addon (v1.6.2)

> **Created by NightKnight**  
> The ultimate cinema & media hub: Regional Live TV & TV Guide (EPG), Native DRM-Free Cinema, YouTube in-app playback & global search, BYOA streaming hubs (Netflix, BBC iPlayer, ITVX, Channel 4, Disney+, Prime, Max), Curated Franchises in release order, Verified IMDb & TMDb Ratings, Home Theater Audio/Video tags, intelligent stream speed ranking, real-time community feedback & live telemetry.

---

## 🚀 Live Addon & Community Links

* 🌐 **Live Web Portal & Configuration**: [https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com)
* 🚀 **Stremio 1-Click Install**: [`stremio://nightknight-cinema.onrender.com/manifest.json`](stremio://nightknight-cinema.onrender.com/manifest.json)
* 📖 **Step-by-Step User Guide**: [Read Tutorial Below](#-complete-step-by-step-user-guide-how-to-use-everything)
* 👨‍💻 **Developer Profile & Projects**: [https://github.com/NightKnight24](https://github.com/NightKnight24)
* 📦 **Official Releases**: [GitHub Releases (v1.6.2)](https://github.com/NightKnight24/nightknight-cinema/releases)
* 🐳 **Container Packages**: [GitHub Packages (`ghcr.io`)](https://github.com/NightKnight24/nightknight-cinema/pkgs/container/nightknight-cinema)
* 📊 **Live Anonymized Analytics**: [https://nightknight-cinema.onrender.com/api/stats](https://nightknight-cinema.onrender.com/api/stats)
* 🐛 **Issue Tracker & Feature Requests**: [GitHub Issues](https://github.com/NightKnight24/nightknight-cinema/issues)
* 💬 **Community Discussions**: [GitHub Discussions](https://github.com/NightKnight24/nightknight-cinema/discussions) *(Enabled via Repo Settings $\rightarrow$ Features)*

---

## ✨ Core Features & Capabilities

### 1. 📺 Regional Live TV & Electronic Program Guide (EPG)
* **Tailored Channel Lineup**: Automatically serves high-quality, legal, unencrypted Free-to-Air & FAST broadcast channels based on your chosen region:
  * 🇬🇧 **United Kingdom**: GB News (1080p), GREAT! Movies (1080p), GREAT! Romance & Drama (1080p), CNBC UK & Europe (1080p), DW English (1080p), Red Bull TV, NASA TV HD.
  * 🇺🇸 **United States**: ABC News Live (1080p), DW News US (1080p), 30A Classic Movie Channel, NASA TV (Public & Media 1080p), Red Bull TV.
  * 🇨🇦 **Canada**: CBC News Network (1080p), CityNews Toronto (720p), DW English, Red Bull TV, NASA TV.
  * 🇦🇺 **Australia**: ABC News Australia (720p), Sky News / News24 Australia (1080p), MovieSphere Australia (1080p), Red Bull TV.
  * 🇮🇪 **Ireland**: Sky News HD (IE/UK), GREAT! Movies HD, DW English, NASA TV HD.
* **Dynamic Hour-by-Hour TV Guide & Reminders**: Opening any channel card displays:
  * **Now Airing**: Current show title, start time, and synopsis calculated dynamically for the current hour.
  * **Coming Up Today**: Next consecutive scheduled programs with airtimes.
  * **Reminders & Library Tracking**: Each scheduled program is provided as an individual trackable video entry with its exact future airtime. Simply click **`+` (Add to Library)** on the channel in Stremio to receive automated desktop and mobile notifications right when your favorite live show or broadcast begins!
* **100% In-App Playback**: Direct unencrypted HLS (`.m3u8`) streaming right inside Stremio's native media player with backup streams.

### 2. ⚡ Native DRM-Free Cinema & Public Domain Classics
* **Direct Stremio Streaming**: Curated collection of cinema masterpieces that stream 100% directly inside Stremio's native player with zero external apps, zero buffering risk, and zero DRM keys required:
  * 🧟 **Night of the Living Dead (1968)** — George A. Romero's genre-defining horror masterpiece.
  * 🧛 **Nosferatu: A Symphony of Horror (1922)** — F.W. Murnau's legendary German expressionist gothic masterpiece.
  * 🚂 **The General (1926)** — Buster Keaton's greatest silent comedy adventure.
  * 📰 **His Girl Friday (1940)** — Cary Grant & Rosalind Russell in Howard Hawks' rapid-fire screwball comedy.
  * 🏰 **House on Haunted Hill (1959)** — Vincent Price in William Castle's iconic thriller.
  * 🕵️ **The Stranger (1946)** — Directed by and starring Orson Welles with Edward G. Robinson.
  * 🎨 **Gulliver's Travels (1939)** — Max Fleischer's classic animated milestone.
  * 🪐 **Voyage to the Planet of Prehistoric Women (1967)** — Cult vintage sci-fi.
  * 🔍 **Sherlock Holmes: Dressed to Kill (1946)** — Basil Rathbone & Nigel Bruce.
  * 🎯 **Suddenly (1954)** — Gripping suspense noir starring Frank Sinatra.
* **High-Speed CDN Feeds**: Fast, uncompressed direct video feeds hosted on Wikimedia and open-source public domain archives.

### 3. ▶️ YouTube Native In-App Playback & Global Search
* **Search Everything**: Type any YouTube video, creator, music video, documentary, or podcast directly in Stremio's global search bar or browse the dedicated **YouTube (NightKnight)** catalog.
* **DRM-Free In-App Player**: Plays video streams directly inside Stremio's native video player window with hardware acceleration.
* **Dual BYOA Action**: Also provides a **`[YOUTUBE • BYOA]`** option to hand off seamlessly to the official YouTube app/website under your personal Google account.
* **Rich Metadata**: Automatically resolves authentic titles, channel creators, video durations, and high-resolution thumbnails via YouTube oEmbed.

### 4. 🇬🇧 UK & Global BYOA (Bring Your Own Account) Streaming Hubs
* Automatically detects legal streaming availability with 100% provider ID accuracy:
  * **UK Free Catch-Up**: **BBC iPlayer**, **ITVX**, **Channel 4**, **My5**, **STV Player**, **S4C Clic**, and **U (Dave / UKTV Play)**.
  * **UK & Global Subscriptions**: **Sky Go**, **NOW**, **BritBox**, **Amazon Prime Video**, **Disney+**, **Netflix**, **Paramount+**, **Apple TV+**, **Max (HBO)**, **Discovery+**, **Crunchyroll**, **MUBI**, **BFI Player**, and **Hayu**.
* **Zero-Knowledge Privacy**: 1-click deep-link buttons hand off securely to your official app or web browser where you are already signed in. Zero passwords, tokens, or credentials ever pass through the addon.

### 5. 🎬 Official Studio Trailers In-App
* Detects official studio trailers from TMDb and surfaces an **`🎬 [OFFICIAL TRAILER]`** stream that plays directly inside Stremio's built-in player before starting a film.

### 6. 📺 Streaming Platform Catalogs
* Dedicated rows and filter options for all major streaming services: **Netflix**, **Apple TV+**, **Max (HBO)**, **Disney+**, **Amazon Prime Video**, and **Paramount+**.

### 7. 🍿 Curated Franchises & Sagas in Viewing Order
* Instant access to complete film and TV sagas organized chronologically in verified release order:
  * 🦸 **Marvel Cinematic Universe (MCU)**: Chronological from Iron Man (2008), excluding unreleased placeholders.
  * 🌌 **Star Wars Saga**: Core episodic films, anthologies (Rogue One, Solo), and live-action/animated series in release order.
  * ⚡ **Harry Potter & Wizarding World**: Complete collection including Fantastic Beasts.
  * 💍 **The Lord of the Rings & The Hobbit**: Complete Middle-earth saga.
  * 🍸 **James Bond (007 Collection)**: Comprehensive viewing order from Dr. No onwards.
  * 🏮 **Studio Ghibli Masterpieces**: Complete Hayao Miyazaki & Ghibli animated catalog.
  * 🎬 **Christopher Nolan & Quentin Tarantino Collections**: Full filmographies in chronological order.

### 8. ⭐ Verified Critic Badges & Awards Recognition
* Injects authentic IMDb ratings, TMDb audience percentages, and Academy Award / Oscar acknowledgments right above the synopsis:
  `⭐ IMDb: 9.3/10 • 🎬 TMDb: 8.7/10 (87% • 31k votes) • 🏆 Nominated for 7 Oscars`
* **Honest Attribution**: TMDb ratings are strictly identified as TMDb and never disguised as IMDb scores.

### 9. 🔊 Home Cinema Audio & Video Stream Badges
* Automatically inspects stream titles and tags technical specifications:
  * **Dynamic Range**: `✨ Dolby Vision`, `🌈 HDR10+`, `🌈 HDR`, `10-bit` (strictly distinguished from DVDRip / HDRip).
  * **Sound Codecs**: `🔊 Dolby Atmos`, `🔊 TrueHD 7.1`, `🔊 DTS-HD MA`, `🔊 DTS:X`, `🔊 5.1 Surround`.
  * **Editions**: `💎 Lossless Remux`, `🎞️ IMAX Enhanced`, `🎬 Extended / Director's Cut`.

### 10. ⚡ Intelligent Stream Speed Ranking & Buffer Shield
* **Speed Optimizer**: Places instant cloud CDN streams (`🚀 [INSTANT CDN • 0 BUFFER]`) and high-seeder torrents (`⚡ [FASTEST • 600+ 👤]`) at the very top.
* **Buffer Shield**: Warns against dangerous, massive files with low seeders (`⚠️ [HIGH BUFFER RISK]`) and filters out dead streams (0 seeders).

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
  1. Open [https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com) in your browser.
  2. Select your country region (UK, US, Canada, Australia, Ireland).
  3. Click **`🚀 Install on Stremio`** — the Stremio app will open and prompt you to install.
* **Android TV / Fire TV / Smart TVs**:
  1. Install the addon on your computer or phone while logged into your Stremio account.
  2. Because Stremio syncs addons across devices, NightKnight Cinema will automatically appear on your TV!
  3. Alternatively, copy your configured install link and paste it into Stremio's Addon search bar on TV.
* **iOS / Stremio Web (`web.stremio.com`)**:
  1. Visit [https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com).
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
  2. Visit [https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com).
  3. Paste that link into the **Upstream Scraper** box.
  4. Click **`🚀 Install on Stremio`**.
  5. All video streams will now download to high-speed Debrid cloud servers and stream to your device over encrypted TLS 1.3 with zero P2P exposure.

---

## ⚙️ Configuration & Custom Scrapers

Visit the web portal at **[https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com)** to customize your personal addon URL:

* **Regional Streaming Services**: Choose your country (United Kingdom, United States, Canada, Australia, Ireland) to automatically surface your local free catch-up apps and subscription hubs.
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
* **How to Enable**: When generating your install link on [https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com), paste your Debrid-enabled Torrentio scraper URL into the **Upstream Scraper** box.

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
- **On the Web Portal**: Use the built-in feedback form at [https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com) to post comments or request platforms.
- **GitHub Discussions**: Share ideas, movie recommendations, or ask questions on [GitHub Discussions](https://github.com/NightKnight24/nightknight-cinema/discussions).
- **GitHub Issues**: Report bugs or broken streams via our structured [Issue Templates](https://github.com/NightKnight24/nightknight-cinema/issues/new/choose).

---

## 📜 License & Credits

- **Author**: **NightKnight** (`@NightKnight24`)
- **License**: MIT
