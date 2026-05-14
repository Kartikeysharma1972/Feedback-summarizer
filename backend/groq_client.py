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

    system_prompt = """You are an experienced, caring teacher who writes personalized student feedback for report cards and PTM (Parent-Teacher Meeting).

FEEDBACK STRUCTURE (follow this order strictly):
1. FIRST — Start by appreciating and highlighting the areas where the student scored the HIGHEST star ratings. Celebrate their strengths.
2. THEN — Move to areas with MODERATE ratings. Acknowledge effort and give gentle encouragement.
3. THEN — Address areas with the LOWEST star ratings. Provide constructive suggestions for improvement.
4. FINALLY — Incorporate the teacher's specific notes/context about the student.
5. End with an encouraging, forward-looking closing statement.

Your feedback should be:
- Specific and actionable
- Age-appropriate for the student's grade level
- Written in the requested tone
- Between 200-350 words
- Structured with clear paragraphs (NOT bullet points or markdown)
- Written in natural paragraph form as a teacher would in a report card

Do NOT use markdown headers, bullet points, or bold text. Write flowing paragraphs only."""

    ratings_text = ""
    if ratings:
        sorted_ratings = sorted(ratings.items(), key=lambda x: x[1], reverse=True)
        high = [(k, v) for k, v in sorted_ratings if v >= 4]
        mid = [(k, v) for k, v in sorted_ratings if v == 3]
        low = [(k, v) for k, v in sorted_ratings if v <= 2]

        sections = []
        if high:
            sections.append("Strong Areas (4-5 stars):\n" + "\n".join(
                f"  - {type_labels.get(k, k)}: {v}/5" for k, v in high))
        if mid:
            sections.append("Average Areas (3 stars):\n" + "\n".join(
                f"  - {type_labels.get(k, k)}: {v}/5" for k, v in mid))
        if low:
            sections.append("Needs Improvement (1-2 stars):\n" + "\n".join(
                f"  - {type_labels.get(k, k)}: {v}/5" for k, v in low))

        ratings_text = "\n\nTeacher's Star Ratings (sorted highest to lowest):\n" + "\n\n".join(sections)

    user_prompt = f"""Write personalized feedback for a student with these details:

Student Name: {student_name}
Grade Level: {grade_level}
Feedback Type: {type_labels.get(feedback_type, feedback_type)}
Tone: {tone_labels.get(tone, tone)}{ratings_text}

Teacher's Notes/Context:
{context}

IMPORTANT: Follow the feedback structure — start with highest-rated areas first, then moderate, then lowest-rated areas needing improvement, and finally weave in the teacher's context. Start with the student's name."""

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
