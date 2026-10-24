# ⚔️ NightKnight Cinema — Stremio Addon (v1.2.0)

> **Created by NightKnight**  
> An intelligent Stremio addon providing complete actor & director filmographies, curated deep genres, 16:9 widescreen upcoming release feeds, calendar synchronization, and an **Intelligent Stream Speed Ranking Engine & Buffer Shield**.

---

## ✨ Features

1. **⚡ Intelligent Stream Speed Ranking & Buffer Shield**
   - Automatically queries and analyzes streams from upstream scrapers (such as Torrentio or personal Debrid endpoints).
   - Computes a real-time **Speed & Streamability Score**:
     - **Debrid Cloud CDN Streams (`[RD+]`, `[AD+]`, `[TB+]`)**: Ranked #1 as `🚀 [INSTANT CDN • 0 BUFFER]` for instant multi-gigabit playback.
     - **P2P Torrents**: Evaluates seeders vs file size. The highest-seeding streams (e.g. 800+ seeders) are badged `⚡ [FASTEST • 894 👤]` and placed right at the top.
     - **Buffer Warning**: Identifies high-risk streams (such as uncompressed 80GB remuxes with only 5 seeders) and flags them with `⚠️ [HIGH BUFFER RISK]`, moving them to the bottom so users don't encounter buffer stalls.
     - **Dead Stream Elimination**: Automatically filters out dead torrents with 0 seeders.

2. **🎬 Complete Actor & Director Filmographies**
   - Type any actor or director in Stremio's search bar (e.g. *Cillian Murphy*, *Leonardo DiCaprio*, *Florence Pugh*, *Christopher Nolan*) to immediately view their complete movie and TV filmography, ranked by popularity.

3. **📅 16:9 Widescreen Landscape Feeds**
   - **Upcoming Movie Releases**: Widescreen 16:9 backdrop cards for upcoming theatrical and digital releases.
   - **Upcoming TV Shows (Airing Soon)**: Shows with new episodes airing in the next 7 days.
   - **TV Shows Airing Today**: Live daily airing schedule.

4. **🎭 Curated Deep Genres**
   - **Movies**: Cyberpunk, Superhero, Anime, Film-Noir, Korean Cinema, Martial Arts, Stand-Up Comedy, Classic Cinema, etc.
   - **Series**: K-Drama, Anime, Reality-TV, Sci-Fi & Fantasy, Crime, War & Politics, etc.

5. **📆 Stremio Calendar Synchronization (`calendar-videos`)**
   - Feeds upcoming season and episode air dates into Stremio's built-in **Calendar** grid for all shows added to your Library from this addon.

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
