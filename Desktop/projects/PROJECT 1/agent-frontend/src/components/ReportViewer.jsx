import { useState, useMemo } from 'react'
import { Copy, Download, ExternalLink, CheckCircle, BookOpen, Lightbulb, Link2, TrendingUp, TrendingDown, Minus, Quote, Clock, BarChart3, Target, AlertTriangle, Compass } from 'lucide-react'

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
}

function reportToText(report) {
  if (!report) return ''
  const lines = [
    report.title,
    report.subtitle || '',
    '='.repeat(60),
    '',
    'EXECUTIVE SUMMARY',
    report.summary,
    '',
    'KEY FINDINGS',
    ...(report.key_findings || []).map((f, i) => `${i + 1}. ${f}`),
    '',
    ...(report.sections || []).flatMap(s => [`## ${s.heading}`, s.content, '']),
    'REFERENCES',
    ...(report.references || []).map((r, i) => `[${r.id || i + 1}] ${r.title} — ${r.url}`),
    '',
    report.methodology ? `METHODOLOGY: ${report.methodology}` : '',
  ]
  return lines.join('\n')
}

function downloadPDF(report) {
  const win = window.open('about:blank', '_blank')
  if (!win) {
    alert('Please allow pop-ups to download the PDF')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${report.title}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; padding: 2rem; color: #1a1a2e; line-height: 1.7; }
        h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        h2 { font-size: 1.3rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
        .summary { background: #f0f4ff; padding: 1rem 1.5rem; border-left: 4px solid #6366f1; margin: 1.5rem 0; }
        .key-findings { background: #f0fdf4; padding: 1rem 1.5rem; margin: 1rem 0; }
        .key-findings li { margin: 0.4rem 0; }
        a { color: #6366f1; }
        .refs { font-size: 0.85rem; }
        .methodology { font-style: italic; color: #666; font-size: 0.9rem; margin-top: 2rem; }
      </style>
    </head>
    <body>
      <h1>${report.title}</h1>
      ${report.subtitle ? `<p style="color:#666">${report.subtitle}</p>` : ''}
      <div class="summary"><strong>Summary:</strong> ${report.summary}</div>
      ${report.key_findings?.length ? `<h2>Key Findings</h2><div class="key-findings"><ul>${report.key_findings.map(f => `<li>${f}</li>`).join('')}</ul></div>` : ''}
      ${(report.sections || []).map(s => `<h2>${s.heading}</h2><p>${s.content}</p>`).join('')}
      <h2>References</h2>
      <div class="refs">${(report.references || []).map((r, i) => `<p>[${r.id || i + 1}] <a href="${r.url}">${r.title || r.url}</a></p>`).join('')}</div>
      ${report.methodology ? `<p class="methodology">Methodology: ${report.methodology}</p>` : ''}
    </body>
    </html>
  `
  win.document.write(html)
  win.document.close()
  setTimeout(() => win.print(), 300)
}

function BarChart({ data, title }) {
  const maxValue = Math.max(...data.map(d => d.value))
  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
      <h4 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
        <BarChart3 size={14} className="text-accent" />
        {title}
      </h4>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-text-secondary w-24 truncate">{item.label}</span>
            <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-accent rounded"
                style={{ width: `${Math.max(10, (item.value / maxValue) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-text-primary w-12 text-right">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PieChart({ data, title }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const colors = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#ec4899']
  
  let cumulativePercent = 0
  const segments = data.map((d, i) => {
    const percent = (d.value / total) * 100
    const segment = { ...d, percent, color: colors[i % colors.length], startPercent: cumulativePercent }
    cumulativePercent += percent
    return segment
  })

  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
      <h4 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
        <BarChart3 size={14} className="text-teal" />
        {title}
      </h4>
      <div className="flex items-center gap-6">
        <div 
          className="w-28 h-28 rounded-full shrink-0"
          style={{ background: `conic-gradient(${segments.map(s => `${s.color} ${s.startPercent}% ${s.startPercent + s.percent}%`).join(', ')})` }}
        />
        <div className="space-y-2 flex-1">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
              <span className="text-text-secondary truncate flex-1">{s.label}</span>
              <span className="text-text-primary font-medium">{s.percent.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ stat }) {
  const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Minus
  const trendColor = stat.trend === 'up' ? 'text-teal' : stat.trend === 'down' ? 'text-red-500' : 'text-gray-400'
  
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl font-bold text-accent">{stat.value}</span>
        {stat.trend && <TrendIcon size={16} className={trendColor} />}
      </div>
      <div className="text-sm font-medium text-text-primary mb-1">{stat.label}</div>
      <p className="text-xs text-text-secondary">{stat.description}</p>
    </div>
  )
}

function Timeline({ events }) {
  return (
    <div className="relative pl-6 border-l-2 border-accent/30 space-y-5">
      {events.map((event, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-[1.55rem] w-3 h-3 rounded-full bg-accent" />
          <div className="text-xs font-mono text-accent mb-1">{event.date}</div>
          <div className="text-sm font-medium text-text-primary">{event.event}</div>
          <p className="text-xs text-text-secondary mt-1">{event.significance}</p>
        </div>
      ))}
    </div>
  )
}

function ExpertQuote({ insight }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <Quote size={18} className="text-amber-400 mb-2" />
      <p className="text-sm text-text-secondary italic">"{insight.quote}"</p>
      <div className="mt-3 pt-3 border-t border-amber-200">
        <span className="text-xs font-medium text-amber-600">— {insight.source}</span>
      </div>
    </div>
  )
}

export default function ReportViewer({ report }) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('report')

  const charts = useMemo(() => {
    if (!report?.chart_data) return []
    return report.chart_data.map((chart, i) => ({ ...chart, id: i }))
  }, [report])

  if (!report) return null

  const handleCopy = () => {
    copyToClipboard(reportToText(report))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="font-display text-2xl text-text-primary leading-tight mb-1">{report.title}</h1>
            {report.subtitle && <p className="text-sm text-text-secondary">{report.subtitle}</p>}
            {report.date_generated && <p className="text-xs text-muted mt-2 font-mono">{report.date_generated}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-text-secondary hover:text-text-primary hover:border-accent">
              {copied ? <CheckCircle size={13} className="text-teal" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => downloadPDF(report)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-glow">
              <Download size={13} />
              PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-5">
          {['report', 'statistics', 'timeline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium ${activeTab === tab ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="p-5 rounded-xl bg-indigo-50 border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-accent" />
            <span className="text-xs font-semibold text-accent uppercase tracking-wide">Executive Summary</span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{report.summary}</p>
        </div>
      </div>

      {activeTab === 'report' && (
        <>
          {/* Statistics */}
          {report.statistics?.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-teal" />
                <span className="text-xs font-semibold text-teal uppercase tracking-wide">Key Metrics</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {report.statistics.slice(0, 4).map((stat, i) => <StatCard key={i} stat={stat} />)}
              </div>
            </div>
          )}

          {/* Key Findings */}
          {report.key_findings?.length > 0 && (
            <div className="mb-6 p-5 rounded-xl bg-teal-50 border border-teal-100">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-teal" />
                <span className="text-xs font-semibold text-teal uppercase tracking-wide">Key Findings</span>
              </div>
              <ul className="space-y-2">
                {report.key_findings.map((finding, i) => (
                  <li key={i} className="flex gap-3 text-sm text-text-secondary">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal/20 text-teal flex items-center justify-center text-xs font-medium">{i + 1}</span>
                    <span className="pt-0.5">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Charts */}
          {charts.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">Data Visualization</span>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                {charts.map((chart, i) => (
                  chart.chart_type === 'pie' 
                    ? <PieChart key={i} data={chart.data} title={chart.title} />
                    : <BarChart key={i} data={chart.data} title={chart.title} />
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-5">
            {(report.sections || []).map((section, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h2 className="font-display text-lg text-text-primary mb-3 pb-3 border-b border-gray-200 flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center text-sm font-mono font-semibold">{String(i + 1).padStart(2, '0')}</span>
                  {section.heading}
                </h2>
                <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{section.content}</div>
                
                {section.key_points?.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-gray-100">
                    <span className="text-xs font-medium text-muted uppercase">Key Points</span>
                    <ul className="mt-2 space-y-1">
                      {section.key_points.map((point, pi) => (
                        <li key={pi} className="text-xs text-text-secondary flex gap-2">
                          <span className="text-accent">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {section.sources?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.sources.map((src, si) => (
                      <a key={si} href={src} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs text-accent hover:bg-accent/10">
                        <Link2 size={10} />
                        {(() => { try { return new URL(src).hostname } catch { return src.slice(0, 30) } })()}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Expert Insights */}
          {report.expert_insights?.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Quote size={14} className="text-amber" />
                <span className="text-xs font-semibold text-amber uppercase tracking-wide">Expert Insights</span>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                {report.expert_insights.map((insight, i) => <ExpertQuote key={i} insight={insight} />)}
              </div>
            </div>
          )}

          {/* Future Outlook */}
          {report.future_outlook && (
            <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Compass size={16} className="text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">Future Outlook</span>
              </div>
              <p className="text-sm text-text-secondary">{report.future_outlook}</p>
            </div>
          )}

          {/* Limitations */}
          {report.limitations && (
            <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Research Limitations</span>
              </div>
              <p className="text-xs text-text-secondary">{report.limitations}</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {report.statistics?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-teal" />
                <span className="text-xs font-semibold text-teal uppercase tracking-wide">All Metrics</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {report.statistics.map((stat, i) => <StatCard key={i} stat={stat} />)}
              </div>
            </div>
          )}
          {charts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">Charts</span>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                {charts.map((chart, i) => (
                  chart.chart_type === 'pie' 
                    ? <PieChart key={i} data={chart.data} title={chart.title} />
                    : <BarChart key={i} data={chart.data} title={chart.title} />
                ))}
              </div>
            </div>
          )}
          {!report.statistics?.length && !charts.length && (
            <div className="text-center py-12 text-muted">No statistical data available.</div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div>
          {report.timeline?.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} className="text-accent" />
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">Event Timeline</span>
              </div>
              <Timeline events={report.timeline} />
            </div>
          ) : (
            <div className="text-center py-12 text-muted">No timeline data available.</div>
          )}
        </div>
      )}

      {/* References */}
      {report.references?.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink size={14} className="text-text-secondary" />
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">References ({report.references.length})</h3>
          </div>
          <div className="space-y-2 bg-gray-50 rounded-xl p-4">
            {report.references.map((ref, i) => (
              <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm text-text-secondary hover:text-accent p-2 rounded-lg hover:bg-white">
                <span className="text-accent font-mono text-xs">[{ref.id || i + 1}]</span>
                <span className="hover:underline">{ref.title || ref.url}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Methodology */}
      {report.methodology && (
        <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Methodology: </span>
          <span className="text-xs text-text-secondary">{report.methodology}</span>
        </div>
      )}
    </div>
  )
}
