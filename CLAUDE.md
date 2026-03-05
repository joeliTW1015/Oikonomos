# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev              # Start both backend and frontend concurrently
npm run dev:backend      # Start backend only (port 3001)
npm run dev:frontend     # Start frontend only (port 5173)
```

### Frontend only
```bash
cd frontend && npm run build    # Production build
cd frontend && npm run preview  # Preview production build
```

There are no test or lint scripts configured.

## Architecture

Oikonomos is a task/calendar app organized as a monorepo with separate `backend/` and `frontend/` packages.

### Backend (`backend/src/`)
- **Express.js** server on port 3001 (CommonJS modules)
- **SQLite** via `db.js`, which promisifies the callback-based sqlite3 API into `run()`, `get()`, `all()` helpers and auto-initializes the schema from `schema.sql` on startup
- Routes in `routes/tasks.js` and `routes/tags.js` mounted at `/api/tasks` and `/api/tags`
- Foreign key constraints enforced; schema uses a junction table `task_tags` for the many-to-many task↔tag relationship

### Frontend (`frontend/src/`)
- **React 18** + **Vite** (ES modules)
- `App.jsx` is the orchestrator: owns month/date state, fetches tasks, and passes handlers down to `Calendar.jsx` and `DayTasks.jsx`
- `api/client.js` centralizes all HTTP calls; Vite proxies `/api` requests to `http://localhost:3001` so no CORS issues during dev
- `state/tasks.js` contains utility functions for state transformations (not a store)
- No external state management library — plain `useState`/`useEffect`/`useMemo`

### Data flow
```
App.jsx → api/client.js → Express routes → db.js → SQLite
```

### Key conventions
- Dates are always ISO 8601 strings (`YYYY-MM-DD`)
- Tags are stored normalized (trimmed, lowercased, deduplicated) on both client and server
- Month queries use `?month=YYYY-MM`; day queries use `?date=YYYY-MM-DD`
