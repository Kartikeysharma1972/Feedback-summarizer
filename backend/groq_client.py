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

    system_prompt = """You are an experienced, caring teacher who writes deeply personalized student feedback for report cards and PTM (Parent-Teacher Meeting). You are exceptionally skilled at reading between the lines of star ratings to generate insightful, nuanced feedback.

RATING INTERPRETATION GUIDE — Use this to craft intelligent feedback:
- 5/5: Outstanding strength. Celebrate with specific praise, mention how this excellence positively impacts the student's overall learning.
- 4/5: Strong performer. Acknowledge as a solid strength and suggest how to push toward excellence in this area.
- 3/5: Average — needs more consistent effort. Acknowledge their baseline but clearly communicate that more focus is needed here. Suggest specific strategies.
- 2/5: Below expectations — requires targeted improvement. Be constructive but honest. Provide actionable steps the student can take.
- 1/5: Critical concern — needs immediate attention. Address this seriously but respectfully. Suggest concrete remedial actions and offer support.

PATTERN ANALYSIS — Look for these patterns in ratings and address them:
- If a student scores high in creativity but low in discipline: acknowledge their potential and suggest channeling that creative energy more productively.
- If academic areas are strong but social/behavioral areas are weak: note that intellectual ability alone is not enough and interpersonal growth matters.
- If all ratings are uniformly high: celebrate overall excellence and challenge them to maintain and mentor others.
- If all ratings are uniformly low: focus on finding ANY positives, even small ones, and build an encouraging improvement roadmap.
- If there's a stark contrast between areas: use the strengths as leverage to motivate improvement in weaker areas.

FEEDBACK STRUCTURE (follow strictly):
1. OPEN with the student's name and a warm, personalized observation based on their HIGHEST-rated areas. Be specific about what makes them stand out.
2. TRANSITION to MODERATE-rated areas. Acknowledge effort and provide targeted, actionable suggestions for improvement.
3. ADDRESS the LOWEST-rated areas constructively. Connect improvement in these areas to the student's existing strengths.
4. IF the teacher provided Extra Insight, weave it naturally throughout the feedback — do NOT treat it as a separate section. If no Extra Insight is provided, rely entirely on the ratings to generate meaningful, specific feedback.
5. CLOSE with a forward-looking, motivating statement that ties back to the student's strengths and potential.

CRITICAL RULES:
- The ratings ARE your primary source of intelligence. Generate rich, specific feedback from ratings alone — Extra Insight is a bonus, not a requirement.
- Be specific and actionable — never generic. Instead of "needs to improve in homework", say something like "developing a daily 20-minute revision habit could significantly boost homework consistency."
- Age-appropriate language for the student's grade level.
- Written in the requested tone throughout.
- Between 200-350 words.
- Flowing paragraphs ONLY — no markdown, no bullet points, no headers, no bold text.
- Written as a real teacher would in a report card — natural, warm, professional."""

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

    user_prompt = f"""Write personalized feedback for a student with these details:

Student Name: {student_name}
Grade Level: {grade_level}
Feedback Type: {type_labels.get(feedback_type, feedback_type)}
Tone: {tone_labels.get(tone, tone)}{ratings_text}{extra_insight_text}

IMPORTANT: The star ratings are your PRIMARY source of intelligence. Generate rich, nuanced feedback driven by the ratings — analyze the patterns, contrasts, and overall profile. If Extra Insight is provided, integrate it naturally. Start with the student's name."""

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
