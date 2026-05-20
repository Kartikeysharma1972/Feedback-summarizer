import os
import json
from groq import AsyncGroq

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


async def analyze_sentiment(text: str) -> dict:
    client = _get_client()

    system_prompt = """You are a sentiment analysis expert for educational feedback. Analyze the given text and return a JSON object with:
- "label": one of "positive", "negative", "neutral", or "mixed"
- "score": confidence score from 0.0 to 1.0
- "breakdown": {"positive": 0-100, "negative": 0-100, "neutral": 0-100} (must sum to 100)
- "keywords": list of 3-5 key emotion/sentiment words found in the text

Return ONLY valid JSON, no other text."""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze the sentiment of this educational feedback:\n\n{text[:3000]}"},
            ],
            temperature=0.1,
            max_tokens=300,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(raw)
    except Exception:
        return {"label": "neutral", "score": 0.5, "breakdown": {"positive": 33, "negative": 33, "neutral": 34}, "keywords": []}


async def generate_feedback(student_name: str, feedback_type: str, context: str, tone: str, grade_level: str, ratings: dict = None, rubric_data: dict = None, standards: list = None, language: str = "english") -> str:
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
- Sound like a real teacher writing a report card — natural, professional, caring.

If a RUBRIC-BASED ASSESSMENT is provided, use the rubric criteria names and level descriptions to generate more specific, criterion-aligned feedback. Reference the rubric criteria by name in your feedback. The rubric assessment takes priority over generic star ratings when both are present.

If EDUCATIONAL STANDARDS are provided, explicitly reference the relevant standards in your feedback. Explain how the student's performance aligns with each selected standard — where they meet or exceed the standard, and where they need growth. Use the standard names naturally in the feedback text (e.g., "In terms of Reading Comprehension, Arjun demonstrates..."). This helps parents and administrators understand how the student is progressing against curriculum benchmarks.

If a LANGUAGE other than English is specified, write the ENTIRE feedback in that language. Use natural, fluent phrasing — not machine-translated text. Keep the student's name as-is (do not transliterate). The feedback should read as if written by a native speaker of that language."""

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

    rubric_text = ""
    if rubric_data:
        rubric_text = f"\n\nRUBRIC-BASED ASSESSMENT — '{rubric_data['name']}':\n"
        rubric_text += "The teacher scored the student using a custom rubric. Each criterion has 5 levels (1=Beginning to 5=Exemplary).\n\n"

        high_criteria = [c for c in rubric_data["criteria"] if c["score"] >= 4]
        mid_criteria = [c for c in rubric_data["criteria"] if c["score"] == 3]
        low_criteria = [c for c in rubric_data["criteria"] if c["score"] <= 2]

        for group_label, group in [("STRONG (4-5)", high_criteria), ("MODERATE (3)", mid_criteria), ("NEEDS IMPROVEMENT (1-2)", low_criteria)]:
            if group:
                rubric_text += f"{group_label}:\n"
                for c in group:
                    rubric_text += f"  - {c['name']} ({c['score']}/5 = {c['level_label']})"
                    if c.get('level_description'):
                        rubric_text += f": {c['level_description'][:100]}"
                    rubric_text += "\n"
                rubric_text += "\n"

    standards_text = ""
    if standards:
        standards_text = "\n\nEDUCATIONAL STANDARDS ALIGNMENT:\n"
        standards_text += "The teacher has selected the following standards to align this feedback with:\n"
        for s in standards:
            standards_text += f"  - {s.get('code', '')}: {s.get('name', '')} — {s.get('description', '')}\n"
        standards_text += "\nReference each standard by name in the feedback. Explain how the student's performance relates to each standard."

    extra_insight_text = ""
    if context and context.strip():
        extra_insight_text = f"\n\nTeacher's Extra Insight (weave this naturally into the feedback — do NOT treat as a separate section):\n{context}"
    else:
        extra_insight_text = "\n\n[No Extra Insight provided — generate complete, specific feedback based entirely on the ratings above. Be detailed and insightful using only the rating data.]"

    user_prompt = f"""Generate a student report card feedback based on the RATINGS below.

Student Name: {student_name}
Grade Level: {grade_level}
Feedback Type: {type_labels.get(feedback_type, feedback_type)}
Tone: {tone_labels.get(tone, tone)}
Language: {language.capitalize()}{ratings_text}{rubric_text}{standards_text}{extra_insight_text}

INSTRUCTIONS:
1. The RATINGS above are your COMPLETE intelligence source. Analyze the numbers — identify strengths (4-5), average areas (3), and concerns (1-2).
2. Describe specific student behaviors that each rating implies (what does a 2/5 in discipline LOOK like? what does a 5/5 in creativity LOOK like?).
3. Find patterns and contrasts between ratings and address them.
4. Give concrete, actionable suggestions with specific daily/weekly habits.
5. Extra Insight is optional bonus — if absent, generate EQUALLY rich feedback from ratings alone.
6. Start with the student's name. Write flowing paragraphs only.
7. Write the ENTIRE feedback in the specified Language. If not English, write fluently in that language."""

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


async def generate_glow_grow(feedback_text: str, language: str = "english") -> dict:
    client = _get_client()

    lang_instruction = f' Write the glows and grows in {language.capitalize()}.' if language != "english" else ""

    system_prompt = f"""You are an expert teacher who extracts structured "Glow & Grow" summaries from student feedback. Analyze the feedback and return a JSON object with:
- "glows": array of 2-4 specific strengths (things the student is doing well)
- "grows": array of 2-4 specific growth areas (things the student needs to improve)

Each item should be a concise, actionable sentence (10-20 words). Be specific — reference actual skills, behaviors, or subjects mentioned in the feedback.{lang_instruction}

Return ONLY valid JSON, no other text."""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract Glow & Grow from this feedback:\n\n{feedback_text[:3000]}"},
            ],
            temperature=0.2,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(raw)
    except Exception:
        return {"glows": [], "grows": []}


async def generate_mindmap_markdown(text: str, document_type: str) -> str:
    client = _get_client()

    system_prompt = """You are an expert at creating structured mind maps from documents. Convert the given text into a hierarchical markdown structure suitable for mind map visualization.

RULES:
- Use markdown headings (# ## ###) for hierarchy levels
- Use bullet points (- ) for leaf nodes
- Maximum 3 levels of depth
- Keep each node text short (under 8 words)
- Extract 4-6 main topics from the document
- Each main topic should have 2-4 subtopics
- Focus on key information: dates, actions, people, decisions
- Output ONLY the markdown structure, no explanations"""

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create a mind map structure for this {document_type}:\n\n{text[:4000]}"},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        return response.choices[0].message.content
    except Exception:
        return "# Document\n## Key Points\n- No data available"


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
