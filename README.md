# ⚔️ NightKnight Cinema — Stremio Addon (v1.5.2)

> **Created by NightKnight**  
> The ultimate cinema & media hub: YouTube in-app playback & global search, BYOA streaming hubs (Netflix, BBC iPlayer, ITVX, Channel 4, Disney+, Prime, Max), Curated Franchises in release order, Verified IMDb & TMDb Ratings, Home Theater Audio/Video tags, intelligent stream speed ranking & live community feedback.

---

## 🚀 Live Deployments & Links

* 🌐 **Live Web Portal & Configuration**: [https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com)
* 🚀 **Stremio 1-Click Install URL**: `stremio://nightknight-cinema.onrender.com/manifest.json`
* 📊 **Live Anonymized Statistics**: [https://nightknight-cinema.onrender.com/api/stats](https://nightknight-cinema.onrender.com/api/stats)
* 💬 **Community Discussions**: [GitHub Discussions](https://github.com/NightKnight24/nightknight-cinema/discussions)
* 🐛 **Issue Tracker & Feature Requests**: [GitHub Issues](https://github.com/NightKnight24/nightknight-cinema/issues)
* 📦 **Releases**: [GitHub Releases](https://github.com/NightKnight24/nightknight-cinema/releases)
* 🐳 **Packages (Docker Container)**: [GitHub Packages](https://github.com/users/NightKnight24/packages?repo_name=nightknight-cinema)

---

## ✨ Features

1. **▶️ YouTube In-App Playback & Global Search (DRM-Free & BYOA)**
   - Search for **any YouTube video, channel, music, or podcast** directly in Stremio's global search bar or the dedicated **YouTube (NightKnight)** catalog.
   - Stream video **directly inside Stremio's native player window** (DRM-Free via `ytId`).
   - Resolves real video titles, channels, and thumbnails via YouTube oEmbed.
   - Also includes a **`[YOUTUBE • BYOA]`** button to open the video in the official YouTube app/website with your personal Google account.

2. **🇬🇧 UK & Global BYOA (Bring Your Own Account) Streaming Hubs**
   - Automatically detects where any movie or show is streaming legally across official platforms matched with 100% provider ID precision:
     - **UK Free Catch-Up**: **BBC iPlayer**, **ITVX**, **Channel 4**, **My5**, **STV Player**, **S4C Clic**, and **U (Dave / UKTV Play)**.
     - **UK & Global Subscriptions**: **Sky Go**, **NOW**, **BritBox**, **Amazon Prime Video**, **Disney+**, **Netflix**, **Paramount+**, **Apple TV+**, **Max (HBO)**, **Discovery+**, **Crunchyroll**, **MUBI**, **BFI Player**, and **Hayu**.
   - 1-click deep-link buttons hand off securely to your official app or web browser where you are already logged into your personal account. Zero passwords or credentials ever pass through the addon (100% Zero-Knowledge security).

3. **🎬 Official Studio Trailers In-App**
   - Automatically detects official studio trailers from TMDb and surfaces an **`🎬 [OFFICIAL TRAILER]`** stream that plays directly inside Stremio's built-in player.

4. **📺 Streaming Platform Hubs**
   - Browse dedicated rows and filter options for all major networks: **Netflix**, **Apple TV+**, **Max (HBO)**, **Disney+**, **Amazon Prime Video**, and **Paramount+**.

5. **🍿 Curated Franchises & Sagas in Chronological Viewing Order**
   - Instant one-click access to complete sagas in verified release/chronological order:
     - 🦸 **Marvel Cinematic Universe (MCU)**: Chronological from Iron Man (2008), excluding unreleased placeholders.
     - 🌌 **Star Wars Saga**: Core episodic films and anthologies (Rogue One, Solo), plus curated TV series in release order (excluding non-Star Wars titles).
     - ⚡ **Harry Potter & Wizarding World**: Complete collection including Fantastic Beasts.
     - 💍 **The Lord of the Rings & The Hobbit**
     - 🍸 **James Bond (007 Collection)**: Viewing order from Dr. No.
     - 🏮 **Studio Ghibli Masterpieces**
     - 🎬 **Christopher Nolan & Quentin Tarantino Collections**

6. **⭐ Verified Critic Badges & Awards Recognition**
   - Injects verified IMDb ratings, TMDb audience percentages, and Academy Award / Oscar acknowledgments right above the synopsis:
     `⭐ IMDb: 9.3/10 • 🎬 TMDb: 8.7/10 (87% • 31k votes) • 🏆 Nominated for 7 Oscars`
   - Honest labeling: TMDb scores are never disguised as IMDb scores.

7. **🔊 Home Cinema Audio & Video Stream Badges**
   - Automatically detects and tags streams with theater-grade specifications:
     - **Dynamic Range**: `✨ Dolby Vision`, `🌈 HDR10+`, `🌈 HDR`, `10-bit` (strictly distinguished from DVDRip / HDRip)
     - **Sound Codecs**: `🔊 Dolby Atmos`, `🔊 TrueHD 7.1`, `🔊 DTS-HD MA`, `🔊 DTS:X`, `🔊 5.1 Surround`
     - **Editions**: `💎 Lossless Remux`, `🎞️ IMAX Enhanced`, `🎬 Extended / Director's Cut`

8. **⏳ Decade Time-Machine Filters**
   - Nostalgic time travel across movie and television history (2020s, 2010s, 2000s, 90s, 80s, 70s).

9. **⚡ Intelligent Stream Speed Ranking & Buffer Shield**
   - Places instant CDN streams (`🚀 [INSTANT CDN • 0 BUFFER]`) and high-seeder torrents (`⚡ [FASTEST • 600+ 👤]`) at the very top.
   - Filters dead torrents (0 seeders) and warns against massive low-seeder files.

10. **🎬 Complete Actor & Director Filmographies**
    - Type any actor or director in Stremio's search bar to immediately see their full filmography.

11. **📅 16:9 Widescreen Landscape Feeds & Calendar Sync**
    - Dedicated 16:9 horizontal card feeds for upcoming releases, plus full Stremio Calendar air-date synchronization.

---

## 🚀 Quick Start (Local Run)

```bash
# Clone the repository
git clone <your-repo-url>
cd nightknight-cinema

# Start the addon
./start.sh
# or using Node directly:
npm start

# Check status
./status.sh

# Stop the addon
./stop.sh
```

Once started, open **`http://127.0.0.1:7000`** in your browser to access the configuration dashboard or install directly into Stremio:
`stremio://127.0.0.1:7000/manifest.json`

---

## ☁️ How to Deploy Publicly for Other Users

To share **NightKnight Cinema** with friends or the Stremio community around the world, deploy the repository to any cloud provider:

### Option A: Render.com (Recommended Free Hosting)
1. Push your code to a GitHub repository.
2. Sign in to [Render.com](https://render.com) and click **New + $\rightarrow$ Web Service**.
3. Select your GitHub repository.
4. Set:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Create Web Service**. Render will generate a public URL (e.g. `https://nightknight-cinema.onrender.com`).
6. Users can install it anywhere in the world using:
   `https://nightknight-cinema.onrender.com/manifest.json`

### Option B: Railway.app
1. Go to [Railway.app](https://railway.app) $\rightarrow$ **New Project $\rightarrow$ Deploy from GitHub repo**.
2. Railway detects the `Dockerfile` or `package.json` and deploys automatically.
3. Under service settings, click **Generate Domain** to get your public HTTPS URL.

### Option C: Docker (Self-Hosted VPS)
```bash
docker build -t nightknight-cinema .
docker run -d -p 7000:7000 --name nightknight-cinema nightknight-cinema
```

---

## ⚙️ Configuration & Custom Scrapers

Visit the web dashboard at `http://127.0.0.1:7000/` (or your deployed cloud URL) to customize settings:

* **Default Scraper**: Uses public high-speed Torrentio (`https://torrentio.strem.fun`).
* **Custom Real-Debrid / Scraper URL**: You can paste your personal Torrentio link with Real-Debrid or AllDebrid configured. The addon will fetch your personal Debrid streams, speed-rank them, and serve them with zero buffering.
* **Auto-Hide High Buffer Risk Streams**: Checkbox to completely hide huge files with low seeders.

Settings are saved in `config.json`.

---

## 📅 Calendar & Reminders Guide for Users

1. **One-Click Tracking (The Reminder Button)**:
   - When browsing any upcoming movie or series in Stremio, click the **`+` (Add to Library)** button on the title card or detail page.
   - Upcoming episodes automatically appear on your Stremio **Calendar**.

2. **In-App & Desktop Release Notifications**:
   - Go to Stremio **Settings** $\rightarrow$ **General** $\rightarrow$ toggle **Notifications: ON**.
   - Stremio triggers desktop alerts when a new episode airs for any show in your Library.

3. **Phone & External Calendar Sync (Apple Calendar, Google Calendar, Outlook)**:
   - In Stremio **Settings** $\rightarrow$ **General**, click **Subscribe to calendar**.
   - Import the `webcal://` link into Apple or Google Calendar for mobile lockscreen alarms and reminders.

---

## 🌐 Endpoints

| Resource | URL Path | Description |
| :--- | :--- | :--- |
| **Web Dashboard** | `/` or `/configure` | Interactive dashboard, settings & one-click install button |
| **Addon Manifest** | `/manifest.json` | Manifest definition for Stremio client registration |
| **Icon / Logo** | `/icon.png` | Addon emblem icon |
| **Background** | `/background.png` | Addon cinematic widescreen background |
| **Speed-Ranked Streams** | `/stream/:type/:id.json` | Returns streams sorted by seeders, speed & CDN reliability |
| **Movies Catalog** | `/catalog/movie/actor_genre_movies.json` | Actor filmographies, search & curated movie genres |
| **Series Catalog** | `/catalog/series/actor_genre_series.json` | Actor filmographies, search & curated TV genres |
| **Live Statistics** | `/api/stats` | Live anonymized install counter and request telemetry |
| **Community Feedback** | `/api/feedback` | Get community feedback or submit comments (GET/POST) |
| **Health Check** | `/api/health` | Diagnostic status of addon and upstream scrapers |
| **Upcoming Movies (16:9)** | `/catalog/movie/upcoming_movies.json` | 16:9 landscape cards for upcoming movies |
| **Upcoming TV Shows (16:9)**| `/catalog/series/on_the_air_series.json` | 16:9 landscape cards for shows airing next 7 days |
| **Calendar Videos** | `/catalog/series/calendar-videos/calendarVideosIds=...` | Stremio calendar air date feed |
| **Metadata** | `/meta/:type/:id.json` | Detailed media metadata, episodes, and stream mappings |

---

## 💬 Community Feedback & Support

We welcome feedback, title suggestions, and feature requests:
- **On the Web Portal**: Use the built-in comment form at [https://nightknight-cinema.onrender.com](https://nightknight-cinema.onrender.com) to post comments or request platforms.
- **GitHub Discussions**: Share ideas, movie recommendations, or ask questions on [GitHub Discussions](https://github.com/NightKnight24/nightknight-cinema/discussions).
- **GitHub Issues**: Report bugs or broken streams via our structured [Issue Templates](https://github.com/NightKnight24/nightknight-cinema/issues/new/choose).

---

## 📜 License & Credits

- **Author**: **NightKnight** (`@NightKnight24`)
- **License**: MIT
