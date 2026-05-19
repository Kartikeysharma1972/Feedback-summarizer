import os
import json
import re
from typing import TypedDict, Optional, AsyncGenerator, Any
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from github_tool import fetch_github_code

# ---------- State ----------

class AgentState(TypedDict):
    input_type: str
    raw_content: str
    code_context: str
    initial_analysis: str
    reflection_output: str
    refined_analysis: str
    final_report: dict
    events: list[dict]


# ---------- LLM ----------

# Fallback chain: if primary model hits rate limit, try the next one
MODELS = [
    "llama-3.3-70b-versatile",
    "llama3-70b-8192",
    "llama-3.1-8b-instant",
]

def get_llm(model_index=0):
    model = MODELS[min(model_index, len(MODELS) - 1)]
    return ChatGroq(
        model=model,
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2,
        max_tokens=4096,
    )


def invoke_with_fallback(messages):
    """Try each model in order; fall back on rate-limit (429) errors."""
    for i, model_name in enumerate(MODELS):
        try:
            llm = get_llm(i)
            return llm.invoke(messages)
        except Exception as e:
            if "429" in str(e) or "rate_limit" in str(e).lower():
                if i < len(MODELS) - 1:
                    continue  # try next model
            raise  # non-rate-limit error, re-raise
    raise RuntimeError("All models rate-limited. Please try again later.")


# ---------- Nodes ----------

def input_node(state: AgentState) -> AgentState:
    events = state.get("events", [])
    events.append({"type": "node_start", "node": "input", "message": "Reading and preparing code..."})

    if state["input_type"] == "github_url":
        try:
            code_context = fetch_github_code(state["raw_content"])
            events.append({"type": "node_update", "node": "input", "message": f"Fetched code from GitHub repository"})
        except Exception as e:
            code_context = f"[GitHub fetch error: {str(e)}]\n\nFalling back to treating input as raw code:\n\n{state['raw_content']}"
    else:
        code_context = state["raw_content"]

    events.append({"type": "node_done", "node": "input", "message": "Code prepared successfully"})
    return {**state, "code_context": code_context, "events": events}


def analysis_node(state: AgentState) -> AgentState:
    events = state.get("events", [])
    events.append({"type": "node_start", "node": "analysis", "message": "Performing first-pass code analysis..."})

    system = SystemMessage(content="""You are an expert code reviewer with deep knowledge of security, performance, and software engineering best practices. 
Perform a thorough, detailed code review. Be specific about line references or function names when possible.
Identify ALL of the following:
1. Bugs and logical errors
2. Security vulnerabilities (SQL injection, XSS, exposed credentials, insecure dependencies, etc.)
3. Performance bottlenecks and inefficiencies
4. Code smells and bad practices
5. Missing error handling and edge cases
6. Architectural concerns

Be thorough and critical. Format your response as a detailed analysis.""")

    human = HumanMessage(content=f"Review this code thoroughly:\n\n```\n{state['code_context'][:12000]}\n```")

    response = invoke_with_fallback([system, human])
    initial_analysis = response.content

    events.append({"type": "node_done", "node": "analysis", "message": "First-pass analysis complete"})
    return {**state, "initial_analysis": initial_analysis, "events": events}


def reflection_node(state: AgentState) -> AgentState:
    events = state.get("events", [])
    events.append({"type": "node_start", "node": "reflection", "message": "Reflecting on analysis quality..."})

    system = SystemMessage(content="""You are a senior code review auditor. You will review another AI's code review analysis and critically evaluate it.
Ask yourself:
- Did the reviewer miss any obvious issues?
- Are there false positives (reported issues that aren't actually problems)?
- Are the severity assessments accurate?
- Are the fix suggestions practical and correct?
- What was overlooked entirely?

Be specific about what was missed, what was wrong, and what was excellent.""")

    human = HumanMessage(content=f"""Original Code:
```
{state['code_context'][:6000]}
```

Code Review Analysis:
{state['initial_analysis']}

Please reflect critically on this review. What was missed? What was wrong? What should be added or removed?""")

    response = invoke_with_fallback([system, human])
    reflection = response.content

    events.append({"type": "node_done", "node": "reflection", "message": "Reflection complete"})
    return {**state, "reflection_output": reflection, "events": events}


def refinement_node(state: AgentState) -> AgentState:
    events = state.get("events", [])
    events.append({"type": "node_start", "node": "refinement", "message": "Refining analysis based on reflection..."})

    system = SystemMessage(content="""You are an expert code reviewer producing a refined, accurate analysis. 
Using the original analysis and the reflection critique, produce an improved analysis that:
1. Removes false positives identified in the reflection
2. Adds missed issues identified in the reflection
3. Corrects any inaccurate severity assessments
4. Improves the quality of fix suggestions
5. Adds any missing context or explanation

Produce a comprehensive, accurate, and actionable refined analysis.""")

    human = HumanMessage(content=f"""Original Analysis:
{state['initial_analysis']}

Reflection Critique:
{state['reflection_output']}

Produce the refined, improved analysis:""")

    response = invoke_with_fallback([system, human])
    refined = response.content

    events.append({"type": "node_done", "node": "refinement", "message": "Refinement complete"})
    return {**state, "refined_analysis": refined, "events": events}


def report_node(state: AgentState) -> AgentState:
    events = state.get("events", [])
    events.append({"type": "node_start", "node": "report", "message": "Generating structured final report..."})

    system = SystemMessage(content="""You are a code review report generator. Convert the provided analysis into a structured JSON report.

You MUST respond with ONLY valid JSON, no markdown, no explanation, just the JSON object.

The JSON must have this exact structure:
{
  "summary": "2-3 sentence executive summary of code quality",
  "issues": [
    {
      "type": "bug|security|performance|style",
      "severity": "critical|high|medium|low",
      "location": "function name or line reference",
      "description": "clear description of the issue",
      "fix": "specific actionable fix suggestion explaining what to change",
      "fixed_code": "the corrected version of the problematic code snippet"
    }
  ],
  "reflection_notes": "Key insights from the self-reflection phase",
  "overall_score": <integer 0-100>,
  "positive_aspects": ["strength 1", "strength 2", "strength 3"]
}

IMPORTANT RULES:
- Be thorough - include ALL issues found.
- Score 0-100 where 100 is perfect code.
- For EVERY issue, you MUST provide both "fix" (text explanation) AND "fixed_code" (the corrected code snippet showing the proper implementation).
- The "fixed_code" should be a ready-to-use corrected version of the problematic code, not pseudocode.""")

    human = HumanMessage(content=f"""Refined Analysis:
{state['refined_analysis']}

Reflection Notes:
{state['reflection_output']}

Generate the structured JSON report now:""")

    response = invoke_with_fallback([system, human])

    # Parse JSON from response
    try:
        content = response.content.strip()
        # Strip markdown code blocks if present
        content = re.sub(r'^```(?:json)?\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        report = json.loads(content)
    except Exception as e:
        # Fallback report
        report = {
            "summary": "Code review completed. See issues below for details.",
            "issues": [{"type": "style", "severity": "medium", "location": "general", "description": state["refined_analysis"][:500], "fix": "Review the analysis above"}],
            "reflection_notes": state["reflection_output"][:300],
            "overall_score": 60,
            "positive_aspects": ["Code was analyzable", "Review completed successfully"]
        }

    events.append({"type": "node_done", "node": "report", "message": "Report generated"})
    events.append({"type": "final_report", "report": report})

    return {**state, "final_report": report, "events": events}


# ---------- Graph ----------

def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("input", input_node)
    graph.add_node("analysis", analysis_node)
    graph.add_node("reflection", reflection_node)
    graph.add_node("refinement", refinement_node)
    graph.add_node("report", report_node)

    graph.set_entry_point("input")
    graph.add_edge("input", "analysis")
    graph.add_edge("analysis", "reflection")
    graph.add_edge("reflection", "refinement")
    graph.add_edge("refinement", "report")
    graph.add_edge("report", END)

    return graph.compile()


# ---------- Runner ----------

async def run_agent(input_type: str, content: str) -> AsyncGenerator[dict, None]:
    graph = build_graph()

    initial_state: AgentState = {
        "input_type": input_type,
        "raw_content": content,
        "code_context": "",
        "initial_analysis": "",
        "reflection_output": "",
        "refined_analysis": "",
        "final_report": {},
        "events": [],
    }

    # Run graph synchronously in thread to not block event loop
    import asyncio
    loop = asyncio.get_event_loop()
    final_state = await loop.run_in_executor(None, graph.invoke, initial_state)

    for event in final_state.get("events", []):
        yield event
