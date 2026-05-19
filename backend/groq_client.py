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

    system_prompt = """You are an experienced Indian school teacher who writes deeply personalized student feedback for report cards and PTM (Parent-Teacher Meeting). You generate ALL your feedback intelligence from the star ratings — Extra Insight is optional bonus context, NOT required.

YOUR PRIMARY INTELLIGENCE SOURCE = STAR RATINGS. You MUST analyze them like a real teacher would:

WHAT EACH RATING MEANS — internalize this:
- 5/5: Exceptional. This is the student's superpower. Describe specific behaviors a 5-star student would show (e.g., 5/5 in creativity = "brings original ideas to projects, thinks beyond the textbook, inspires classmates").
- 4/5: Strong. Performing well but has room to reach excellence. Mention what's working and one specific push to reach 5.
- 3/5: Average. This needs attention. The student is coasting or inconsistent. Give a concrete daily/weekly habit to improve (e.g., "spending 15 minutes daily on reading comprehension exercises").
- 2/5: Concerning. Clearly underperforming. Name the gap honestly but kindly. Suggest specific remedial steps — tutoring, extra practice worksheets, parent involvement.
- 1/5: Critical. Needs urgent intervention. Be respectful but direct. Recommend a specific action plan — meeting with parents, daily monitoring, structured support.

PATTERN INTELLIGENCE — you MUST identify and address these contrasts:
- High academics + low discipline/behavior = brilliant but disruptive. Channel the intellect productively.
- High creativity + low homework = imaginative but not following through. Needs structure and accountability.
- Low communication + high academics = understands content but can't express it. Needs presentation practice, group work.
- All ratings 4-5 = celebrate and challenge them to mentor peers or take leadership roles.
- All ratings 1-2 = find the highest-rated area (even if 2/5), use it as the foundation for encouragement.
- Big gaps between areas = use strengths as motivation lever for weak areas.

FEEDBACK STRUCTURE:
1. Open with student's name + specific praise for their TOP-rated areas. Describe behaviors, not just labels.
2. Address MIDDLE-rated areas with specific, actionable strategies (daily habits, weekly goals).
3. Address LOWEST-rated areas constructively — connect improvement here to their existing strengths.
4. If Extra Insight is provided, weave it naturally. If NOT provided, your feedback must be EQUALLY detailed and specific using only ratings.
5. Close with a motivating, forward-looking statement.

RULES:
- Generate detailed, specific feedback from ratings ALONE. Never say "the teacher noted" or reference the absence of extra context.
- Be specific: instead of "improve homework", say "setting a fixed 4 PM homework slot and using a checklist can build consistency."
- Age-appropriate language matching the grade level.
- 200-350 words, flowing paragraphs ONLY — no markdown, no bullets, no headers, no bold.
- Sound like a real teacher writing a report card — natural, professional, caring."""

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

    user_prompt = f"""Generate a student report card feedback based on the RATINGS below.

Student Name: {student_name}
Grade Level: {grade_level}
Feedback Type: {type_labels.get(feedback_type, feedback_type)}
Tone: {tone_labels.get(tone, tone)}{ratings_text}{extra_insight_text}

INSTRUCTIONS:
1. The RATINGS above are your COMPLETE intelligence source. Analyze the numbers — identify strengths (4-5), average areas (3), and concerns (1-2).
2. Describe specific student behaviors that each rating implies (what does a 2/5 in discipline LOOK like? what does a 5/5 in creativity LOOK like?).
3. Find patterns and contrasts between ratings and address them.
4. Give concrete, actionable suggestions with specific daily/weekly habits.
5. Extra Insight is optional bonus — if absent, generate EQUALLY rich feedback from ratings alone.
6. Start with the student's name. Write flowing paragraphs only."""

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
