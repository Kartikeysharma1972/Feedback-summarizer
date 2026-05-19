import { useState, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const NODE_ORDER = ['planner', 'search', 'extraction', 'synthesis', 'reflection', 'refinement']

export function useResearch() {
  const [status, setStatus] = useState('idle') // idle | starting | running | done | error
  const [nodeStates, setNodeStates] = useState({})      // node -> { status, message, data }
  const [activeNode, setActiveNode] = useState(null)
  const [subQuestions, setSubQuestions] = useState([])
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [logs, setLogs] = useState([])
  const [sessionId, setSessionId] = useState(null)

  const esRef = useRef(null)

  const appendLog = useCallback((msg) => {
    setLogs(prev => [...prev, { ts: Date.now(), msg }])
  }, [])

  const reset = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setStatus('idle')
    setNodeStates({})
    setActiveNode(null)
    setSubQuestions([])
    setReport(null)
    setError(null)
    setLogs([])
    setSessionId(null)
  }, [])

  const startResearch = useCallback(async (topic) => {
    reset()
    setStatus('starting')
    appendLog(`Initiating research: "${topic}"`)

    try {
      const res = await fetch(`${API_BASE}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to start research')
      }

      const { session_id } = await res.json()
      setSessionId(session_id)
      setStatus('running')
      appendLog(`Session started: ${session_id}`)

      // Initialize all nodes as pending
      const initNodes = {}
      NODE_ORDER.forEach(n => { initNodes[n] = { status: 'pending', message: '', data: null } })
      setNodeStates(initNodes)

      // Connect to SSE stream
      const es = new EventSource(`${API_BASE}/stream/${session_id}`)
      esRef.current = es

      es.addEventListener('start', (e) => {
        const d = JSON.parse(e.data)
        appendLog(d.message)
      })

      es.addEventListener('node_event', (e) => {
        const d = JSON.parse(e.data)
        const { node, status: nodeStatus, data } = d

        setActiveNode(node)
        setNodeStates(prev => ({
          ...prev,
          [node]: { status: nodeStatus, message: data?.message || '', data },
        }))

        appendLog(`[${node}] ${data?.message || nodeStatus}`)

        if (node === 'planner' && nodeStatus === 'done' && data?.sub_questions) {
          setSubQuestions(data.sub_questions)
        }
      })

      es.addEventListener('report_ready', (e) => {
        const d = JSON.parse(e.data)
        setReport(d.report)
        appendLog('Final report received.')
      })

      es.addEventListener('done', () => {
        setStatus('done')
        setActiveNode(null)
        appendLog('Research pipeline complete.')
        es.close()
      })

      es.addEventListener('error', (e) => {
        let msg = 'Stream error'
        try { msg = JSON.parse(e.data).message } catch {}
        setError(msg)
        setStatus('error')
        appendLog(`ERROR: ${msg}`)
        es.close()
      })

      es.addEventListener('close', () => {
        es.close()
      })

      es.onerror = () => {
        if (status !== 'done') {
          setError('Connection lost')
          setStatus('error')
          es.close()
        }
      }

    } catch (err) {
      setError(err.message)
      setStatus('error')
      appendLog(`Error: ${err.message}`)
    }
  }, [reset, appendLog])

  return {
    status,
    nodeStates,
    activeNode,
    subQuestions,
    report,
    error,
    logs,
    sessionId,
    startResearch,
    reset,
    NODE_ORDER,
  }
}
