# Oikonomos

> A self-hosted personal planner with AI chat, Google Calendar sync, Gmail analysis, and offline PWA support — all running locally.

---

## Features

### 📅 Calendar & Scheduling
- **Month and week views** with at-a-glance task and event indicators
- **Daily task panel** — create, edit, reorder (drag-and-drop), and track tasks
- **Task statuses** — pending, done, failed, postponed (with history tracking and postpone count)
- **Calendar events** with optional time, description, and tags
- **Tags** — normalized (trimmed, lowercased), attached to tasks and events

### ✅ Personal Organisation
- **Goals** — track what you're working toward with completion state
- **Shopping list** — split into *needed* and *wanted*, mark items as got
- **Long-term todos** — a backlog separate from your daily calendar

### 🤖 AI Assistant
- **Chat page** powered by a local [Ollama](https://ollama.com) model (`qwen2.5:14b`)
- Understands your current tasks, events, goals, shopping list, and todos
- **Tool calling** — tell the AI to add a task, event, goal, or shopping item and it will do it
- **Custom system prompt** configurable in Settings

### 📧 Gmail Analysis
- Connects to your Gmail inbox via Google OAuth (read-only)
- **Summary page** — click *Analyse Emails* for an AI-generated daily briefing
- Highlights urgent items, deadlines, and key information
- **Custom email summary prompt** configurable in Settings

### 📱 Offline PWA (iOS & Android)
- **Add to Home Screen** from Safari (iOS) or Chrome (Android) for a fullscreen native-like experience
- **Offline reads** — Workbox caches the app shell and all API responses; browse tasks and events without a connection
- **Offline writes** — mutations made while offline are queued to `localStorage` and automatically replayed when connectivity returns
- **Sync banner** shows how many changes are pending while disconnected
- See [PWA Setup](#pwa-setup-ios) for HTTPS configuration

### 🔄 Google Calendar Sync
- Bidirectional sync with Google Calendar over a 90-day window
- Optionally sync tasks as all-day events
- Auto-syncs every 5 minutes in the background
- Full OAuth2 flow — no passwords stored, tokens auto-refreshed

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Express.js (Node 20) |
| Database | SQLite (via `sqlite3`) |
| AI | Ollama (`qwen2.5:14b`) |
| Google APIs | Calendar v3 · Gmail v1 |
| PWA / Offline | vite-plugin-pwa + Workbox |
| Containerisation | Docker + Docker Compose |

---

## Running with Docker

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Ollama](https://ollama.com) running locally with `qwen2.5:14b` pulled:
  ```bash
  ollama pull qwen2.5:14b
  ```

### Start

```bash
git clone <repo-url>
cd Oikonomos
docker compose up -d
```

Open **http://localhost:3001**

The SQLite database is persisted to `./data/data.sqlite` on your host.

### Stop / Rebuild

```bash
docker compose down              # stop
docker compose up -d --build     # rebuild and start
```

---

## Running in Development

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start both backend (port 3002) and frontend (port 5173) concurrently
npm run dev
```

Open **http://localhost:5173** — Vite proxies `/api` requests to the backend.

| Script | What it does |
|---|---|
| `npm run dev` | Start backend + frontend together |
| `npm run dev:backend` | Backend only (port 3002) |
| `npm run dev:frontend` | Frontend only (port 5173) |

---

## Google Calendar & Gmail Setup

Both features share a single Google OAuth app. You need a Google Cloud project with **Calendar API** and **Gmail API** enabled.

### 1. Create OAuth credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → select or create a project
2. **APIs & Services → Library** → enable **Google Calendar API**
3. **APIs & Services → Library** → enable **Gmail API**
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorised redirect URI: `http://localhost:3001/api/auth/google/callback`
5. Copy the **Client ID** and **Client Secret**

### 2. Connect in Settings

1. Open the app → **Settings → Google Calendar Sync**
2. Paste your Client ID and Client Secret → click **Save & Connect Google Calendar**
3. Complete the Google sign-in popup

### 3. Grant Gmail access

1. **Settings → Email Analysis → Reauthorize with Gmail Access**
2. Complete the popup — Google will show both Calendar and Gmail permissions
3. Click **Test Gmail Connection** to confirm it worked
4. Enable the **Enable email analysis** toggle
5. Go to **Summary** and click **Analyse Emails**

---

## Configuration

All runtime configuration is stored in the SQLite `settings` table and managed through the Settings page. No `.env` file is required.

| Setting key | Description |
|---|---|
| `google_client_id` | Google OAuth client ID |
| `google_client_secret` | OAuth client secret (write-only) |
| `google_calendar_id` | Target calendar (default: `primary`) |
| `google_sync_events` | Sync events from Google Calendar (`1`/`0`) |
| `google_sync_tasks` | Sync tasks as all-day events (`1`/`0`) |
| `email_enabled` | Enable Gmail analysis (`1`/`0`) |
| `email_fetch_count` | How many recent emails to analyse (default: `20`) |
| `prompt_chat_system` | Custom AI chat system prompt (blank = default) |
| `prompt_email_summary` | Custom email briefing prompt (blank = default) |

Docker environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `DB_PATH` | `/data/data.sqlite` | Database file path |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |

---

## PWA Setup (iOS)

Service workers require HTTPS. The recommended approach uses **Tailscale** (which you likely already have for remote access) to provide a trusted TLS certificate without any manual cert management.

### 1. Enable HTTPS Certificates in Tailscale

In the [Tailscale admin console](https://login.tailscale.com/admin/dns) → **DNS** → enable **HTTPS Certificates**.

### 2. Register Tailscale serve

```bash
tailscale serve --https=8443 http://localhost:3001
```

This tells Tailscale to terminate TLS on port 8443 of your `<machine>.ts.net` hostname and forward to the app. The config persists across reboots.

### 3. Add to Home Screen on iPhone

1. Install **Tailscale** on your iPhone and connect to your tailnet
2. Open **Safari** and navigate to `https://<machine>.ts.net:8443`
3. Tap **Share → Add to Home Screen**

The app launches fullscreen with no browser chrome. On first open it caches the current month's data for offline use.

### Offline behaviour

| Action | Behaviour |
|---|---|
| Browse tasks/events (offline) | Served from Workbox cache (up to 7 days old) |
| Create/edit/delete (offline) | Queued in `localStorage`, banner shows pending count |
| Reconnect | Queue replays automatically, view refreshes |
| Chat / Email analysis (offline) | Not queued — requires live server |

---

## Architecture

```
frontend/src/
  App.jsx              # Root — owns month/date state, fetches tasks & events
  components/          # Calendar, DayTasks, DayEvents, ChatPage, SummaryPage, SettingsPage …
  api/
    client.js          # Task & event HTTP calls (offline-queue-aware)
    settingsClient.js  # Settings, Google auth, email analysis calls
  state/tasks.js       # Pure state-transform helpers (no store)
  offlineQueue.js      # localStorage queue for offline mutations + flush logic

backend/src/
  server.js            # Express app + route registration
  db.js                # SQLite wrapper (promisified run/get/all) + schema init
  schema.sql           # Table definitions (tasks, events, goals, tags, settings …)
  prompts.js           # LLM model name, system prompts, tool definitions, context builder
  routes/
    tasks.js           # CRUD + reorder + postpone + history
    events.js          # CRUD
    chat.js            # Ollama /api/chat proxy with tool-call parsing
    email.js           # /analyse + /test-connection
    auth.js            # Google OAuth flow (URL → callback → disconnect)
    settings.js        # KV store get/set (filters sensitive keys on read)
    sync.js            # Trigger Google Calendar pull/push
    …
  google/
    auth.js            # OAuth2 client, token persistence, scope definitions
    sync.js            # Bidirectional Calendar reconciliation logic
    fieldmap.js        # Converts between local and Google event schemas
  email/
    gmail.js           # Gmail API — fetch messages, decode MIME plaintext
```

**Data flow:**
```
App.jsx → api/client.js → Express routes → db.js → SQLite
                                        → google/sync.js → Google Calendar API
                                        → email/gmail.js → Gmail API
                                        → Ollama HTTP API
```

---

## Ports

| Service | Dev | Docker |
|---|---|---|
| App (frontend + API) | 5173 / 3002 | **3001** |
| Ollama | 11434 | 11434 (host) |

---

## License

MIT
