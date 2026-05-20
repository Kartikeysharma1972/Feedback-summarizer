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
    BatchFeedbackRequest, BatchFeedbackResponse,
    ShareTokenRequest, ShareTokenResponse, StudentPortalData,
    SummarizeRequest, SummaryResponse,
    CreateRubricRequest, UpdateRubricRequest, RubricResponse, RubricCriterionResponse,
)
from auth import get_user_by_email, create_user, verify_password
from groq_client import generate_feedback, summarize_document, analyze_sentiment
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
    rubric_data = None
    if req.rubric_id and req.rubric_scores:
        cursor = await db.execute(
            "SELECT id, name, description FROM rubric_templates WHERE id = ?", (req.rubric_id,))
        rubric_row = await cursor.fetchone()
        if rubric_row:
            crit_cursor = await db.execute(
                "SELECT * FROM rubric_criteria WHERE rubric_id = ? ORDER BY sort_order", (req.rubric_id,))
            crit_rows = await crit_cursor.fetchall()
            criteria_with_scores = []
            for c in crit_rows:
                cid = c[0] if isinstance(c, tuple) else c["id"]
                cname = c[2] if isinstance(c, tuple) else c["name"]
                score = req.rubric_scores.get(cid, 3)
                level_key = f"level_{score}"
                label_col = f"{level_key}_label"
                desc_col = f"{level_key}_description"
                if isinstance(c, tuple):
                    col_map = {
                        "level_1_label": 5, "level_1_description": 6,
                        "level_2_label": 7, "level_2_description": 8,
                        "level_3_label": 9, "level_3_description": 10,
                        "level_4_label": 11, "level_4_description": 12,
                        "level_5_label": 13, "level_5_description": 14,
                    }
                    level_label = c[col_map.get(label_col, 9)]
                    level_desc = c[col_map.get(desc_col, 10)]
                else:
                    level_label = c[label_col]
                    level_desc = c[desc_col]
                criteria_with_scores.append({
                    "name": cname,
                    "score": score,
                    "level_label": level_label or f"Level {score}",
                    "level_description": level_desc,
                })
            rubric_data = {
                "name": rubric_row[1] if isinstance(rubric_row, tuple) else rubric_row["name"],
                "criteria": criteria_with_scores,
            }

    try:
        feedback_text = await generate_feedback(
            req.student_name, req.feedback_type, req.context or "", req.tone, req.grade_level,
            req.ratings, rubric_data,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    sentiment = await analyze_sentiment(feedback_text)

    feedback_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    ratings_json = json.dumps(req.ratings) if req.ratings else None
    rubric_scores_json = json.dumps(req.rubric_scores) if req.rubric_scores else None

    await db.execute(
        """INSERT INTO feedback_history
           (id, user_id, student_name, feedback_type, context, generated_feedback, tone, grade_level, ratings,
            sentiment_label, sentiment_score, sentiment_breakdown, sentiment_keywords,
            rubric_id, rubric_scores, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (feedback_id, req.user_id, req.student_name, req.feedback_type,
         req.context or "", feedback_text, req.tone, req.grade_level, ratings_json,
         sentiment.get("label"), sentiment.get("score"),
         json.dumps(sentiment.get("breakdown")), json.dumps(sentiment.get("keywords", [])),
         req.rubric_id, rubric_scores_json, now),
    )
    await db.commit()

    return FeedbackResponse(
        id=feedback_id, student_name=req.student_name, feedback_type=req.feedback_type,
        context=req.context, tone=req.tone, grade_level=req.grade_level,
        generated_feedback=feedback_text, ratings=req.ratings,
        sentiment_label=sentiment.get("label"), sentiment_score=sentiment.get("score"),
        sentiment_breakdown=sentiment.get("breakdown"), sentiment_keywords=sentiment.get("keywords", []),
        rubric_id=req.rubric_id, rubric_scores=req.rubric_scores,
        created_at=now,
    )


@app.get("/feedback/history")
async def get_feedback_history(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        """SELECT id, user_id, student_name, feedback_type, context, generated_feedback,
                  tone, grade_level, ratings, sentiment_label, sentiment_score,
                  sentiment_breakdown, sentiment_keywords, created_at
           FROM feedback_history WHERE user_id = ? ORDER BY created_at DESC""",
        (user_id,),
    )
    rows = await cursor.fetchall()
    results = []
    for r in rows:
        ratings_data = None
        sentiment_bd = None
        sentiment_kw = None
        try:
            if r[8]:
                ratings_data = json.loads(r[8])
        except Exception:
            pass
        try:
            if r[11]:
                sentiment_bd = json.loads(r[11])
        except Exception:
            pass
        try:
            if r[12]:
                sentiment_kw = json.loads(r[12])
        except Exception:
            pass
        results.append(FeedbackResponse(
            id=r[0], student_name=r[2], feedback_type=r[3], context=r[4],
            generated_feedback=r[5], tone=r[6], grade_level=r[7],
            ratings=ratings_data, sentiment_label=r[9], sentiment_score=r[10],
            sentiment_breakdown=sentiment_bd, sentiment_keywords=sentiment_kw,
            created_at=r[13],
        ))
    return results


@app.post("/feedback/batch", response_model=BatchFeedbackResponse)
async def batch_feedback(req: BatchFeedbackRequest, db=Depends(get_db)):
    if not req.students or len(req.students) > 30:
        raise HTTPException(status_code=400, detail="Provide 1-30 students per batch")

    rubric_data_template = None
    rubric_criteria_rows = None
    if req.rubric_id:
        cursor = await db.execute(
            "SELECT id, name, description FROM rubric_templates WHERE id = ?", (req.rubric_id,))
        rubric_row = await cursor.fetchone()
        if rubric_row:
            crit_cursor = await db.execute(
                "SELECT * FROM rubric_criteria WHERE rubric_id = ? ORDER BY sort_order", (req.rubric_id,))
            rubric_criteria_rows = await crit_cursor.fetchall()
            rubric_data_template = {
                "name": rubric_row[1] if isinstance(rubric_row, tuple) else rubric_row["name"],
            }

    results = []
    completed = 0
    failed = 0

    for student in req.students:
        s_name = student.get("student_name", "").strip() if isinstance(student, dict) else student.student_name.strip()
        s_context = (student.get("context") if isinstance(student, dict) else student.context) or ""
        s_ratings = student.get("ratings") if isinstance(student, dict) else student.ratings
        s_rubric_scores = student.get("rubric_scores") if isinstance(student, dict) else student.rubric_scores

        rubric_data = None
        if rubric_data_template and rubric_criteria_rows and s_rubric_scores:
            criteria_with_scores = []
            for c in rubric_criteria_rows:
                cid = c[0] if isinstance(c, tuple) else c["id"]
                cname = c[2] if isinstance(c, tuple) else c["name"]
                score = s_rubric_scores.get(cid, 3)
                if isinstance(c, tuple):
                    col_map = {
                        "level_1_label": 5, "level_1_description": 6,
                        "level_2_label": 7, "level_2_description": 8,
                        "level_3_label": 9, "level_3_description": 10,
                        "level_4_label": 11, "level_4_description": 12,
                        "level_5_label": 13, "level_5_description": 14,
                    }
                    level_label = c[col_map.get(f"level_{score}_label", 9)]
                    level_desc = c[col_map.get(f"level_{score}_description", 10)]
                else:
                    level_label = c[f"level_{score}_label"]
                    level_desc = c[f"level_{score}_description"]
                criteria_with_scores.append({
                    "name": cname, "score": score,
                    "level_label": level_label or f"Level {score}",
                    "level_description": level_desc,
                })
            rubric_data = {**rubric_data_template, "criteria": criteria_with_scores}

        try:
            feedback_text = await generate_feedback(
                s_name, req.feedback_type, s_context, req.tone, req.grade_level,
                s_ratings, rubric_data,
            )
            sentiment = await analyze_sentiment(feedback_text)

            feedback_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            ratings_json = json.dumps(s_ratings) if s_ratings else None
            rubric_scores_json = json.dumps(s_rubric_scores) if s_rubric_scores else None

            await db.execute(
                """INSERT INTO feedback_history
                   (id, user_id, student_name, feedback_type, context, generated_feedback, tone, grade_level, ratings,
                    sentiment_label, sentiment_score, sentiment_breakdown, sentiment_keywords,
                    rubric_id, rubric_scores, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (feedback_id, req.user_id, s_name, req.feedback_type,
                 s_context, feedback_text, req.tone, req.grade_level, ratings_json,
                 sentiment.get("label"), sentiment.get("score"),
                 json.dumps(sentiment.get("breakdown")), json.dumps(sentiment.get("keywords", [])),
                 req.rubric_id, rubric_scores_json, now),
            )
            await db.commit()

            results.append(FeedbackResponse(
                id=feedback_id, student_name=s_name, feedback_type=req.feedback_type,
                context=s_context or None, tone=req.tone, grade_level=req.grade_level,
                generated_feedback=feedback_text, ratings=s_ratings,
                sentiment_label=sentiment.get("label"), sentiment_score=sentiment.get("score"),
                sentiment_breakdown=sentiment.get("breakdown"), sentiment_keywords=sentiment.get("keywords", []),
                rubric_id=req.rubric_id, rubric_scores=s_rubric_scores,
                created_at=now,
            ))
            completed += 1
        except Exception as e:
            failed += 1
            results.append({"student_name": s_name, "error": str(e)})

    return BatchFeedbackResponse(
        total=len(req.students), completed=completed, failed=failed, results=results,
    )


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


# ── Rubrics ──────────────────────────────────────────────────────

@app.post("/rubrics", response_model=RubricResponse)
async def create_rubric(req: CreateRubricRequest, db=Depends(get_db)):
    rubric_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        """INSERT INTO rubric_templates (id, user_id, name, description, subject, grade_level, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (rubric_id, req.user_id, req.name, req.description, req.subject, req.grade_level, now, now),
    )

    criteria_out = []
    for i, c in enumerate(req.criteria):
        crit_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO rubric_criteria
               (id, rubric_id, name, description, sort_order,
                level_1_label, level_1_description, level_2_label, level_2_description,
                level_3_label, level_3_description, level_4_label, level_4_description,
                level_5_label, level_5_description)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (crit_id, rubric_id, c.get("name", ""), c.get("description"),
             c.get("sort_order", i),
             c.get("level_1_label", "Beginning"), c.get("level_1_description"),
             c.get("level_2_label", "Developing"), c.get("level_2_description"),
             c.get("level_3_label", "Proficient"), c.get("level_3_description"),
             c.get("level_4_label", "Advanced"), c.get("level_4_description"),
             c.get("level_5_label", "Exemplary"), c.get("level_5_description")),
        )
        criteria_out.append(RubricCriterionResponse(
            id=crit_id, name=c.get("name", ""), description=c.get("description"),
            sort_order=c.get("sort_order", i),
            level_1_label=c.get("level_1_label", "Beginning"), level_1_description=c.get("level_1_description"),
            level_2_label=c.get("level_2_label", "Developing"), level_2_description=c.get("level_2_description"),
            level_3_label=c.get("level_3_label", "Proficient"), level_3_description=c.get("level_3_description"),
            level_4_label=c.get("level_4_label", "Advanced"), level_4_description=c.get("level_4_description"),
            level_5_label=c.get("level_5_label", "Exemplary"), level_5_description=c.get("level_5_description"),
        ))
    await db.commit()

    return RubricResponse(
        id=rubric_id, name=req.name, description=req.description,
        subject=req.subject, grade_level=req.grade_level,
        criteria=criteria_out, created_at=now, updated_at=now,
    )


@app.get("/rubrics")
async def list_rubrics(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM rubric_templates WHERE user_id = ? ORDER BY updated_at DESC", (user_id,))
    rubrics = await cursor.fetchall()
    results = []
    for r in rubrics:
        crit_cursor = await db.execute(
            "SELECT * FROM rubric_criteria WHERE rubric_id = ? ORDER BY sort_order", (r[0],))
        crit_rows = await crit_cursor.fetchall()
        criteria = [
            RubricCriterionResponse(
                id=c[0], name=c[2], description=c[3], sort_order=c[4],
                level_1_label=c[5], level_1_description=c[6],
                level_2_label=c[7], level_2_description=c[8],
                level_3_label=c[9], level_3_description=c[10],
                level_4_label=c[11], level_4_description=c[12],
                level_5_label=c[13], level_5_description=c[14],
            ) for c in crit_rows
        ]
        results.append(RubricResponse(
            id=r[0], name=r[2], description=r[3], subject=r[4], grade_level=r[5],
            criteria=criteria, created_at=r[6], updated_at=r[7],
        ))
    return results


@app.get("/rubrics/{rubric_id}", response_model=RubricResponse)
async def get_rubric(rubric_id: str, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM rubric_templates WHERE id = ?", (rubric_id,))
    r = await cursor.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Rubric not found")
    crit_cursor = await db.execute(
        "SELECT * FROM rubric_criteria WHERE rubric_id = ? ORDER BY sort_order", (rubric_id,))
    crit_rows = await crit_cursor.fetchall()
    criteria = [
        RubricCriterionResponse(
            id=c[0], name=c[2], description=c[3], sort_order=c[4],
            level_1_label=c[5], level_1_description=c[6],
            level_2_label=c[7], level_2_description=c[8],
            level_3_label=c[9], level_3_description=c[10],
            level_4_label=c[11], level_4_description=c[12],
            level_5_label=c[13], level_5_description=c[14],
        ) for c in crit_rows
    ]
    return RubricResponse(
        id=r[0], name=r[2], description=r[3], subject=r[4], grade_level=r[5],
        criteria=criteria, created_at=r[6], updated_at=r[7],
    )


@app.put("/rubrics/{rubric_id}", response_model=RubricResponse)
async def update_rubric(rubric_id: str, req: UpdateRubricRequest, db=Depends(get_db)):
    cursor = await db.execute("SELECT * FROM rubric_templates WHERE id = ?", (rubric_id,))
    existing = await cursor.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Rubric not found")

    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        """UPDATE rubric_templates SET name=?, description=?, subject=?, grade_level=?, updated_at=? WHERE id=?""",
        (req.name or existing[2], req.description if req.description is not None else existing[3],
         req.subject if req.subject is not None else existing[4],
         req.grade_level if req.grade_level is not None else existing[5], now, rubric_id),
    )

    if req.criteria is not None:
        await db.execute("DELETE FROM rubric_criteria WHERE rubric_id = ?", (rubric_id,))
        for i, c in enumerate(req.criteria):
            crit_id = str(uuid.uuid4())
            await db.execute(
                """INSERT INTO rubric_criteria
                   (id, rubric_id, name, description, sort_order,
                    level_1_label, level_1_description, level_2_label, level_2_description,
                    level_3_label, level_3_description, level_4_label, level_4_description,
                    level_5_label, level_5_description)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (crit_id, rubric_id, c.get("name", ""), c.get("description"),
                 c.get("sort_order", i),
                 c.get("level_1_label", "Beginning"), c.get("level_1_description"),
                 c.get("level_2_label", "Developing"), c.get("level_2_description"),
                 c.get("level_3_label", "Proficient"), c.get("level_3_description"),
                 c.get("level_4_label", "Advanced"), c.get("level_4_description"),
                 c.get("level_5_label", "Exemplary"), c.get("level_5_description")),
            )
    await db.commit()

    return await get_rubric(rubric_id, db)


@app.delete("/rubrics/{rubric_id}")
async def delete_rubric(rubric_id: str, db=Depends(get_db)):
    await db.execute("DELETE FROM rubric_criteria WHERE rubric_id = ?", (rubric_id,))
    await db.execute("DELETE FROM rubric_templates WHERE id = ?", (rubric_id,))
    await db.commit()
    return {"status": "deleted"}


# ── Student Portal ───────────────────────────────────────────────

import secrets
import string


def _generate_token(length=8):
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@app.post("/students/share", response_model=ShareTokenResponse)
async def create_share_token(req: ShareTokenRequest, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT id FROM student_share_tokens WHERE user_id = ? AND student_name = ? AND is_active = 1",
        (req.user_id, req.student_name),
    )
    existing = await cursor.fetchone()
    if existing:
        token = existing[0] if isinstance(existing, tuple) else existing["id"]
        return ShareTokenResponse(
            token=token, student_name=req.student_name,
            share_url=f"/student/{token}",
        )

    token = _generate_token()
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO student_share_tokens (id, user_id, student_name, created_at, is_active) VALUES (?, ?, ?, ?, 1)",
        (token, req.user_id, req.student_name, now),
    )
    await db.commit()
    return ShareTokenResponse(
        token=token, student_name=req.student_name,
        share_url=f"/student/{token}",
    )


@app.get("/students/shared")
async def list_shared_students(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, student_name, created_at FROM student_share_tokens WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC",
        (user_id,),
    )
    rows = await cursor.fetchall()
    return [
        {"token": r[0], "student_name": r[1], "created_at": r[2]}
        for r in rows
    ]


@app.delete("/students/share/{token}")
async def revoke_share_token(token: str, db=Depends(get_db)):
    await db.execute("UPDATE student_share_tokens SET is_active = 0 WHERE id = ?", (token,))
    await db.commit()
    return {"status": "revoked"}


@app.get("/students/portal/{token}", response_model=StudentPortalData)
async def student_portal(token: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT user_id, student_name FROM student_share_tokens WHERE id = ? AND is_active = 1",
        (token,),
    )
    share = await cursor.fetchone()
    if not share:
        raise HTTPException(status_code=404, detail="Invalid or expired link")

    user_id = share[0] if isinstance(share, tuple) else share["user_id"]
    student_name = share[1] if isinstance(share, tuple) else share["student_name"]

    user_cursor = await db.execute("SELECT name FROM users WHERE id = ?", (user_id,))
    user_row = await user_cursor.fetchone()
    teacher_name = (user_row[0] if isinstance(user_row, tuple) else user_row["name"]) if user_row else "Teacher"

    fb_cursor = await db.execute(
        """SELECT id, student_name, feedback_type, context, generated_feedback,
                  tone, grade_level, ratings, sentiment_label, sentiment_score,
                  sentiment_breakdown, sentiment_keywords, created_at
           FROM feedback_history WHERE user_id = ? AND student_name = ? ORDER BY created_at DESC""",
        (user_id, student_name),
    )
    rows = await fb_cursor.fetchall()

    feedback = []
    total_sentiment = 0
    sentiment_count = 0
    for r in rows:
        ratings_data = None
        sentiment_bd = None
        sentiment_kw = None
        try:
            if r[7]:
                ratings_data = json.loads(r[7])
        except Exception:
            pass
        try:
            if r[10]:
                sentiment_bd = json.loads(r[10])
        except Exception:
            pass
        try:
            if r[11]:
                sentiment_kw = json.loads(r[11])
        except Exception:
            pass

        if r[9] is not None:
            total_sentiment += r[9]
            sentiment_count += 1

        feedback.append(FeedbackResponse(
            id=r[0], student_name=r[1], feedback_type=r[2], context=r[3],
            generated_feedback=r[4], tone=r[5], grade_level=r[6],
            ratings=ratings_data, sentiment_label=r[8], sentiment_score=r[9],
            sentiment_breakdown=sentiment_bd, sentiment_keywords=sentiment_kw,
            created_at=r[12],
        ))

    stats = {
        "total_feedback": len(feedback),
        "avg_sentiment": round(total_sentiment / sentiment_count, 2) if sentiment_count else 0,
        "latest_date": feedback[0].created_at if feedback else None,
    }

    return StudentPortalData(
        student_name=student_name, teacher_name=teacher_name,
        feedback=feedback, stats=stats,
    )


# ── Analytics ────────────────────────────────────────────────────

@app.get("/analytics/overview")
async def analytics_overview(user_id: str, db=Depends(get_db)):
    fb_cursor = await db.execute(
        "SELECT COUNT(*) FROM feedback_history WHERE user_id = ?", (user_id,))
    total_feedback = (await fb_cursor.fetchone())[0]

    sm_cursor = await db.execute(
        "SELECT COUNT(*) FROM summary_history WHERE user_id = ?", (user_id,))
    total_summaries = (await sm_cursor.fetchone())[0]

    avg_cursor = await db.execute(
        "SELECT ratings FROM feedback_history WHERE user_id = ? AND ratings IS NOT NULL", (user_id,))
    rating_rows = await avg_cursor.fetchall()
    all_avgs = []
    for row in rating_rows:
        try:
            r = json.loads(row[0])
            if r:
                all_avgs.append(sum(r.values()) / len(r))
        except Exception:
            pass
    avg_rating = round(sum(all_avgs) / len(all_avgs), 1) if all_avgs else 0

    sent_cursor = await db.execute(
        "SELECT sentiment_label, sentiment_score FROM feedback_history WHERE user_id = ? AND sentiment_label IS NOT NULL",
        (user_id,))
    sent_rows = await sent_cursor.fetchall()
    avg_sentiment = round(sum(r[1] for r in sent_rows) / len(sent_rows), 2) if sent_rows else 0

    students_cursor = await db.execute(
        "SELECT COUNT(DISTINCT student_name) FROM feedback_history WHERE user_id = ?", (user_id,))
    unique_students = (await students_cursor.fetchone())[0]

    return {
        "total_feedback": total_feedback,
        "total_summaries": total_summaries,
        "avg_rating": avg_rating,
        "avg_sentiment_score": avg_sentiment,
        "unique_students": unique_students,
    }


@app.get("/analytics/sentiment-distribution")
async def sentiment_distribution(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT sentiment_label, COUNT(*) FROM feedback_history WHERE user_id = ? AND sentiment_label IS NOT NULL GROUP BY sentiment_label",
        (user_id,))
    rows = await cursor.fetchall()
    return [{"name": r[0].capitalize(), "value": r[1]} for r in rows]


@app.get("/analytics/rating-distribution")
async def rating_distribution(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT ratings FROM feedback_history WHERE user_id = ? AND ratings IS NOT NULL", (user_id,))
    rows = await cursor.fetchall()

    category_totals = {}
    category_counts = {}
    for row in rows:
        try:
            r = json.loads(row[0])
            for k, v in r.items():
                category_totals[k] = category_totals.get(k, 0) + v
                category_counts[k] = category_counts.get(k, 0) + 1
        except Exception:
            pass

    type_labels = {
        "academic_performance": "Academic",
        "concept_clarity": "Concepts",
        "communication_skill": "Communication",
        "homework_completion": "Homework",
        "discipline": "Discipline",
        "creativity": "Creativity",
        "examination_performance": "Exams",
        "learning_progress": "Progress",
        "behavior": "Behavior",
        "participation": "Participation",
        "social_skills": "Social",
        "overall_progress": "Overall",
    }

    return [
        {"category": type_labels.get(k, k), "avg_rating": round(category_totals[k] / category_counts[k], 1)}
        for k in category_totals
    ]


@app.get("/analytics/activity-timeline")
async def activity_timeline(user_id: str, db=Depends(get_db)):
    fb_cursor = await db.execute(
        "SELECT created_at FROM feedback_history WHERE user_id = ? ORDER BY created_at", (user_id,))
    fb_rows = await fb_cursor.fetchall()

    sm_cursor = await db.execute(
        "SELECT created_at FROM summary_history WHERE user_id = ? ORDER BY created_at", (user_id,))
    sm_rows = await sm_cursor.fetchall()

    date_counts = {}
    for row in fb_rows:
        day = row[0][:10]
        if day not in date_counts:
            date_counts[day] = {"date": day, "feedback": 0, "summaries": 0}
        date_counts[day]["feedback"] += 1
    for row in sm_rows:
        day = row[0][:10]
        if day not in date_counts:
            date_counts[day] = {"date": day, "feedback": 0, "summaries": 0}
        date_counts[day]["summaries"] += 1

    return sorted(date_counts.values(), key=lambda x: x["date"])


@app.get("/analytics/grade-distribution")
async def grade_distribution(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT grade_level, COUNT(*) FROM feedback_history WHERE user_id = ? GROUP BY grade_level",
        (user_id,))
    rows = await cursor.fetchall()
    return [{"grade": r[0], "count": r[1]} for r in rows]


@app.get("/analytics/feedback-type-distribution")
async def feedback_type_distribution(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        "SELECT feedback_type, COUNT(*) FROM feedback_history WHERE user_id = ? GROUP BY feedback_type",
        (user_id,))
    rows = await cursor.fetchall()

    type_labels = {
        "academic_performance": "Academic",
        "concept_clarity": "Concepts",
        "communication_skill": "Communication",
        "homework_completion": "Homework",
        "discipline": "Discipline",
        "creativity": "Creativity",
        "examination_performance": "Exams",
        "learning_progress": "Progress",
        "behavior": "Behavior",
        "participation": "Participation",
        "social_skills": "Social",
        "overall_progress": "Overall",
    }
    return [{"name": type_labels.get(r[0], r[0]), "value": r[1]} for r in rows]


@app.get("/analytics/top-students")
async def top_students(user_id: str, db=Depends(get_db)):
    cursor = await db.execute(
        """SELECT student_name, grade_level, COUNT(*) as count,
                  AVG(sentiment_score) as avg_sentiment
           FROM feedback_history WHERE user_id = ?
           GROUP BY student_name ORDER BY count DESC LIMIT 10""",
        (user_id,))
    rows = await cursor.fetchall()
    return [
        {"name": r[0], "grade": r[1], "feedback_count": r[2],
         "avg_sentiment": round(r[3], 2) if r[3] else None}
        for r in rows
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
