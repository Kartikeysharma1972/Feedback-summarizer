import os
import csv
import uuid
import json
import hashlib
import asyncio
from typing import Optional, AsyncGenerator
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from agent import run_agent

load_dotenv()

app = FastAPI(title="CodeSentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── CSV User Storage ─────────────────────────────────────────────

USERS_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.csv")


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _init_csv():
    """Create users.csv with header row if it doesn't exist."""
    if not os.path.exists(USERS_CSV):
        with open(USERS_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["name", "email", "password_hash"])


# ─── Auth Models ──────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ─── Auth Endpoints ──────────────────────────────────────────────

@app.post("/auth/signup")
async def signup(request: SignupRequest):
    _init_csv()

    # Validate inputs
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not request.email.strip():
        raise HTTPException(status_code=400, detail="Email is required")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check if email already exists
    with open(USERS_CSV, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["email"].strip().lower() == request.email.strip().lower():
                raise HTTPException(status_code=400, detail="An account with this email already exists")

    # Append new user
    with open(USERS_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            request.name.strip(),
            request.email.strip().lower(),
            _hash_password(request.password),
        ])

    return {
        "user": {
            "name": request.name.strip(),
            "email": request.email.strip().lower(),
        }
    }


@app.post("/auth/login")
async def login(request: LoginRequest):
    _init_csv()

    password_hash = _hash_password(request.password)

    with open(USERS_CSV, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if (
                row["email"].strip().lower() == request.email.strip().lower()
                and row["password_hash"] == password_hash
            ):
                return {
                    "user": {
                        "name": row["name"],
                        "email": row["email"],
                    }
                }

    raise HTTPException(status_code=401, detail="Invalid email or password")


# ─── Review Logic ─────────────────────────────────────────────────

sessions: dict[str, asyncio.Queue] = {}


class ReviewRequest(BaseModel):
    input_type: str  # "code" or "github_url"
    content: str


@app.post("/review")
async def start_review(request: ReviewRequest):
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    session_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    sessions[session_id] = queue

    asyncio.create_task(
        _run_agent_task(session_id, request.input_type, request.content, queue)
    )

    return {"session_id": session_id}


async def _run_agent_task(session_id: str, input_type: str, content: str, queue: asyncio.Queue):
    try:
        async for event in run_agent(input_type, content):
            await queue.put(event)
    except Exception as e:
        await queue.put({"type": "error", "message": str(e)})
    finally:
        await queue.put(None)  # Sentinel


@app.get("/stream/{session_id}")
async def stream_review(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    queue = sessions[session_id]

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            while True:
                event = await asyncio.wait_for(queue.get(), timeout=300.0)
                if event is None:
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    break
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0)
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Timeout'})}\n\n"
        finally:
            sessions.pop(session_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
