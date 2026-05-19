import React, { useState } from 'react'
import { AlertCircle, Shield, Zap, Code2, Copy, Check } from 'lucide-react'

const TYPE_CONFIG = {
  bug:         { icon: AlertCircle, color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700' },
  security:    { icon: Shield,      color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  performance: { icon: Zap,         color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700' },
  style:       { icon: Code2,       color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
}

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-700',    bg: 'bg-red-100' },
  high:     { label: 'High',     color: 'text-red-600',    bg: 'bg-red-50' },
  medium:   { label: 'Medium',   color: 'text-amber-700',  bg: 'bg-amber-100' },
  low:      { label: 'Low',      color: 'text-blue-600',   bg: 'bg-blue-100' },
}

export default function IssueCard({ issue }) {
  const [copied, setCopied] = useState(false)
  const typeConfig = TYPE_CONFIG[issue.type] || TYPE_CONFIG.bug
  const severityConfig = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium
  const Icon = typeConfig.icon

  const handleCopyFix = () => {
    const fixText = issue.fixed_code || issue.fix || ''
    navigator.clipboard.writeText(fixText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`rounded-xl border ${typeConfig.border} overflow-hidden`}>
      {/* Issue header */}
      <div className={`px-4 py-3.5 ${typeConfig.bg}`}>
        <div className="flex items-start gap-3">
          <Icon size={16} className={`${typeConfig.color} mt-0.5 flex-shrink-0`} />

          <div className="flex-1 min-w-0">
            {/* Tags */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${typeConfig.badge}`}>
                {issue.type}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${severityConfig.bg} ${severityConfig.color}`}>
                {severityConfig.label}
              </span>
              {issue.location && (
                <span className="text-xs text-slate-500 font-mono">
                  {issue.location}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-800 leading-relaxed">
              {issue.description}
            </p>
          </div>
        </div>
      </div>

      {/* Fix + Corrected Code — always visible */}
      {(issue.fix || issue.fixed_code) && (
        <div className="border-t border-slate-200 bg-white p-4 space-y-3">
          {/* Text explanation */}
          {issue.fix && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">How to fix</p>
              <p className="text-sm text-slate-700 leading-relaxed">{issue.fix}</p>
            </div>
          )}

          {/* Corrected code block */}
          {issue.fixed_code && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">✓ Corrected Code</p>
                <button
                  onClick={handleCopyFix}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-[13px] font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap">
                  {issue.fixed_code}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
