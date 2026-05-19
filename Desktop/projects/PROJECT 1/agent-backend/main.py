"""
Research Agent — FastAPI Backend
Provides REST + SSE endpoints for the autonomous research agent.
"""

from __future__ import annotations

import asyncio
import csv
import hashlib
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from collections import defaultdict
from datetime import datetime
from pathlib import Path
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sse_starlette.sse import EventSourceResponse

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# ── User CSV Storage ─────────────────────────────────────────────────────────
USERS_CSV_PATH = Path(__file__).parent / "users.csv"

def init_users_csv():
    """Initialize users CSV file if it doesn't exist."""
    if not USERS_CSV_PATH.exists():
        with open(USERS_CSV_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['id', 'name', 'email', 'password_hash', 'created_at'])

def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def get_user_by_email(email: str) -> dict | None:
    """Find user by email in CSV."""
    if not USERS_CSV_PATH.exists():
        return None
    with open(USERS_CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['email'].lower() == email.lower():
                return row
    return None

def create_user(name: str, email: str, password: str) -> dict:
    """Create new user in CSV."""
    init_users_csv()
    user_id = str(uuid.uuid4())[:8]
    password_hash = hash_password(password)
    created_at = datetime.now().isoformat()
    
    with open(USERS_CSV_PATH, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([user_id, name, email, password_hash, created_at])
    
    return {'id': user_id, 'name': name, 'email': email, 'created_at': created_at}

# ── Session store ────────────────────────────────────────────────────────────
# Maps session_id -> asyncio.Queue of SSE events
_session_queues: dict[str, asyncio.Queue] = {}
_session_results: dict[str, dict] = {}

# Simple rate limiting: IP -> list of timestamps
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_REQUESTS = 10  # requests per window
RATE_LIMIT_WINDOW = 60  # seconds


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Research Agent API starting up…")
    yield
    logger.info("Research Agent API shutting down…")


app = FastAPI(
    title="Autonomous Research Agent API",
    description="LangGraph-powered autonomous research agent with SSE streaming.",
    version="1.0.0",
    lifespan=lifespan,
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Models ──────────────────────────────────────────────────

class ResearchRequest(BaseModel):
    topic: str
    session_id: str | None = None


class ResearchResponse(BaseModel):
    session_id: str
    message: str


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


# ── Background Research Runner ───────────────────────────────────────────────

async def run_research(session_id: str, topic: str) -> None:
    """Execute the LangGraph research pipeline and push events to the session queue."""
    from agent import RESEARCH_GRAPH, ResearchState

    queue = _session_queues[session_id]

    async def push(event_type: str, data: dict) -> None:
        await queue.put({"event": event_type, "data": json.dumps(data)})

    await push("start", {"message": f"Starting research on: {topic}", "session_id": session_id})

    initial_state: ResearchState = {
        "topic": topic,
        "session_id": session_id,
        "sub_questions": [],
        "search_results": {},
        "extracted_content": {},
        "draft_report": "",
        "reflection_notes": "",
        "final_report": {},
        "events": [],
        "error": None,
    }

    try:
        # Stream node-by-node via LangGraph's astream
        async for chunk in RESEARCH_GRAPH.astream(initial_state):
            for node_name, node_state in chunk.items():
                # Relay all events emitted by this node
                for evt in (node_state.get("events") or []):
                    await push("node_event", {
                        "node": evt["node"],
                        "status": evt["status"],
                        "data": evt.get("data"),
                    })

                # When refinement is done, send the final report
                if node_name == "refinement" and node_state.get("final_report"):
                    _session_results[session_id] = node_state["final_report"]
                    await push("report_ready", {
                        "report": node_state["final_report"],
                        "session_id": session_id,
                    })

    except Exception as exc:
        logger.error("Research pipeline error: %s", exc, exc_info=True)
        await push("error", {"message": f"Research failed: {exc}"})
    finally:
        await push("done", {"message": "Research complete.", "session_id": session_id})
        await queue.put(None)  # Sentinel — close stream


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "research-agent-api"}


# ── Auth Endpoints ────────────────────────────────────────────────────────────

@app.post("/auth/signup")
async def signup(request: SignupRequest):
    """Register a new user."""
    # Check if user already exists
    existing = get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Create user
    user = create_user(request.name, request.email, request.password)
    logger.info(f"New user registered: {request.email}")
    
    return {"message": "Account created successfully", "user": user}


@app.post("/auth/login")
async def login(request: LoginRequest):
    """Authenticate user."""
    user = get_user_by_email(request.email)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user['password_hash'] != hash_password(request.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    logger.info(f"User logged in: {request.email}")
    
    return {
        "message": "Login successful",
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email']
        }
    }


def check_rate_limit(client_ip: str) -> bool:
    """Simple rate limiting: max 10 requests per minute per IP."""
    now = time.time()
    timestamps = _rate_limit_store[client_ip]
    # Remove old timestamps outside the window
    timestamps[:] = [ts for ts in timestamps if now - ts < RATE_LIMIT_WINDOW]
    
    if len(timestamps) >= RATE_LIMIT_REQUESTS:
        return False
    
    timestamps.append(now)
    return True


@app.post("/research", response_model=ResearchResponse)
async def start_research(request: ResearchRequest, req: Request):
    # Rate limiting
    client_ip = req.client.host if req.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW}s."
        )
    
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")
    if len(topic) > 500:
        raise HTTPException(status_code=400, detail="Topic too long (max 500 chars).")

    session_id = request.session_id or str(uuid.uuid4())
    _session_queues[session_id] = asyncio.Queue()

    asyncio.create_task(run_research(session_id, topic))

    return ResearchResponse(
        session_id=session_id,
        message="Research started. Connect to /stream/{session_id} for live updates.",
    )


@app.get("/stream/{session_id}")
async def stream_research(session_id: str):
    """SSE endpoint — streams agent progress events to the client in real time."""
    if session_id not in _session_queues:
        raise HTTPException(status_code=404, detail="Session not found. Start research first.")

    queue = _session_queues[session_id]

    async def event_generator() -> AsyncGenerator:
        try:
            while True:
                item = await asyncio.wait_for(queue.get(), timeout=120.0)
                if item is None:
                    yield {"event": "close", "data": json.dumps({"message": "Stream closed."})}
                    break
                yield item
        except asyncio.TimeoutError:
            yield {"event": "error", "data": json.dumps({"message": "Stream timed out."})}
        finally:
            _session_queues.pop(session_id, None)

    return EventSourceResponse(event_generator())


@app.get("/report/{session_id}")
async def get_report(session_id: str):
    """Retrieve the final structured report for a completed session."""
    report = _session_results.get(session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not ready or session not found.")
    return report


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
