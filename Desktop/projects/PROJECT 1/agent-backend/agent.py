"""
Research Agent - LangGraph State and Node Definitions
Implements the ReAct pattern with task decomposition and self-reflection.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, AsyncGenerator, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from duckduckgo_search import DDGS
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# State Definition
# ─────────────────────────────────────────────────────────────────────────────

class ResearchState(TypedDict):
    topic: str
    session_id: str
    sub_questions: list[str]
    search_results: dict[str, list[dict]]   # question -> list of {url, title, content}
    extracted_content: dict[str, str]        # question -> synthesized snippet
    draft_report: str
    reflection_notes: str
    final_report: dict                       # structured JSON report
    events: list[dict]                       # SSE event log
    error: str | None


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _emit(state: ResearchState, node: str, status: str, data: Any = None) -> None:
    """Append an SSE event to the state event log."""
    state["events"].append({
        "node": node,
        "status": status,
        "data": data,
    })


def _get_llm(streaming: bool = False) -> ChatGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        raise ValueError(
            "GROQ_API_KEY not found or invalid in environment variables. "
            "Please set it in backend/.env file with your actual Groq API key from https://console.groq.com/keys"
        )
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.3,
        streaming=streaming,
        request_timeout=60,
        max_retries=2,
        api_key=api_key,
    )


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((Exception,)),
    reraise=True,
)
async def _llm_invoke_with_retry(llm: ChatGroq, messages: list) -> Any:
    """Invoke LLM with exponential backoff retry."""
    return await llm.ainvoke(messages)


# ─────────────────────────────────────────────────────────────────────────────
# Node 1 — Planner
# ─────────────────────────────────────────────────────────────────────────────

async def planner_node(state: ResearchState) -> ResearchState:
    """Break the research topic into 4–5 focused sub-questions."""
    _emit(state, "planner", "running", {"message": "Decomposing topic into sub-questions…"})

    llm = _get_llm()
    prompt = f"""You are a research strategist. Break the following research topic into exactly 5 focused, 
distinct sub-questions that together provide comprehensive coverage.

Research Topic: {state["topic"]}

Return ONLY a JSON array of 5 strings. No markdown, no explanation.
Example: ["What is X?", "How does Y work?", ...]"""

    try:
        response = await _llm_invoke_with_retry(llm, [HumanMessage(content=prompt)])
        raw = response.content.strip()
        # Strip potential markdown fences
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        sub_questions = json.loads(raw)
        if not isinstance(sub_questions, list):
            raise ValueError("Expected a list")
        state["sub_questions"] = sub_questions[:5]
        _emit(state, "planner", "done", {"sub_questions": state["sub_questions"]})
    except Exception as exc:
        logger.error("Planner error: %s", exc)
        state["sub_questions"] = [f"Overview of {state['topic']}"]
        state["error"] = str(exc)
        _emit(state, "planner", "error", {"message": str(exc)})

    return state


# ─────────────────────────────────────────────────────────────────────────────
# Node 2 — Search
# ─────────────────────────────────────────────────────────────────────────────

async def search_node(state: ResearchState) -> ResearchState:
    """For each sub-question, run a DuckDuckGo web search and store raw results."""
    _emit(state, "search", "running", {"message": "Searching the web for each sub-question…"})
    results: dict[str, list[dict]] = {}

    def fetch_page_content(url: str) -> str:
        """Fetch and extract text content from a URL."""
        try:
            response = requests.get(url, timeout=5, headers={'User-Agent': 'Mozilla/5.0'})
            soup = BeautifulSoup(response.content, 'html.parser')
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            return text[:3000]
        except Exception as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return ""

    async def search_one(question: str) -> None:
        try:
            # Use DuckDuckGo search (completely free, no API key needed)
            ddgs = DDGS()
            search_results = list(ddgs.text(question, max_results=4))
            
            results[question] = [
                {
                    "url": r.get("href", ""),
                    "title": r.get("title", ""),
                    "content": r.get("body", ""),
                    "raw_content": fetch_page_content(r.get("href", "")) if r.get("href") else "",
                }
                for r in search_results
            ]
        except Exception as exc:
            logger.error("Search error for '%s': %s", question, exc)
            results[question] = []

    # Run searches sequentially to avoid rate limiting
    for q in state["sub_questions"]:
        await asyncio.to_thread(search_one, q)
        await asyncio.sleep(0.5)  # Small delay between searches
    
    state["search_results"] = results
    total = sum(len(v) for v in results.values())
    _emit(state, "search", "done", {"message": f"Retrieved {total} sources across {len(state['sub_questions'])} queries."})
    return state


# ─────────────────────────────────────────────────────────────────────────────
# Node 3 — Extraction
# ─────────────────────────────────────────────────────────────────────────────

async def extraction_node(state: ResearchState) -> ResearchState:
    """For each sub-question, extract and condense relevant content from search results."""
    _emit(state, "extraction", "running", {"message": "Extracting relevant content from sources…"})

    llm = _get_llm()
    extracted: dict[str, str] = {}

    async def extract_one(question: str) -> None:
        docs = state["search_results"].get(question, [])
        if not docs:
            extracted[question] = "No results found."
            return

        combined = "\n\n---\n\n".join(
            f"Source: {d['title']} ({d['url']})\n{d['raw_content'] or d['content']}"
            for d in docs
        )[:12000]

        prompt = f"""You are a senior research analyst extracting comprehensive information from web sources. 
Given the following sources, extract ALL relevant information that answers the sub-question below.

EXTRACTION REQUIREMENTS:
1. Be THOROUGH and DETAILED - extract all relevant facts, not just summaries
2. Include SPECIFIC statistics, percentages, numbers, and quantitative data
3. Include dates, years, and timeline information
4. Include expert quotes or notable statements
5. Include multiple perspectives if available
6. Cite sources using [1], [2], etc. format
7. Organize information logically with clear structure

Sub-Question: {question}

Sources:
{combined}

Write a comprehensive extraction (500-700 words) with proper citations. Include ALL relevant statistics, 
dates, expert opinions, and specific data points found in the sources:"""

        try:
            resp = await _llm_invoke_with_retry(llm, [HumanMessage(content=prompt)])
            extracted[question] = resp.content
        except Exception as exc:
            logger.error("Extraction error: %s", exc)
            extracted[question] = f"Extraction failed: {exc}"

    await asyncio.gather(*[extract_one(q) for q in state["sub_questions"]])
    state["extracted_content"] = extracted
    _emit(state, "extraction", "done", {"message": f"Extracted content for {len(extracted)} sub-questions."})
    return state


# ─────────────────────────────────────────────────────────────────────────────
# Node 4 — Synthesis
# ─────────────────────────────────────────────────────────────────────────────

async def synthesis_node(state: ResearchState) -> ResearchState:
    """Combine all extracted content into a coherent research draft."""
    _emit(state, "synthesis", "running", {"message": "Synthesizing findings into a comprehensive draft report…"})

    llm = _get_llm()
    extractions_text = "\n\n===\n\n".join(
        f"## Sub-Question: {q}\n{content}"
        for q, content in state["extracted_content"].items()
    )

    prompt = f"""You are a senior research writer producing a COMPREHENSIVE, DETAILED research report. 
Using the following extracted research content, write an extensive, well-structured research report draft 
on the topic: "{state["topic"]}"

IMPORTANT REQUIREMENTS:
1. The draft MUST be at least 1500-2000 words - this is a professional research document
2. Include SPECIFIC statistics, numbers, percentages, and data points throughout
3. Use proper academic structure with clear section headings
4. Include inline citations referencing the sources [1], [2], etc.
5. Mention specific years, dates, and timeline information where relevant
6. Include expert opinions or quotes from the research
7. Provide context with historical background where applicable
8. Discuss implications and future outlook

The draft should have:
- A compelling executive introduction (150-200 words) with key statistics
- 6-8 detailed sections covering all aspects of the topic
- Each section should be 200-300 words with specific data
- A future outlook section
- Natural flow between sections with connecting insights
- Quantitative data and specific examples throughout

Extracted Content:
{extractions_text}

Write the FULL comprehensive draft report now (minimum 1500 words):"""

    try:
        resp = await _llm_invoke_with_retry(llm, [HumanMessage(content=prompt)])
        state["draft_report"] = resp.content
        _emit(state, "synthesis", "done", {"message": "Draft report created."})
    except Exception as exc:
        logger.error("Synthesis error: %s", exc)
        state["draft_report"] = ""
        state["error"] = str(exc)
        _emit(state, "synthesis", "error", {"message": str(exc)})

    return state


# ─────────────────────────────────────────────────────────────────────────────
# Node 5 — Reflection
# ─────────────────────────────────────────────────────────────────────────────

async def reflection_node(state: ResearchState) -> ResearchState:
    """Review the draft, identify gaps, weak sections, and improvement areas."""
    _emit(state, "reflection", "running", {"message": "Self-reflecting on draft quality…"})

    llm = _get_llm()
    prompt = f"""You are a critical research editor. Review this research draft and identify:
1. Any factual gaps or missing important aspects
2. Sections that are too shallow or unclear
3. Missing context or background
4. Logical inconsistencies
5. Areas where more specificity would help

Topic: {state["topic"]}

Draft:
{state["draft_report"]}

Provide a concise review (200-300 words) listing specific improvements needed. Be critical but constructive."""

    try:
        resp = await _llm_invoke_with_retry(llm, [HumanMessage(content=prompt)])
        state["reflection_notes"] = resp.content
        _emit(state, "reflection", "done", {"message": "Reflection complete. Gaps identified.", "notes_preview": resp.content[:200] + "…"})
    except Exception as exc:
        logger.error("Reflection error: %s", exc)
        state["reflection_notes"] = "Unable to generate reflection."
        _emit(state, "reflection", "error", {"message": str(exc)})

    return state


# ─────────────────────────────────────────────────────────────────────────────
# Node 6 — Refinement
# ─────────────────────────────────────────────────────────────────────────────

async def refinement_node(state: ResearchState) -> ResearchState:
    """Apply reflection notes to produce the final structured report."""
    _emit(state, "refinement", "running", {"message": "Refining report and generating final structured output…"})

    llm = _get_llm()

    # Collect all unique sources
    all_sources: list[dict] = []
    seen_urls: set[str] = set()
    for docs in state["search_results"].values():
        for d in docs:
            if d["url"] not in seen_urls:
                seen_urls.add(d["url"])
                all_sources.append({"title": d["title"], "url": d["url"]})

    prompt = f"""You are a senior research editor producing a COMPREHENSIVE, PROFESSIONAL research report. 
Improve and finalize the research draft based on the reflection notes below, then output a STRUCTURED JSON report.

Topic: {state["topic"]}
Original Draft: {state["draft_report"]}
Reflection / Improvement Notes: {state["reflection_notes"]}

IMPORTANT REQUIREMENTS:
1. The report must be EXTENSIVE and DETAILED - this is a professional research document
2. Each section should be 300-500 words with in-depth analysis
3. Include SPECIFIC statistics, percentages, numbers, dates, and quantitative data wherever possible
4. Include proper academic-style inline citations like [1], [2], etc.
5. Generate relevant statistical data that could be visualized in charts
6. Create a comprehensive executive summary (150-200 words)
7. Include 8-10 key findings with specific data points
8. Add a timeline of key events/milestones if applicable
9. Include expert quotes or notable statements from sources

Output ONLY valid JSON (no markdown fences) matching this exact schema:
{{
  "title": "string — compelling, professional research report title",
  "subtitle": "string — descriptive subtitle explaining the scope",
  "date_generated": "string — today's date in format: Month Day, Year",
  "summary": "string — comprehensive executive summary (150-200 words) with key statistics",
  "key_findings": ["string with specific data/stat", ...],  // 8-10 detailed bullet-point key findings
  "statistics": [
    {{
      "label": "string — metric name",
      "value": "string — the number or percentage",
      "description": "string — context for this statistic",
      "trend": "up|down|stable — direction if applicable"
    }}
  ],
  "chart_data": [
    {{
      "chart_type": "bar|pie|line",
      "title": "string — chart title",
      "data": [{{"label": "string", "value": number}}, ...]
    }}
  ],
  "timeline": [
    {{
      "date": "string — year or specific date",
      "event": "string — what happened",
      "significance": "string — why it matters"
    }}
  ],
  "sections": [
    {{
      "heading": "string",
      "content": "string — comprehensive paragraph content (300-500 words) with inline citations [1], [2]",
      "key_points": ["string", "string"],
      "sources": ["url1", "url2"]
    }}
  ],
  "expert_insights": [
    {{
      "quote": "string — direct quote or paraphrased insight",
      "source": "string — who said it or where it's from",
      "context": "string — brief context"
    }}
  ],
  "references": [
    {{"id": number, "title": "string", "url": "string", "accessed_date": "string"}}
  ],
  "methodology": "string — detailed description of research approach (100-150 words)",
  "limitations": "string — acknowledge any limitations of the research",
  "future_outlook": "string — predictions or future implications (100-150 words)"
}}

Generate AT LEAST 6-8 comprehensive sections. Make the report feel like a professional industry analysis.
Include realistic statistics and data points based on the research content.
Ensure all citations reference the actual sources provided."""

    try:
        resp = await _llm_invoke_with_retry(llm, [HumanMessage(content=prompt)])
        raw = resp.content.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        report = json.loads(raw)

        # Inject collected sources into references if sparse
        existing_urls = {r["url"] for r in report.get("references", [])}
        for src in all_sources:
            if src["url"] not in existing_urls:
                report.setdefault("references", []).append(src)

        state["final_report"] = report
        _emit(state, "refinement", "done", {"message": "Final report ready!", "title": report.get("title", "")})
    except Exception as exc:
        logger.error("Refinement error: %s", exc)
        # Fallback: wrap draft in basic structure
        state["final_report"] = {
            "title": f"Research Report: {state['topic']}",
            "summary": "Report generation encountered an issue. See sections for draft content.",
            "key_findings": [],
            "sections": [{"heading": "Research Draft", "content": state["draft_report"], "sources": []}],
            "references": all_sources,
            "methodology": "Autonomous multi-step research agent.",
        }
        state["error"] = str(exc)
        _emit(state, "refinement", "error", {"message": str(exc)})

    return state


# ─────────────────────────────────────────────────────────────────────────────
# Graph Assembly
# ─────────────────────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(ResearchState)

    graph.add_node("planner", planner_node)
    graph.add_node("search", search_node)
    graph.add_node("extraction", extraction_node)
    graph.add_node("synthesis", synthesis_node)
    graph.add_node("reflection", reflection_node)
    graph.add_node("refinement", refinement_node)

    graph.set_entry_point("planner")
    graph.add_edge("planner", "search")
    graph.add_edge("search", "extraction")
    graph.add_edge("extraction", "synthesis")
    graph.add_edge("synthesis", "reflection")
    graph.add_edge("reflection", "refinement")
    graph.add_edge("refinement", END)

    return graph.compile()


RESEARCH_GRAPH = build_graph()
