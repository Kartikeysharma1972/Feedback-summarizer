import React, { useState } from 'react'
import { Copy, Download, CheckCircle2, Check } from 'lucide-react'
import ScoreCircle from './ScoreCircle'
import IssueCard from './IssueCard'

export default function ReportPanel({ report }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code-review-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Summary + Score */}
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Executive Summary</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{report.summary}</p>
        </div>
        <ScoreCircle score={report.overall_score} />
      </div>

      {/* Issues */}
      {report.issues && report.issues.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Issues Found
              <span className="ml-2 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {report.issues.length}
              </span>
            </h3>
          </div>
          <div className="space-y-3">
            {report.issues.map((issue, idx) => (
              <IssueCard key={idx} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Positive aspects */}
      {report.positive_aspects && report.positive_aspects.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">
              Positive Aspects
            </h3>
          </div>
          <ul className="space-y-2">
            {report.positive_aspects.map((aspect, idx) => (
              <li key={idx} className="text-sm text-slate-700 leading-relaxed flex items-start gap-2.5">
                <span className="text-emerald-500 mt-1 flex-shrink-0">•</span>
                <span>{aspect}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reflection notes */}
      {report.reflection_notes && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Reflection Notes
          </h3>
          <p className="text-sm text-slate-700 leading-relaxed">{report.reflection_notes}</p>
        </div>
      )}

      {/* Export actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
        >
          <Download size={13} />
          Download
        </button>
      </div>
    </div>
  )
}
