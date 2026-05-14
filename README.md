# Teacher Toolkit - AI-Powered Feedback & Summarizer

An AI-powered toolkit for teachers featuring personalized student feedback generation and document summarization, built with Groq API (Llama 3.3).

## Features

- **Personalized Student Feedback** - Generate tailored feedback with 6 types, 5 tones, and all grade levels
- **Document Summarizer** - Summarize circulars, reports, notices (paste text or upload PDF/DOCX/TXT)
- **Persistent History** - All sessions saved in SQLite, accessible months later
- **Teacher Auth** - Signup/login with per-teacher isolated history

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Python FastAPI + aiosqlite
- **AI**: Groq API with Llama 3.3 70B
- **Database**: SQLite (persistent, zero-config)

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Add your GROQ_API_KEY
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Getting a Groq API Key

1. Go to https://console.groq.com
2. Sign up for free
3. Create an API key
4. Add it to `backend/.env`
