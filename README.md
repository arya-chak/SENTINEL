# SENTINEL
### Simulated ENtity Threat Intelligence & Engagement Layer

SENTINEL is a full-stack simulation of an AI-assisted battlefield command and control interface, inspired by Palantir Gotham and Anduril's Lattice/EagleEye platforms. It demonstrates human-in-the-loop AI design applied to a tactical decision-making context. This project is an educational simulation. It is not affiliated with Palantir, Anduril, or any defense organization.

---

## What Is SENTINEL?

SENTINEL puts you in the seat of a battlefield operator managing a live tactical operations interface. Entities — hostile, friendly, civilian, and ambiguous — move across a dark-tile map in real time. A scikit-learn threat classifier scores each one. When you need deeper reasoning, the Claude API generates a natural language intelligence brief: evidence summary, reasoning chain, civilian risk assessment, and recommended action.

You decide: approve engagement, deny, pull a friendly back, request more intel. A countdown timer applies time pressure. When the scenario ends, a debrief screen scores your decisions against ground truth and surfaces where you agreed or disagreed with the AI.

The system is designed around one core tension: **the classifier and the LLM will sometimes disagree.** That disagreement is shown to you explicitly. The point isn't to automate decisions, it's to make better-informed ones.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Simulation & API | Python 3.13, FastAPI, uvicorn |
| Classifier | scikit-learn, numpy, pandas |
| LLM Explainer | Claude API (`claude-sonnet-4-6`), anthropic SDK |
| Frontend | React 19, Vite 6, TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Map | MapLibre GL JS + react-map-gl |
| Map Tiles | Stadia Maps `alidade_smooth_dark` (free, no API key) |
| State | Zustand v5 + TanStack Query v5 |
| Charts | Recharts v2 |
| Animation | Framer Motion v12 |
| Package Manager | pnpm |

---

## Prerequisites

| Dependency | Version | Notes |
|---|---|---|
| Python | 3.11+ | With `pip` available in PATH |
| Node.js | 22.x | Target version for the frontend |
| pnpm | Latest | `brew install pnpm` |
| Anthropic API Key | — | Required for the AI explanation layer |

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/arya-chak/sentinel.git
cd sentinel
```

### 2. Set your Anthropic API key

The AI explanation layer requires a valid Anthropic API key. Export it before starting the backend:

```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

> **Tip:** Add this to your `~/.zshrc` so you don't have to re-enter it each session.

### 3. Set up the Python environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Install frontend dependencies

```bash
cd frontend
pnpm install
```

---

## Running SENTINEL

SENTINEL requires two processes running concurrently. Open two terminal tabs.

**Terminal 1 — Backend**

From the project root with your virtual environment activated:

```bash
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

On startup the backend will train the threat classifier, launch the battlespace simulation loop, and begin serving the REST API at `http://localhost:8000`.

**Terminal 2 — Frontend**

```bash
cd frontend
pnpm dev
```

The Vite dev server starts at `http://localhost:5173` with hot module reload enabled.

---

## Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Health Check | http://localhost:8000/ |
| Swagger Docs | http://localhost:8000/docs |

> **Health check:** A healthy backend returns `{"status": "SENTINEL online"}` at `http://localhost:8000/`.

---

## Stopping the Application

Press `Ctrl+C` in each terminal. The simulation loop shuts down cleanly on SIGINT.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend can't reach backend | Confirm the backend is running on port 8000. Check CORS is enabled for `http://localhost:5173`. |
| `ANTHROPIC_API_KEY` not set | Export the key in the same terminal session before running `uvicorn`. |
| `pnpm` not found | `brew install pnpm` |
| Module not found (Python) | Ensure the venv is activated (`source venv/bin/activate`) before running `uvicorn`. |
| Port already in use | `lsof -ti:8000 \| xargs kill` |

---

*SENTINEL v0.1.0 — educational simulation project*
