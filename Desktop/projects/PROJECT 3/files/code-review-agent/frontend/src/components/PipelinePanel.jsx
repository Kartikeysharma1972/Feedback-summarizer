import React from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

const NODES = [
  { id: 'input', label: 'Input Processing' },
  { id: 'analysis', label: 'Code Analysis' },
  { id: 'reflection', label: 'Self-Reflection' },
  { id: 'refinement', label: 'Refinement' },
  { id: 'report', label: 'Report Generation' },
]

export default function PipelinePanel({ nodeStates, logs }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Pipeline Status
        </h4>
      </div>

      {/* Node list */}
      <div className="space-y-1">
        {NODES.map((node) => {
          const state = nodeStates[node.id]
          const isDone = state === 'done'
          const isRunning = state === 'running'

          return (
            <div
              key={node.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isRunning ? 'bg-blue-50' : isDone ? 'bg-emerald-50/60' : ''
              }`}
            >
              {isDone && <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />}
              {isRunning && <Loader2 size={15} className="text-blue-600 animate-spin flex-shrink-0" />}
              {!state && <Circle size={15} className="text-slate-300 flex-shrink-0" />}

              <span className={`text-sm font-medium ${
                isDone ? 'text-emerald-700' :
                isRunning ? 'text-blue-700' :
                'text-slate-400'
              }`}>
                {node.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Activity Log</p>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {logs.slice(-8).map((log, i) => (
              <p key={i} className="text-xs text-slate-500 leading-relaxed font-mono">
                {log}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
