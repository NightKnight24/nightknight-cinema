# ⚔️ NightKnight Cinema — Stremio Addon (v1.3.0)

> **Created by NightKnight**  
> An intelligent, standalone Stremio cinema engine providing Streaming Platform hubs (Netflix, Apple TV+, Max, Disney+), Curated Franchises (MCU, Star Wars, Harry Potter), Critic Badges, Home Theater Audio/Video tags (Dolby Vision, Atmos, IMAX), actor filmographies, 16:9 previews & intelligent zero-buffer stream speed ranking.

---

## ✨ Features

1. **📺 Streaming Platform Hubs**
   - Browse dedicated rows and filter options for all major networks: **Netflix**, **Apple TV+**, **Max (HBO)**, **Disney+**, **Amazon Prime Video**, and **Paramount+**.
   - Discover what's new and trending across top platforms without juggling separate subscriptions or searching blindly.

2. **🍿 Curated Franchises & Cinematic Universes**
   - Instant one-click access to complete sagas in chronological viewing order:
     - 🦸 **Marvel Cinematic Universe (MCU)**
     - 🌌 **Star Wars Saga**
     - ⚡ **Harry Potter & Wizarding World**
     - 💍 **The Lord of the Rings & The Hobbit**
     - 🍸 **James Bond (007 Collection)**
     - 🏮 **Studio Ghibli Masterpieces**
     - 🎬 **Christopher Nolan & Quentin Tarantino Collections**

3. **🍅 Critic Badges & Awards Recognition**
   - Injects verified IMDb ratings, TMDb audience percentages, and Academy Award / Oscar acknowledgments right above the synopsis:
     `⭐ IMDb: 9.3/10 • 🍅 TMDb: 87% (31k votes) • 🏆 Nominated for 7 Oscars`

4. **🔊 Home Cinema Audio & Video Stream Badges**
   - Automatically detects and tags streams with theater-grade specifications:
     - **Dynamic Range**: `✨ Dolby Vision`, `🌈 HDR10+`, `🌈 HDR`, `10-bit`
     - **Sound Codecs**: `🔊 Dolby Atmos`, `🔊 TrueHD 7.1`, `🔊 DTS-HD MA`, `🔊 DTS:X`, `🔊 5.1 Surround`
     - **Editions**: `💎 Lossless Remux`, `🎞️ IMAX Enhanced`, `🎬 Extended / Director's Cut`

5. **⏳ Decade Time-Machine Filters**
   - Nostalgic time travel across movie and television history:
     - **2020s Modern Cinema**
     - **2010s Hits**
     - **2000s Nostalgia**
     - **90s Golden Age Thrillers & Action**
     - **80s Retro Synth & Sci-Fi Classics**
     - **70s Vintage Cinema**

6. **⚡ Intelligent Stream Speed Ranking & Buffer Shield**
   - Automatically analyzes streams from upstream scrapers (Torrentio, Real-Debrid, TorBox, etc.).
   - Places instant CDN streams (`🚀 [INSTANT CDN • 0 BUFFER]`) and high-seeder torrents (`⚡ [FASTEST • 600+ 👤]`) at the very top.
   - Filters dead torrents (0 seeders) and warns against massive low-seeder files.

7. **🎬 Complete Actor & Director Filmographies**
   - Type any actor or director in Stremio's search bar to immediately see their full catalog ranked by popularity.

8. **📅 16:9 Widescreen Landscape Feeds & Calendar Sync**
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
| **Upcoming Movies (16:9)** | `/catalog/movie/upcoming_movies.json` | 16:9 landscape cards for upcoming movies |
| **Upcoming TV Shows (16:9)**| `/catalog/series/on_the_air_series.json` | 16:9 landscape cards for shows airing next 7 days |
| **Calendar Videos** | `/catalog/series/calendar-videos/calendarVideosIds=...` | Stremio calendar air date feed |
| **Metadata** | `/meta/:type/:id.json` | Detailed media metadata, episodes, and stream mappings |

---

## 📜 License & Credits

- **Author**: **NightKnight**
- **License**: MIT
