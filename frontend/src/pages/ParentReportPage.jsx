import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Send, Copy, Check, Trash2, ChevronDown, ChevronUp,
  Users, Calendar, Printer, Clock, AlertCircle, Globe
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { LANGUAGES } from "../utils/constants";

const REPORT_TYPES = [
  { value: "ptm", label: "PTM Report", description: "Comprehensive Parent-Teacher Meeting report" },
  { value: "progress", label: "Progress Update", description: "Focused on recent improvements" },
  { value: "concern", label: "Concern Report", description: "Highlights areas needing attention" },
  { value: "appreciation", label: "Appreciation", description: "Celebrates achievements" },
];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ParentReportPage({ user }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [reportType, setReportType] = useState("ptm");
  const [language, setLanguage] = useState("english");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [expandedReport, setExpandedReport] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const printRef = useRef(null);
  const { loading, error, execute, setError } = useApi();

  useEffect(() => {
    fetchStudents();
    fetchHistory();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await execute(`/reports/students?user_id=${user.id}`);
      setStudents(data);
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const data = await execute(`/reports/history?user_id=${user.id}`);
      setHistory(data);
    } catch {}
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    if (!selectedStudent) {
      setError("Please select a student");
      return;
    }
    try {
      const data = await execute("/reports/generate", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          student_name: selectedStudent,
          report_type: reportType,
          language,
        }),
      });
      setResult(data);
      fetchHistory();
    } catch (err) {
      if (err.message) setError(err.message);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePrint = () => {
    const content = result?.report_text || "";
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html><head><title>Parent Report - ${result?.student_name}</title>
      <style>body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; line-height: 1.8; font-size: 14px; color: #1a1a1a; padding: 0 20px; }
      h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }</style>
      </head><body><h1>Parent Report — ${result?.student_name} (${result?.grade_level})</h1>
      <p style="white-space: pre-wrap;">${content}</p>
      <p style="color: #888; font-size: 12px; margin-top: 40px;">Generated on ${formatDate(result?.created_at)}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDelete = async (id) => {
    try {
      await execute(`/reports/history/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((r) => r.id !== id));
      if (expandedReport === id) setExpandedReport(null);
    } catch {}
  };

  const selectedStudentData = students.find((s) => s.student_name === selectedStudent);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Parent Report Generator</h1>
            <p className="text-sm text-text-secondary">Generate comprehensive parent reports from feedback history</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Student Selector */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Select Student</label>
              {students.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  No students found. Generate some feedback first.
                </div>
              ) : (
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="input-field"
                >
                  <option value="">Choose a student...</option>
                  {students.map((s) => (
                    <option key={s.student_name} value={s.student_name}>
                      {s.student_name} — {s.grade_level} ({s.feedback_count} feedback)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Student Info Card */}
            {selectedStudentData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-panel p-3 rounded-xl border border-border-light"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {selectedStudentData.student_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{selectedStudentData.student_name}</p>
                    <p className="text-xs text-muted">{selectedStudentData.grade_level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{selectedStudentData.feedback_count}</p>
                    <p className="text-xs text-muted">feedback entries</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Report Type</label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_TYPES.map((rt) => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setReportType(rt.value)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      reportType === rt.value
                        ? "border-primary bg-primary/5"
                        : "border-border-light hover:border-primary/30"
                    }`}
                  >
                    <p className={`text-sm font-medium ${reportType === rt.value ? "text-primary" : "text-text-primary"}`}>
                      {rt.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{rt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Report Language
              </label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field">
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedStudent}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Result */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-6"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-border border-t-rose-500 animate-spin" />
              <p className="text-text-secondary text-sm">Compiling feedback and generating report...</p>
            </div>
          ) : result ? (
            <div ref={printRef}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-text-primary">{result.student_name}</h3>
                  <p className="text-xs text-muted flex items-center gap-1">
                    {result.grade_level} — {REPORT_TYPES.find((r) => r.value === result.report_type)?.label}
                    {" "}— {result.feedback_count} feedback entries
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(result.report_text, "result")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-primary hover:bg-panel rounded-lg transition-colors"
                  >
                    {copied === "result" ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    {copied === "result" ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>

              {result.language && result.language !== "english" && (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="badge text-xs bg-indigo-50 text-indigo-700 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {LANGUAGES.find((l) => l.value === result.language)?.label?.split(" (")[0] || result.language}
                  </span>
                </div>
              )}

              <div className="bg-panel p-5 rounded-xl border border-border-light text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {result.report_text}
              </div>

              <p className="text-xs text-muted mt-3 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Auto-saved to report history
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-rose-300" />
              </div>
              <h3 className="font-medium text-text-primary mb-1">Ready to Generate</h3>
              <p className="text-sm text-text-secondary max-w-xs">
                Select a student and report type, then click generate to create a comprehensive parent report.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Report History */}
      <div className="mt-8">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <Clock className="w-4 h-4" />
          Past Reports ({history.length})
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {history.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                  <p className="text-sm text-text-secondary">No reports generated yet.</p>
                </div>
              ) : (
                history.map((report) => (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-panel/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-text-primary text-sm">{report.student_name}</span>
                          <span className="badge-blue text-xs">{report.grade_level}</span>
                          <span className="badge-green text-xs">
                            {REPORT_TYPES.find((r) => r.value === report.report_type)?.label || report.report_type}
                          </span>
                          <span className="badge text-xs bg-slate-50 text-slate-600">
                            {report.feedback_count} feedback
                          </span>
                          {report.language && report.language !== "english" && (
                            <span className="badge text-xs bg-indigo-50 text-indigo-700 flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {LANGUAGES.find((l) => l.value === report.language)?.label?.split(" (")[0] || report.language}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                      {expandedReport === report.id ? (
                        <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedReport === report.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-border-light pt-4">
                            <div className="bg-panel p-4 rounded-xl text-sm text-text-primary whitespace-pre-wrap leading-relaxed mb-3">
                              {report.report_text}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopy(report.report_text, report.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-primary hover:bg-panel rounded-lg transition-colors"
                              >
                                {copied === report.id ? (
                                  <Check className="w-3.5 h-3.5 text-success" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                {copied === report.id ? "Copied!" : "Copy"}
                              </button>
                              <button
                                onClick={() => handleDelete(report.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-danger hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
