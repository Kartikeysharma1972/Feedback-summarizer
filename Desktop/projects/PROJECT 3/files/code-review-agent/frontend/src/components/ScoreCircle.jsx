import React from 'react'

export default function ScoreCircle({ score }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = (score) => {
    if (score >= 80) return { stroke: '#22c55e', bg: '#f0fdf4', text: '#16a34a' }
    if (score >= 60) return { stroke: '#eab308', bg: '#fefce8', text: '#ca8a04' }
    return { stroke: '#ef4444', bg: '#fef2f2', text: '#dc2626' }
  }

  const getLabel = (score) => {
    if (score >= 80) return 'Good'
    if (score >= 60) return 'Fair'
    return 'Poor'
  }

  const colors = getColor(score)

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg width="128" height="128" className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="#e2e8f0"
          strokeWidth="8"
          fill="none"
        />
        {/* Score arc */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke={colors.stroke}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold font-mono" style={{ color: colors.text }}>
          {score}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: colors.text }}>
          {getLabel(score)}
        </div>
      </div>
    </div>
  )
}
