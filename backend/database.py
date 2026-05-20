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
                ratings TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        # Safe migrations for new columns
        for col, col_type in [
            ("ratings", "TEXT"),
            ("sentiment_label", "TEXT"),
            ("sentiment_score", "REAL"),
            ("sentiment_breakdown", "TEXT"),
            ("sentiment_keywords", "TEXT"),
        ]:
            try:
                await db.execute(f"ALTER TABLE feedback_history ADD COLUMN {col} {col_type}")
            except Exception:
                pass
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
        try:
            await db.execute("ALTER TABLE summary_history ADD COLUMN mindmap_markdown TEXT")
        except Exception:
            pass

        for col, col_type in [
            ("rubric_id", "TEXT"),
            ("rubric_scores", "TEXT"),
            ("standards_tags", "TEXT"),
            ("glow_grow", "TEXT"),
            ("language", "TEXT"),
        ]:
            try:
                await db.execute(f"ALTER TABLE feedback_history ADD COLUMN {col} {col_type}")
            except Exception:
                pass

        await db.execute("""
            CREATE TABLE IF NOT EXISTS rubric_templates (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                subject TEXT,
                grade_level TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS rubric_criteria (
                id TEXT PRIMARY KEY,
                rubric_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                level_1_label TEXT NOT NULL DEFAULT 'Beginning',
                level_1_description TEXT,
                level_2_label TEXT NOT NULL DEFAULT 'Developing',
                level_2_description TEXT,
                level_3_label TEXT NOT NULL DEFAULT 'Proficient',
                level_3_description TEXT,
                level_4_label TEXT NOT NULL DEFAULT 'Advanced',
                level_4_description TEXT,
                level_5_label TEXT NOT NULL DEFAULT 'Exemplary',
                level_5_description TEXT,
                FOREIGN KEY (rubric_id) REFERENCES rubric_templates(id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS student_share_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
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
