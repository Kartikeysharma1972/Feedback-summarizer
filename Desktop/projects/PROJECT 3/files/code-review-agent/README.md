# 🔍 CodeSentinel — Self-Reflective AI Code Review Agent

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react&logoColor=black)
![Groq](https://img.shields.io/badge/Groq-FREE_API-F55036?style=flat)

A production-grade **AI-powered code review agent** that uses **self-reflection** to analyze code, critique its own analysis, and produce polished, structured review reports — all streamed live to your browser.

---

## 🎯 What Problem Does This Solve?

**Manual code reviews are:**
- ⏰ Time-consuming and tedious
- 🎲 Inconsistent across reviewers
- 🐛 Prone to missing subtle bugs
- 🔒 Often miss security vulnerabilities

**CodeSentinel automates this by:**
- ✅ Analyzing code for bugs, security issues, performance problems, and style violations
- ✅ Self-reflecting on its own analysis to catch mistakes and false positives
- ✅ Providing actionable fix suggestions with code examples
- ✅ Generating structured reports with severity levels (Critical → Low)
- ✅ Scoring code health from 0-100

---

## 🧠 How It Works

CodeSentinel implements a **4-stage self-reflective pipeline** using LangGraph:

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Input Node │────▶│ Analysis Node│────▶│ Reflection Node│────▶│Refinement Node─────▶│ Report Node  │
│             │     │              │     │                │     │              │     │              │
│ Parse code  │     │ First-pass   │     │ Self-critique: │     │ Remove false │     │ JSON output  │
│ or fetch    │     │ review:      │     │ "Did I miss    │     │ positives,   │     │ with scores, │
│ from GitHub │     │ bugs, sec,   │     │ anything? Are  │     │ add missed   │     │ severity     │
│             │     │ perf, style  │     │ there FPs?"    │     │ issues       │     │ levels, fixes│
└─────────────┘     └──────────────┘     └────────────────┘     └──────────────┘     └──────────────┘
```

**Each stage streams live updates** via Server-Sent Events (SSE) to the React frontend.

---

## ✨ Key Features

- 🔄 **Self-Reflective Agent** — AI reviews its own analysis and corrects mistakes
- 🔗 **Chain-of-Thought Reasoning** — 4-stage pipeline ensures thorough analysis
- 🐙 **GitHub Integration** — Paste any public repo URL to analyze automatically
- 📡 **Live Streaming** — Watch each agent node execute in real-time
- 📊 **Structured Reports** — Issues categorized by type (Bug, Security, Performance, Style) and severity
- 💯 **Code Health Score** — 0-100 rating with animated circular progress indicator
- 💡 **Expandable Fix Suggestions** — Click any issue to reveal AI-generated solutions
- 📥 **Export** — Copy or download the full report as JSON

---

## 🚀 Quick Setup (5 Steps)

### **Prerequisites**
- Python 3.11 or higher
- Node.js 18 or higher
- A free Groq API key (no credit card required)

### **Step 1: Get Your FREE Groq API Key**

1. Visit **https://console.groq.com**
2. Sign up (100% free, no credit card needed)
3. Navigate to **API Keys** section
4. Click **Create API Key**
5. Copy your API key

**Free Tier Limits:**
- ✅ 30 requests/minute
- ✅ 14,400 requests/day
- ✅ LLaMA 3.3 70B model access

### **Step 2: Setup Backend**

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Your .env file should already have your API key
# If not, add it:
# echo GROQ_API_KEY=your_api_key_here > .env
```

### **Step 3: Setup Frontend**

```bash
cd frontend

# Install Node dependencies
npm install
```

### **Step 4: Start the Application**

**Terminal 1 - Start Backend:**
```bash
cd backend
uvicorn main:app --reload
```
✅ Backend runs at **http://localhost:8000**

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend runs at **http://localhost:5173**

### **Step 5: Use the Application**

1. Open your browser to **http://localhost:5173**
2. Choose input mode:
   - **Paste Code** — Directly paste your code
   - **GitHub URL** — Enter a public GitHub repository URL
3. Click **Run Review**
4. Watch the pipeline execute in real-time
5. View your structured report with issues, fixes, and score

---

## 🧪 How to Test It

### **Test 1: Vulnerable Code (Security Detection)**

Paste this code to test security vulnerability detection:

```python
def authenticate(username, password):
    query = "SELECT * FROM users WHERE username='" + username + "'"
    result = db.execute(query)
    if result:
        return True
    return False

SECRET_KEY = "hardcoded_secret_123"
```

**Expected Results:**
- ❌ Critical: SQL injection vulnerability
- ❌ Critical: Hardcoded credentials
- 💡 Fix suggestions with parameterized queries

### **Test 2: GitHub Repository Analysis**

Enter any public GitHub repository URL:
```
https://github.com/username/repository-name
```

**Expected Results:**
- Fetches up to 20 code files (.py, .js, .ts, .jsx, .tsx, etc.)
- Analyzes entire codebase
- Provides comprehensive report

### **Test 3: Performance Issues**

```python
def process_data(items):
    for i in range(len(items)):  # Anti-pattern
        print(items[i])
```

**Expected Results:**
- ⚠️ Medium: Non-Pythonic iteration pattern
- 💡 Suggests direct iteration: `for item in items:`

---

## 🔑 Environment Variables

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `GROQ_API_KEY` | ✅ Yes | Free Groq API key | [console.groq.com](https://console.groq.com) |
| `GITHUB_TOKEN` | ❌ Optional | Only for private repos | [github.com/settings/tokens](https://github.com/settings/tokens) |

---

## 🏗 Architecture

### **Backend: FastAPI + LangGraph**

```python
# Agent State Flow
AgentState = {
    input_type: str,        # "code" or "github_url"
    raw_content: str,       # Original user input
    code_context: str,      # Prepared code (fetched if GitHub URL)
    analysis: str,          # First-pass review
    reflection: str,        # Self-critique of the analysis
    refined_analysis: str,  # Improved analysis post-reflection
    final_report: dict,     # Structured JSON output
    events: list[dict],     # Streaming event log
}
```

**API Endpoints:**
- `POST /review` → Starts agent, returns `{ session_id }`
- `GET /stream/{id}` → SSE stream of node events
- `GET /health` → Health check

### **Frontend: React + Tailwind CSS**

- Dark terminal-inspired UI with IBM Plex Sans + JetBrains Mono
- Left panel: Input modes + live pipeline visualization
- Right panel: Structured report with score circle, issue cards, positive aspects
- SSE client for real-time streaming

---

## 📊 Example Review Output

```json
{
  "summary": "This code has critical SQL injection vulnerabilities and hardcoded credentials that pose immediate security risks.",
  "issues": [
    {
      "type": "security",
      "severity": "critical",
      "location": "authenticate()",
      "description": "SQL injection vulnerability — user input concatenated directly into query string",
      "fix": "Use parameterized queries: cursor.execute('SELECT * FROM users WHERE username = ?', (username,))"
    },
    {
      "type": "security",
      "severity": "critical",
      "location": "module level",
      "description": "Hardcoded secret key exposed in source code",
      "fix": "Use environment variables: SECRET_KEY = os.environ.get('SECRET_KEY')"
    }
  ],
  "reflection_notes": "Initial analysis correctly identified SQL injection. Reflection caught a missed issue: no rate limiting on authenticate() function.",
  "overall_score": 28,
  "positive_aspects": [
    "Code is readable and straightforward",
    "Function names clearly describe their purpose"
  ]
}
```

---

## 🛠 Tech Stack

| Layer | Technology | Why? |
|-------|-----------|------|
| LLM | **Groq API** — LLaMA 3.3 70B | FREE, fast inference (500+ tokens/sec) |
| Agent Framework | **LangGraph** | State-based agent orchestration |
| Backend | **FastAPI** | Async Python web framework |
| Streaming | **Server-Sent Events (SSE)** | Real-time updates |
| GitHub API | **PyGithub** | Repository file fetching |
| Frontend | **React 18 + Vite** | Modern UI framework |
| Styling | **Tailwind CSS** | Utility-first styling |
| Code Editor | **react-simple-code-editor** | Syntax highlighting |

---

## 📁 Project Structure

```
code-review-agent/
├── backend/
│   ├── main.py              # FastAPI app, SSE endpoints
│   ├── agent.py             # LangGraph graph, all nodes
│   ├── github_tool.py       # PyGithub integration
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Your API keys (DO NOT COMMIT)
│   └── .env.example         # Template for .env
└── frontend/
    ├── src/
    │   ├── App.jsx                      # Main app, SSE client
    │   ├── main.jsx                     # React entry point
    │   ├── index.css                    # Tailwind styles
    │   └── components/
    │       ├── PipelinePanel.jsx        # Live node status
    │       ├── ReportPanel.jsx          # Final report display
    │       ├── IssueCard.jsx            # Individual issue cards
    │       └── ScoreCircle.jsx          # Animated score indicator
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── index.html
```

---

## 🔒 Security Notes

- ✅ All APIs used are **100% FREE** (Groq API)
- ✅ No credit card required
- ⚠️ Never commit your `.env` file to version control
- ⚠️ GitHub token is optional (only for private repos)

---

## 🐛 Troubleshooting

### **Backend won't start**
```bash
# Make sure you're in the backend directory
cd backend

# Check if .env file exists and has GROQ_API_KEY
cat .env

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### **Frontend won't start**
```bash
# Make sure you're in the frontend directory
cd frontend

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### **"Connection to server lost" error**
- Make sure backend is running on port 8000
- Check if GROQ_API_KEY is valid
- Check backend terminal for error messages

---

## 📄 License

MIT License - Feel free to use this project for learning, personal projects, or commercial applications.

---

## 🎓 Learning Concepts

This project demonstrates:
- ✅ **Reflection Agents** — AI that critiques its own output
- ✅ **Chain-of-Thought Reasoning** — Multi-stage analysis pipeline
- ✅ **Tool-Using Agents** — GitHub API as a tool
- ✅ **LangGraph StateGraph** — Directed acyclic graph (DAG) for agent orchestration
- ✅ **Streaming Responses** — Real-time SSE updates
- ✅ **Modern Full-Stack Development** — FastAPI + React + Tailwind

---

## 🚀 Ready to Start?

1. ✅ Get your free Groq API key at https://console.groq.com
2. ✅ Run `pip install -r requirements.txt` in backend/
3. ✅ Run `npm install` in frontend/
4. ✅ Start backend: `uvicorn main:app --reload`
5. ✅ Start frontend: `npm run dev`
6. ✅ Open http://localhost:5173 and start reviewing code!

**Questions?** Check the troubleshooting section above or review the code comments.
