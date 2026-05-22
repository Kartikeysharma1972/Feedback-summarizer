import os
import uuid
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import init_db, get_db
from models import (
    SignupRequest, LoginRequest, UserResponse,
    FeedbackRequest, FeedbackResponse,
    SummarizeRequest, SummaryResponse,
)
from auth import get_user_by_email, create_user, verify_password
from groq_client import generate_feedback, summarize_document
from file_parser import extract_text

load_dotenv()


@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield


app = FastAPI(title="Teacher Toolkit API", version="1.0.0", lifespan=lifespan)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Auth ──────────────────────────────────────────────────────────

@app.post("/auth/signup", response_model=UserResponse)
async def signup(req: SignupRequest, db=Depends(get_db)):
    existing = await get_user_by_email(db, req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = await create_user(db, req.name, req.email, req.password)
    return user


@app.post("/auth/login", response_model=UserResponse)
async def login(req: LoginRequest, db=Depends(get_db)):
    user = await get_user_by_email(db, req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"id": user["id"], "name": user["name"], "email": user["email"]}


# ── Feedback ──────────────────────────────────────────────────────

@app.post("/feedback/generate", response_model=FeedbackResponse)
async def create_feedback(req: FeedbackRequest, db=Depends(get_db)):
    if not req.ratings or len(req.ratings) == 0:
        raise HTTPException(status_code=400, detail="Please provide at least one star rating before generating feedback.")
    try:
        feedback_text = await generate_feedback(
            req.student_name, req.feedback_type, req.context or "", req.tone, req.grade_level, req.ratings
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    feedback_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    ratings_json = json.dumps(req.ratings) if req.ratings else None

    await db.execute(
        """INSERT INTO feedback_history
           (id, user_id, student_name, feedback_type, context, generated_feedback, tone, grade_level, ratings, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (feedback_id, req.user_id, req.student_name, req.feedback_type,
         req.context or "", feedback_text, req.tone, req.grade_level, ratings_json, now),
    )
    await db.commit()

    return FeedbackResponse(
        id=feedback_id, student_name=req.student_name, feedback_type=req.feedback_type,
        context=req.context, tone=req.tone, grade_level=req.grade_level,
        generated_feedback=feedback_text, ratings=req.ratings, created_at=now,
    )


@app.get("/feedback/history")
async def get_feedback_history(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM feedback_history WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    )
    rows = await cursor.fetchall()
    results = []
    for r in rows:
        ratings_data = None
        try:
            if len(r) > 9 and r[9]:
                ratings_data = json.loads(r[9])
        except Exception:
            pass
        created = r[8] if len(r) <= 9 else (r[10] if len(r) > 10 else r[8])
        results.append(FeedbackResponse(
            id=r[0], student_name=r[2], feedback_type=r[3], context=r[4],
            generated_feedback=r[5], tone=r[6], grade_level=r[7],
            ratings=ratings_data, created_at=r[8],
        ))
    return results


@app.delete("/feedback/history/{feedback_id}")
async def delete_feedback(feedback_id: str, db=Depends(get_db)):
    await db.execute("DELETE FROM feedback_history WHERE id = ?", (feedback_id,))
    await db.commit()
    return {"status": "deleted"}


# ── Summarizer ────────────────────────────────────────────────────

@app.post("/summarizer/summarize", response_model=SummaryResponse)
async def create_summary(req: SummarizeRequest, db=Depends(get_db)):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Document text cannot be empty")

    try:
        summary_text = await summarize_document(req.text, req.document_type, req.summary_length)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    summary_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        """INSERT INTO summary_history
           (id, user_id, document_name, document_type, original_text, summary, summary_length, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (summary_id, req.user_id, req.document_name, req.document_type,
         req.text[:5000], summary_text, req.summary_length, now),
    )
    await db.commit()

    return SummaryResponse(
        id=summary_id, document_name=req.document_name, document_type=req.document_type,
        summary=summary_text, summary_length=req.summary_length, created_at=now,
    )


@app.post("/summarizer/upload", response_model=SummaryResponse)
async def upload_and_summarize(
    file: UploadFile = File(...),
    document_name: str = Form(...),
    document_type: str = Form(...),
    summary_length: str = Form(...),
    user_id: str = Form(...),
    db=Depends(get_db),
):
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        text = extract_text(file_bytes, file.filename or "unknown.txt")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        summary_text = await summarize_document(text, document_type, summary_length)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    summary_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        """INSERT INTO summary_history
           (id, user_id, document_name, document_type, original_text, summary, summary_length, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (summary_id, user_id, document_name, document_type,
         text[:5000], summary_text, summary_length, now),
    )
    await db.commit()

    return SummaryResponse(
        id=summary_id, document_name=document_name, document_type=document_type,
        summary=summary_text, summary_length=summary_length, created_at=now,
    )


@app.get("/summarizer/history")
async def get_summary_history(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM summary_history WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    )
    rows = await cursor.fetchall()
    return [
        SummaryResponse(
            id=r[0], document_name=r[2], document_type=r[3],
            summary=r[5], summary_length=r[6], created_at=r[7],
        )
        for r in rows
    ]


@app.delete("/summarizer/history/{summary_id}")
async def delete_summary(summary_id: str, db=Depends(get_db)):
    await db.execute("DELETE FROM summary_history WHERE id = ?", (summary_id,))
    await db.commit()
    return {"status": "deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
