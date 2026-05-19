import React, { useState, useRef, useCallback } from 'react'
import { Code2, Github, Play, RotateCcw, LogOut, Shield, ChevronDown, Search, FileCode } from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import PipelinePanel from './components/PipelinePanel'
import ReportPanel from './components/ReportPanel'
import AuthPage from './components/AuthPage'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const PLACEHOLDER_CODE = `# Paste your code here for review
def authenticate(username, password):
    query = "SELECT * FROM users WHERE username='" + username + "'"
    result = db.execute(query)
    if result:
        return True
    return False

def process_data(items):
    for i in range(len(items)):
        print(items[i])
    
SECRET_KEY = "hardcoded_secret_123"
`

export default function App() {
  /* ───── Auth State ───── */
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('codesentinel_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  /* ───── App State ───── */
  const [inputMode, setInputMode] = useState('code')
  const [code, setCode] = useState(PLACEHOLDER_CODE)
  const [githubUrl, setGithubUrl] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [nodeStates, setNodeStates] = useState({})
  const [logs, setLogs] = useState([])
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const eventSourceRef = useRef(null)

  /* ───── Auth Handlers ───── */
  const handleAuth = (userData) => {
    localStorage.setItem('codesentinel_user', JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('codesentinel_user')
    setUser(null)
  }

  /* ───── Review Logic ───── */
  const reset = () => {
    setIsRunning(false)
    setNodeStates({})
    setLogs([])
    setReport(null)
    setError(null)
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
  }

  const handleSubmit = useCallback(async () => {
    if (isRunning) return
    reset()

    const content = inputMode === 'code' ? code : githubUrl
    if (!content.trim()) {
      setError('Please provide code or a GitHub URL to review.')
      return
    }

    setIsRunning(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_type: inputMode,
          content: content.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to start review')
      }

      const { session_id } = await res.json()
      const es = new EventSource(`${API_BASE}/stream/${session_id}`)
      eventSourceRef.current = es

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)

          if (event.type === 'node_start') {
            setNodeStates(prev => ({ ...prev, [event.node]: 'running' }))
            setLogs(prev => [...prev, event.message])
          } else if (event.type === 'node_update') {
            setLogs(prev => [...prev, event.message])
          } else if (event.type === 'node_done') {
            setNodeStates(prev => ({ ...prev, [event.node]: 'done' }))
            setLogs(prev => [...prev, `✓ ${event.message}`])
          } else if (event.type === 'final_report') {
            setReport(event.report)
          } else if (event.type === 'error') {
            setError(event.message)
            setIsRunning(false)
            es.close()
          } else if (event.type === 'done') {
            setIsRunning(false)
            es.close()
          }
        } catch (err) {
          console.error('Parse error:', err)
        }
      }

      es.onerror = () => {
        setError('Connection to server lost. Make sure the backend is running.')
        setIsRunning(false)
        es.close()
      }
    } catch (err) {
      setError(err.message)
      setIsRunning(false)
    }
  }, [inputMode, code, githubUrl, isRunning])

  const hasResults = report !== null
  const showPipeline = isRunning || Object.keys(nodeStates).length > 0

  /* ───── Render Auth ───── */
  if (!user) {
    return <AuthPage onAuth={handleAuth} />
  }

  /* ───── Render App ───── */
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left — Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-base tracking-tight">CodeSentinel</span>
          </div>

          {/* Right — Status + User */}
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
              <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
              <span className={isRunning ? 'text-amber-600' : 'text-slate-500'}>
                {isRunning ? 'Analyzing...' : 'Ready'}
              </span>
            </div>

            <div className="w-px h-5 bg-slate-200 hidden sm:block" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[120px] truncate">
                  {user.name || user.email}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg shadow-slate-200/80 border border-slate-200 py-1.5 z-50 animate-scale-in">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900 truncate">{user.name || 'User'}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 lg:gap-8">

          {/* ── LEFT COLUMN: Input + Pipeline ── */}
          <div className="flex flex-col gap-4">

            {/* Input mode toggle */}
            <div className="flex bg-white rounded-xl border border-slate-200 p-1 gap-1 shadow-sm">
              {[
                { id: 'code', icon: Code2, label: 'Paste Code' },
                { id: 'github_url', icon: Github, label: 'GitHub URL' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setInputMode(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    inputMode === id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {inputMode === 'code' ? (
                <div>
                  {/* Code editor top bar */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs font-mono text-slate-400 ml-1">code.py</span>
                  </div>
                  {/* Code editor */}
                  <div className="code-editor-wrapper" style={{ minHeight: '280px', maxHeight: '420px', overflowY: 'auto' }}>
                    <Editor
                      value={code}
                      onValueChange={setCode}
                      highlight={code =>
                        Prism.highlight(code, Prism.languages.python || Prism.languages.javascript, 'python')
                      }
                      padding={16}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        lineHeight: 1.7,
                        background: 'transparent',
                        color: '#e2e8f0',
                        minHeight: '280px',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-5 flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Github size={14} />
                    Repository URL
                  </label>
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Fetches .py, .js, .ts, .jsx, .tsx files from public repositories.
                  </p>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 animate-scale-in">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                  isRunning
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35'
                }`}
              >
                {isRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    Run Review
                  </>
                )}
              </button>

              {(showPipeline || hasResults) && (
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl text-sm font-medium text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
                  title="Reset"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            {/* Pipeline progress */}
            {showPipeline && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm animate-slide-up">
                <PipelinePanel nodeStates={nodeStates} logs={logs} />
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Report ── */}
          <div className="min-h-[400px]">
            {/* Empty state */}
            {!hasResults && !isRunning && (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-5 animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center">
                  <FileCode size={32} className="text-slate-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">No report yet</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Paste your code or enter a GitHub URL, then click <strong>Run Review</strong> to get a detailed analysis.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {[
                    { label: 'Bugs', color: 'bg-red-100 text-red-600' },
                    { label: 'Security', color: 'bg-orange-100 text-orange-600' },
                    { label: 'Performance', color: 'bg-amber-100 text-amber-600' },
                    { label: 'Style', color: 'bg-blue-100 text-blue-600' },
                  ].map(t => (
                    <span key={t.label} className={`text-xs font-medium px-3 py-1 rounded-full ${t.color}`}>
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {isRunning && !hasResults && (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4 animate-fade-in">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 animate-spin" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">Analyzing your code...</p>
                  <p className="text-sm text-slate-500 mt-1">This usually takes 30–60 seconds</p>
                </div>
              </div>
            )}

            {/* Results */}
            {hasResults && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-slide-up">
                <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
                  <span className="text-sm font-semibold text-emerald-700">
                    Review Complete
                  </span>
                </div>
                <div className="p-6">
                  <ReportPanel report={report} />
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center text-xs text-slate-400">
          <span>© 2025 CodeSentinel. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
