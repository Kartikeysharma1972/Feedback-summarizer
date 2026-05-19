import { useState, useRef, useEffect } from 'react'
import { Search, Zap, RotateCcw, Terminal, ChevronDown, User, LogOut, Menu, X, Sparkles, ArrowRight, BookOpen, Shield, Clock } from 'lucide-react'
import { useResearch } from './hooks/useResearch'
import PipelineVisualizer from './components/PipelineVisualizer'
import ReportViewer from './components/ReportViewer'
import AuthModal from './components/AuthModal'

const EXAMPLE_TOPICS = [
  'The future of quantum computing and its impact on cryptography',
  'Microplastics in human blood: health implications and solutions',
  'How large language models work and their societal implications',
  'The geopolitics of rare earth minerals and electric vehicles',
  'CRISPR gene editing: current capabilities and ethical concerns',
]

const FEATURES = [
  { icon: Sparkles, title: 'AI-Powered Analysis', description: 'Advanced language models decompose topics and synthesize insights.' },
  { icon: Search, title: 'Deep Web Research', description: 'Searches 20+ authoritative sources for comprehensive information.' },
  { icon: BookOpen, title: 'Structured Reports', description: 'Generates professional reports with citations and statistics.' },
  { icon: Clock, title: 'Real-time Progress', description: 'Watch the research pipeline work with live status updates.' }
]

function LogPanel({ logs }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [logs])

  return (
    <div ref={ref} className="h-36 overflow-y-auto font-mono text-xs text-text-secondary space-y-0.5">
      {logs.length === 0 ? (
        <span className="text-muted italic">Awaiting research task…</span>
      ) : (
        logs.map((l, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-muted shrink-0">
              {new Date(l.ts).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span>{l.msg}</span>
          </div>
        ))
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-6 shadow-lg">
        <Zap size={32} className="text-white" />
      </div>
      <h3 className="font-display text-2xl text-text-primary mb-3">Ready to Research</h3>
      <p className="text-sm text-text-secondary max-w-md mb-8">
        Enter any topic above and our autonomous agent will decompose it into sub-questions, 
        search the web, extract insights, and produce a comprehensive report.
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {[
          { step: '01', text: 'Planner breaks topic into sub-questions' },
          { step: '02', text: 'Agent searches 20+ web sources' },
          { step: '03', text: 'Extracts & synthesizes findings' },
          { step: '04', text: 'Self-reflects and refines report' }
        ].map((item, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-panel border border-border text-left">
            <span className="text-accent font-mono text-xs font-bold">{item.step}</span>
            <span className="text-xs text-text-secondary">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LandingHero({ onGetStarted }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs font-medium text-accent">AI-Powered Research Agent</span>
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-text-primary leading-tight mb-6">
            Research Any Topic with
            <span className="block text-accent">Autonomous AI</span>
          </h1>
          
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10">
            Our intelligent agent decomposes complex topics, searches the web, extracts key insights, 
            and generates comprehensive research reports — all automatically.
          </p>
          
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold bg-accent text-white hover:bg-accent-glow transition-colors shadow-lg"
          >
            Start Researching
            <ArrowRight size={18} />
          </button>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
            {FEATURES.map((feature, i) => (
              <div key={i} className="p-5 rounded-xl bg-white border border-border hover:border-accent/30 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon size={20} className="text-accent" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-xs text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="border-t border-border py-6 px-6 bg-panel">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-accent" />
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-teal" />
            <span>Real-time Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-amber" />
            <span>Comprehensive Reports</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [topic, setTopic] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('research_user')
    return saved ? JSON.parse(saved) : null
  })
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const {
    status, nodeStates, activeNode, subQuestions, report, error, logs,
    startResearch, reset, NODE_ORDER,
  } = useResearch()

  const isRunning = status === 'running' || status === 'starting'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!topic.trim() || isRunning) return
    startResearch(topic.trim())
  }

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('research_user', JSON.stringify(userData))
    setShowAuthModal(false)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('research_user')
  }

  const openAuth = (mode) => {
    setAuthMode(mode)
    setShowAuthModal(true)
    setMobileMenuOpen(false)
  }

  // Landing page
  if (showLanding && status === 'idle' && !report) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="border-b border-border bg-white sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-display text-lg text-text-primary font-semibold">ResearchAgent</span>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel border border-border">
                    <User size={14} className="text-accent" />
                    <span className="text-sm text-text-primary">{user.name}</span>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary">
                    <LogOut size={14} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => openAuth('login')} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                    Sign In
                  </button>
                  <button onClick={() => openAuth('signup')} className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-glow">
                    Sign Up
                  </button>
                </>
              )}
            </div>
            
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-text-secondary">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border bg-white px-6 py-4 space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel">
                    <User size={16} className="text-accent" />
                    <span className="text-sm">{user.name}</span>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary">
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => openAuth('login')} className="w-full px-3 py-2 text-sm text-left text-text-secondary">Sign In</button>
                  <button onClick={() => openAuth('signup')} className="w-full px-3 py-2 rounded-lg text-sm bg-accent text-white text-left">Sign Up</button>
                </>
              )}
            </div>
          )}
        </header>
        
        <LandingHero onGetStarted={() => setShowLanding(false)} />
        
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={handleLogin} initialMode={authMode} />
      </div>
    )
  }

  // Main app
  return (
    <div className="min-h-screen bg-panel flex flex-col">
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center cursor-pointer"
              onClick={() => { reset(); setTopic(''); setShowLanding(true); }}
            >
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-display text-lg text-text-primary font-semibold">ResearchAgent</span>
          </div>
          
          <div className="flex items-center gap-4">
            {status !== 'idle' && (
              <button onClick={() => { reset(); setTopic('') }} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
                <RotateCcw size={14} />
                <span className="hidden sm:inline">New Research</span>
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status === 'running' ? 'bg-teal animate-pulse' :
                status === 'done' ? 'bg-teal' :
                status === 'error' ? 'bg-ember' : 'bg-muted'
              }`} />
              <span className="text-xs text-muted hidden sm:inline">
                {status === 'running' ? 'Processing' : status === 'done' ? 'Complete' : status === 'error' ? 'Error' : 'Ready'}
              </span>
            </div>
            
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel border border-border">
                  <User size={12} className="text-accent" />
                  <span className="text-xs text-text-primary">{user.name}</span>
                </div>
                <button onClick={handleLogout} className="p-2 text-muted hover:text-text-primary">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => openAuth('login')} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">Sign In</button>
                <button onClick={() => openAuth('signup')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-glow">Sign Up</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter your research topic…"
                disabled={isRunning}
                className="w-full pl-11 pr-4 py-3 bg-panel border border-border rounded-xl text-sm text-text-primary placeholder-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={!topic.trim() || isRunning}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-glow disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden sm:inline">Researching…</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span className="hidden sm:inline">Start Research</span>
                </>
              )}
            </button>
          </form>

          {status === 'idle' && !report && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-muted">Try:</span>
              {EXAMPLE_TOPICS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setTopic(t)}
                  className="text-xs text-text-secondary hover:text-accent border border-border hover:border-accent/40 rounded-lg px-3 py-1.5"
                >
                  {t.length > 45 ? t.slice(0, 45) + '…' : t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="lg:w-80 shrink-0">
          <div className="bg-white border border-border rounded-xl p-5 lg:sticky lg:top-24">
            <PipelineVisualizer
              nodeOrder={NODE_ORDER}
              nodeStates={nodeStates}
              activeNode={activeNode}
              subQuestions={subQuestions}
              status={status}
            />
          </div>

          <div className="mt-4 bg-white border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowLog(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              <div className="flex items-center gap-2">
                <Terminal size={14} />
                <span>Agent Log</span>
                {logs.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">{logs.length}</span>
                )}
              </div>
              <ChevronDown size={14} className={`transition-transform ${showLog ? 'rotate-180' : ''}`} />
            </button>
            {showLog && (
              <div className="px-4 pb-4 border-t border-border">
                <LogPanel logs={logs} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <strong>Error:</strong> {error}
              <p className="mt-1 text-xs text-red-500">Check that your API keys are configured correctly.</p>
            </div>
          )}

          {report ? (
            <div className="bg-white border border-border rounded-xl p-6">
              <ReportViewer report={report} />
            </div>
          ) : isRunning ? (
            <div className="bg-white border border-border rounded-xl p-8 h-80 flex flex-col items-center justify-center gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap size={20} className="text-accent" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-base text-text-secondary font-medium mb-2">
                  {activeNode ? `Running: ${activeNode.charAt(0).toUpperCase() + activeNode.slice(1)}` : 'Initializing…'}
                </p>
                <p className="text-sm text-muted">Your report will appear here when complete</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-xl h-full min-h-[28rem]">
              <EmptyState />
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-border py-5 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-xs text-text-secondary">
          © 2024 ResearchAgent. All rights reserved.
        </div>
      </footer>
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onLogin={handleLogin} initialMode={authMode} />
    </div>
  )
}
