import hashlib
import uuid
from datetime import datetime, timezone


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


async def get_user_by_email(db, email: str):
    cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = await cursor.fetchone()
    if row:
        return {"id": row[0], "name": row[1], "email": row[2], "password_hash": row[3]}
    return None


async def create_user(db, name: str, email: str, password: str):
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    password_hash = hash_password(password)
    await db.execute(
        "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, name, email, password_hash, now),
    )
    await db.commit()
    return {"id": user_id, "name": name, "email": email}


async def get_user_by_id(db, user_id: str):
    cursor = await db.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
    row = await cursor.fetchone()
    if row:
        return {"id": row[0], "name": row[1], "email": row[2]}
    return None
