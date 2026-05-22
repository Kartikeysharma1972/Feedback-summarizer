import os
from groq import AsyncGroq

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


async def generate_feedback(student_name: str, feedback_type: str, context: str, tone: str, grade_level: str, ratings: dict = None) -> str:
    client = _get_client()

    type_labels = {
        "academic_performance": "Academic Performance",
        "concept_clarity": "Concept Clarity & Problem Solving",
        "communication_skill": "Communication Skill",
        "homework_completion": "Homework Completion",
        "discipline": "Discipline",
        "creativity": "Creativity",
        "examination_performance": "Examination Performance",
        "learning_progress": "Learning Progress",
        "behavior": "Behavior & Conduct",
        "participation": "Class Participation",
        "social_skills": "Social Skills",
        "overall_progress": "Overall Progress",
    }

    tone_labels = {
        "encouraging": "encouraging, positive, and constructive with growth-oriented suggestions",
        "formal": "formal and professional",
        "warm": "warm and friendly",
        "direct": "direct and clear",
        "warning": "serious and cautionary, highlighting concerns that need immediate attention while still being respectful",
    }

    grade_num = 0
    try:
        grade_num = int(grade_level.split()[0].replace("st", "").replace("nd", "").replace("rd", "").replace("th", ""))
    except Exception:
        grade_num = 5

    if grade_num <= 3:
        lang_guide = """LANGUAGE STYLE (Class 1-3):
- Write like a caring class teacher talking to parents of a small child.
- Very simple, warm Hindi-English mixed tone. Short sentences.
- Use child-friendly examples: "Aarav loves story time and always raises his hand first!"
- Keep total feedback under 120 words. Parents of small kids won't read more.
- Suggestions should be home-friendly: "reading together for 10 minutes before bed", "practicing writing 5 new words daily"."""
    elif grade_num <= 5:
        lang_guide = """LANGUAGE STYLE (Class 4-5):
- Write like a middle-school teacher who knows the child well.
- Conversational, friendly but clear. Mix of encouragement and honest observations.
- Use relatable examples: "Priya solves math problems quickly but rushes through word problems — slowing down will help her catch silly mistakes."
- Keep total feedback under 150 words. Teachers scan, they don't read essays.
- Suggestions should be specific weekly habits: "solving 2 extra word problems daily", "preparing a 1-minute topic presentation every Friday"."""
    elif grade_num <= 8:
        lang_guide = """LANGUAGE STYLE (Class 6-8):
- Write like a subject teacher giving a balanced, honest assessment.
- Professional but approachable. Acknowledge the student as growing up.
- Use academic examples: "Strong conceptual grasp in science practicals but written answers lack depth — using the PEE (Point, Evidence, Explain) method will help."
- Keep total feedback under 180 words.
- Suggestions should be study-skill focused: "maintaining a revision timetable", "attempting previous year questions weekly"."""
    else:
        lang_guide = """LANGUAGE STYLE (Class 9-12):
- Write like a senior teacher preparing students for boards/competitive exams.
- Direct, mature, and goal-oriented. Treat the student as a young adult.
- Use academic references: "Consistent in Physics numericals but needs to strengthen organic chemistry — solving 10 NCERT back-exercises weekly will build confidence."
- Keep total feedback under 200 words.
- Suggestions should be exam/career-oriented: "timed practice tests", "focusing on weak chapters using PYQs", "developing answer-writing speed"."""

    system_prompt = f"""You are an experienced Indian school teacher writing student feedback for report cards / PTM.

YOUR ONLY INTELLIGENCE SOURCE = STAR RATINGS. Extra Insight is optional bonus, not required.

WHAT RATINGS MEAN:
- 5/5: Superpower. Describe what this excellence looks like in class.
- 4/5: Strong, one push away from excellence. Say what's working + one specific next step.
- 3/5: Average / inconsistent. Name the gap, give one concrete daily habit to fix it.
- 2/5: Below expected. Be kind but honest. Suggest specific remedial action.
- 1/5: Needs urgent attention. Recommend a clear action plan (parent meeting, daily monitoring, extra support).

PATTERN INTELLIGENCE — spot and address these:
- High academics + low discipline = brilliant but disruptive → channel energy productively.
- High creativity + low homework = imaginative but no follow-through → needs accountability.
- Low communication + high academics = understands but can't express → needs presentation practice.
- All 4-5 = challenge them (leadership, peer mentoring).
- All 1-2 = find the best-rated area and use it as encouragement anchor.

{lang_guide}

OUTPUT FORMAT (strict — follow exactly):
---
🌟 Strengths
• [one line per strength, max 3 lines]

📈 Needs Improvement
• [one line per area, max 3 lines, each with a specific action step]

🎯 Teacher's Advice
[1-2 sentences — one specific, actionable thing the student/parent should focus on this month]
---

RULES:
- Generate feedback ENTIRELY from ratings. Never say "the teacher noted" or mention missing context.
- Be specific: not "improve homework" but "completing the daily Math worksheet before 5 PM".
- If Extra Insight is provided, weave it into the relevant section naturally.
- Start strengths with the student's name.
- No markdown formatting (no **, no ##). Only use the bullet format above.
- Sound like a real teacher — natural, human, caring. Not robotic or generic."""

    ratings_text = ""
    if ratings:
        sorted_ratings = sorted(ratings.items(), key=lambda x: x[1], reverse=True)
        high = [(k, v) for k, v in sorted_ratings if v >= 4]
        mid = [(k, v) for k, v in sorted_ratings if v == 3]
        low = [(k, v) for k, v in sorted_ratings if v <= 2]

        avg_rating = sum(v for _, v in sorted_ratings) / len(sorted_ratings) if sorted_ratings else 0
        max_rating = max(v for _, v in sorted_ratings) if sorted_ratings else 0
        min_rating = min(v for _, v in sorted_ratings) if sorted_ratings else 0
        rating_spread = max_rating - min_rating

        sections = []
        if high:
            sections.append("STRENGTHS (4-5 stars) — Celebrate these:\n" + "\n".join(
                f"  - {type_labels.get(k, k)}: {v}/5" for k, v in high))
        if mid:
            sections.append("MODERATE (3 stars) — Acknowledge effort, push for growth:\n" + "\n".join(
                f"  - {type_labels.get(k, k)}: {v}/5" for k, v in mid))
        if low:
            sections.append("NEEDS ATTENTION (1-2 stars) — Constructive improvement needed:\n" + "\n".join(
                f"  - {type_labels.get(k, k)}: {v}/5" for k, v in low))

        sections.append(f"\nOverall Average: {avg_rating:.1f}/5 | Rating Spread: {rating_spread} ({'consistent' if rating_spread <= 1 else 'mixed' if rating_spread <= 2 else 'highly varied'} performance)")

        ratings_text = "\n\nTeacher's Star Ratings (use these as your PRIMARY intelligence source):\n" + "\n\n".join(sections)

    extra_insight_text = ""
    if context and context.strip():
        extra_insight_text = f"\n\nTeacher's Extra Insight (weave this naturally into the feedback — do NOT treat as a separate section):\n{context}"
    else:
        extra_insight_text = "\n\n[No Extra Insight provided — generate complete, specific feedback based entirely on the ratings above. Be detailed and insightful using only the rating data.]"

    user_prompt = f"""Generate structured student feedback using ONLY the format specified in system prompt.

Student: {student_name}
Grade: {grade_level}
Focus Area: {type_labels.get(feedback_type, feedback_type)}
Tone: {tone_labels.get(tone, tone)}{ratings_text}{extra_insight_text}

Follow the exact 3-section format (Strengths → Needs Improvement → Teacher's Advice). Keep it concise and grade-appropriate."""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        raise Exception(f"Failed to generate feedback: {str(e)}")


async def summarize_document(text: str, document_type: str, summary_length: str) -> str:
    client = _get_client()

    length_instructions = {
        "brief": "Provide a brief summary in 2-3 concise sentences capturing the key points.",
        "detailed": "Provide a detailed summary covering all important points, key decisions, dates, and action items. Use 2-3 paragraphs.",
        "bullet_points": "Provide the summary as clear, organized bullet points. Group related points together under sub-headings if needed.",
    }

    type_labels = {
        "circular": "School Circular",
        "report": "Report",
        "notice": "Notice",
        "newsletter": "Newsletter",
        "policy": "Policy Document",
        "meeting_minutes": "Meeting Minutes",
        "other": "Document",
    }

    system_prompt = """You are an expert educational document analyst. You help teachers quickly understand the key information in school documents.
Your summaries should:
- Highlight the most important information first
- Include any dates, deadlines, or action items
- Be clear and easy to scan
- Preserve critical details like names, numbers, and specific requirements
- Be written in professional language suitable for educators"""

    user_prompt = f"""Summarize the following {type_labels.get(document_type, document_type)}:

{length_instructions.get(summary_length, length_instructions["detailed"])}

Document content:
{text}"""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1500,
        )
        return response.choices[0].message.content
    except Exception as e:
        raise Exception(f"Failed to summarize document: {str(e)}")
