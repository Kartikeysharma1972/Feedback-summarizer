import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "teacher_toolkit.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS feedback_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                feedback_type TEXT NOT NULL,
                context TEXT NOT NULL,
                generated_feedback TEXT NOT NULL,
                tone TEXT NOT NULL,
                grade_level TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS summary_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                document_name TEXT NOT NULL,
                document_type TEXT NOT NULL,
                original_text TEXT NOT NULL,
                summary TEXT NOT NULL,
                summary_length TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        await db.commit()


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
