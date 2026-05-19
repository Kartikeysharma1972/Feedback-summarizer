import { CheckCircle, Loader, AlertCircle, Brain, Search, FileText, GitMerge, Eye, Sparkles } from 'lucide-react'

const NODE_META = {
  planner: { label: 'Planner', desc: 'Decompose into sub-questions', Icon: Brain, color: '#6366f1' },
  search: { label: 'Web Search', desc: 'Retrieve sources from the web', Icon: Search, color: '#14b8a6' },
  extraction: { label: 'Extraction', desc: 'Parse & distill key content', Icon: FileText, color: '#f59e0b' },
  synthesis: { label: 'Synthesis', desc: 'Combine into draft report', Icon: GitMerge, color: '#8b5cf6' },
  reflection: { label: 'Reflection', desc: 'Self-critique & gap analysis', Icon: Eye, color: '#10b981' },
  refinement: { label: 'Refinement', desc: 'Finalize structured output', Icon: Sparkles, color: '#f97316' },
}

function NodeIcon({ nodeState, meta, isActive }) {
  const { Icon, color } = meta

  if (nodeState?.status === 'running' || isActive) {
    return (
      <div className="relative flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: `${color}15`, border: `2px solid ${color}` }}>
        <Loader size={16} className="animate-spin" style={{ color }} />
      </div>
    )
  }

  if (nodeState?.status === 'done') {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: `${color}15`, border: `2px solid ${color}` }}>
        <CheckCircle size={18} style={{ color }} />
      </div>
    )
  }

  if (nodeState?.status === 'error') {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 border-2 border-red-300">
        <AlertCircle size={18} className="text-red-500" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 border-2 border-gray-200">
      <Icon size={16} className="text-gray-400" />
    </div>
  )
}

export default function PipelineVisualizer({ nodeOrder, nodeStates, activeNode, subQuestions, status }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-lg text-text-primary font-semibold mb-1">Research Pipeline</h2>
        <p className="text-xs text-text-secondary">Real-time agent progress</p>
      </div>

      <div className="space-y-1">
        {nodeOrder.map((key, idx) => {
          const meta = NODE_META[key]
          const nodeState = nodeStates[key] || { status: 'pending' }
          const isActive = activeNode === key
          const isDone = nodeState.status === 'done'
          const isRunning = nodeState.status === 'running' || isActive

          return (
            <div key={key}>
              <div className={`flex items-start gap-3 p-3 rounded-lg ${isRunning ? 'bg-accent/5 border border-accent/20' : ''}`}>
                <NodeIcon nodeState={nodeState} meta={meta} isActive={isActive} />
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isDone ? 'text-text-secondary' : isRunning ? 'text-text-primary' : 'text-gray-400'}`}>
                      {meta.label}
                    </span>
                    {isRunning && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Active</span>}
                    {isDone && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal font-medium">Done</span>}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{isRunning && nodeState.message ? nodeState.message : meta.desc}</p>

                  {key === 'planner' && isDone && subQuestions.length > 0 && (
                    <ul className="mt-3 space-y-1.5 bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {subQuestions.map((q, i) => (
                        <li key={i} className="text-xs text-text-secondary flex gap-2">
                          <span className="text-accent font-mono font-semibold">{i + 1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {idx < nodeOrder.length - 1 && <div className="ml-8 w-0.5 h-2 bg-gray-200 rounded-full" />}
            </div>
          )
        })}
      </div>

      {status === 'done' && (
        <div className="mt-5 p-3 rounded-lg bg-teal-50 border border-teal-200">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-teal-600" />
            <span className="text-sm text-teal-700 font-medium">Research Complete</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm text-red-600 font-medium">Pipeline Error</span>
          </div>
        </div>
      )}
    </div>
  )
}
