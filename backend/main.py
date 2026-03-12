# main.py
# SENTINEL backend entry point
# Starts the FastAPI server and launches the simulation loop
# as a background task on startup.

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.api.routes import router
from backend.simulation.loop import simulation_loop, stop_simulation
from backend.classifier.model import train_classifier


# ── Lifespan ──────────────────────────────────────────────────────────────────
# Manages startup and shutdown of the simulation loop alongside FastAPI.
# The loop runs as a background asyncio task — same event loop as the server.

@asynccontextmanager
async def lifespan(app: FastAPI):
    train_classifier() 
    # Start simulation loop on server startup
    loop_task = asyncio.create_task(simulation_loop())
    yield
    # Stop simulation cleanly on server shutdown
    stop_simulation()
    loop_task.cancel()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SENTINEL",
    description="Simulated ENtity Threat Intelligence & Engagement Layer",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow React frontend to call the API during local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server default port
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "SENTINEL online"}