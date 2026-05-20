import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Trash2, Send, ChevronDown, ChevronUp,
  BookOpen, MessageSquare, Heart, Star, Download, Check,
  Copy, AlertCircle, User, Sparkles, ClipboardList, X,
} from "lucide-react";
import { FEEDBACK_TYPES, TONES, GRADE_LEVELS, API_BASE } from "../utils/constants";

function StarRatingCompact({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary min-w-[100px] truncate">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5"
          >
            <Star
              className={`w-3.5 h-3.5 transition-colors ${
                star <= (hover || value)
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function StudentCard({ student, index, onUpdate, onRemove, canRemove, rubrics, selectedRubricId }) {
  const [expanded, setExpanded] = useState(false);

  const selectedRubric = rubrics.find((r) => r.id === selectedRubricId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white rounded-xl border border-border-light overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={student.student_name}
            onChange={(e) => onUpdate({ ...student, student_name: e.target.value })}
            className="w-full text-sm font-medium text-text-primary bg-transparent border-0 outline-none placeholder:text-muted"
            placeholder="Student name"
          />
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 text-muted hover:text-primary transition-colors"
          title="Expand details"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-muted hover:text-danger transition-colors"
            title="Remove student"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border-light pt-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Extra Insight (Optional)</label>
                <textarea
                  value={student.context || ""}
                  onChange={(e) => onUpdate({ ...student, context: e.target.value })}
                  className="input-field text-sm min-h-[60px] resize-none"
                  placeholder="Any specific observations about this student..."
                  maxLength={300}
                />
              </div>

              <div>
                <label className="text-xs text-muted mb-1.5 block">Star Ratings</label>
                <div className="bg-panel rounded-lg p-3 space-y-1.5">
                  {FEEDBACK_TYPES.map((ft) => (
                    <StarRatingCompact
                      key={ft.value}
                      label={ft.label}
                      value={student.ratings?.[ft.value] || 0}
                      onChange={(val) =>
                        onUpdate({
                          ...student,
                          ratings: { ...student.ratings, [ft.value]: val },
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              {selectedRubric && (
                <div>
                  <label className="text-xs text-muted mb-1.5 block flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" />
                    Rubric Scores — {selectedRubric.name}
                  </label>
                  <div className="bg-panel rounded-lg p-3 space-y-2">
                    {selectedRubric.criteria?.map((criterion) => {
                      const score = student.rubric_scores?.[criterion.id] || 0;
                      return (
                        <div key={criterion.id} className="space-y-1">
                          <span className="text-xs font-medium text-text-primary">{criterion.name}</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() =>
                                  onUpdate({
                                    ...student,
                                    rubric_scores: { ...student.rubric_scores, [criterion.id]: level },
                                  })
                                }
                                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all border ${
                                  score === level
                                    ? level <= 2
                                      ? "bg-red-500 text-white border-red-500"
                                      : level === 3
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : "bg-emerald-500 text-white border-emerald-500"
                                    : "bg-white text-text-secondary border-border-light hover:border-primary/30"
                                }`}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ResultCard({ result, index }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isError = !!result.error;

  const handleCopy = () => {
    if (result.generated_feedback) {
      navigator.clipboard.writeText(result.generated_feedback);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-xl border overflow-hidden ${
        isError ? "border-red-200 bg-red-50" : "border-border-light bg-white"
      }`}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => !isError && setExpanded(!expanded)}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
          isError ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
        }`}>
          {isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{result.student_name}</p>
          {isError ? (
            <p className="text-xs text-red-600 truncate">{result.error}</p>
          ) : (
            <p className="text-xs text-muted truncate">
              {result.generated_feedback?.substring(0, 80)}...
            </p>
          )}
        </div>
        {!isError && (
          <div className="flex items-center gap-1.5">
            {result.sentiment_label && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                result.sentiment_label === "positive" ? "bg-emerald-100 text-emerald-700" :
                result.sentiment_label === "negative" ? "bg-red-100 text-red-700" :
                result.sentiment_label === "mixed" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {result.sentiment_label}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="p-1.5 text-muted hover:text-primary transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && !isError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-border-light pt-3">
              <div className="bg-panel rounded-lg p-4 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {result.generated_feedback}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BatchFeedbackPage({ user }) {
  const [gradeLevel, setGradeLevel] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [tone, setTone] = useState("encouraging");
  const [rubrics, setRubrics] = useState([]);
  const [selectedRubricId, setSelectedRubricId] = useState("");
  const [students, setStudents] = useState([
    { student_name: "", context: "", ratings: {}, rubric_scores: {} },
    { student_name: "", context: "", ratings: {}, rubric_scores: {} },
    { student_name: "", context: "", ratings: {}, rubric_scores: {} },
  ]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRubrics() {
      try {
        const res = await fetch(`${API_BASE}/rubrics?user_id=${user.id}`);
        if (res.ok) setRubrics(await res.json());
      } catch {}
    }
    fetchRubrics();
  }, [user.id]);

  const addStudent = () => {
    setStudents((prev) => [...prev, { student_name: "", context: "", ratings: {}, rubric_scores: {} }]);
  };

  const removeStudent = (index) => {
    setStudents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStudent = (index, data) => {
    setStudents((prev) => prev.map((s, i) => (i === index ? data : s)));
  };

  const validStudents = students.filter((s) => s.student_name.trim());

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    setResults(null);

    if (validStudents.length === 0) {
      setError("Add at least one student name");
      return;
    }

    setLoading(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const target = (validStudents.length / (validStudents.length + 1)) * 100;
        if (prev < target) return prev + (target - prev) * 0.05;
        return prev;
      });
    }, 200);

    try {
      const cleanStudents = validStudents.map((s) => ({
        student_name: s.student_name.trim(),
        context: s.context?.trim() || null,
        ratings: Object.keys(s.ratings || {}).length > 0 ? s.ratings : null,
        rubric_scores: selectedRubricId && Object.keys(s.rubric_scores || {}).length > 0 ? s.rubric_scores : null,
      }));

      const res = await fetch(`${API_BASE}/feedback/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          feedback_type: feedbackType,
          tone,
          grade_level: gradeLevel,
          rubric_id: selectedRubricId || null,
          students: cleanStudents,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResults(data);
      setProgress(100);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  const handleDownloadAll = () => {
    if (!results?.results) return;

    const successResults = results.results.filter((r) => !r.error);
    const date = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });

    const feedbackCards = successResults.map((r) => `
      <div style="break-inside:avoid;margin-bottom:24px;border:1px solid #e0f2fe;border-radius:12px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #2563eb;">
          <div>
            <div style="font-size:18px;font-weight:600;color:#0f172a;">${r.student_name}</div>
            <div style="font-size:12px;color:#475569;">${gradeLevel} | ${FEEDBACK_TYPES.find(t => t.value === r.feedback_type)?.label || r.feedback_type}</div>
          </div>
          ${r.sentiment_label ? `<span style="font-size:11px;padding:4px 10px;border-radius:999px;background:${
            r.sentiment_label === 'positive' ? '#dcfce7' : r.sentiment_label === 'negative' ? '#fecaca' : '#fef9c3'
          };color:${
            r.sentiment_label === 'positive' ? '#166534' : r.sentiment_label === 'negative' ? '#991b1b' : '#854d0e'
          };">${r.sentiment_label}</span>` : ''}
        </div>
        <div style="font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;">${r.generated_feedback}</div>
      </div>
    `).join("");

    const html = `<html><head>
    <title>Batch Feedback Report</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Outfit',sans-serif; background:#fff; color:#0f172a; }
      @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    </style></head><body>
    <div style="max-width:700px;margin:0 auto;padding:40px 30px;">
      <div style="text-align:center;margin-bottom:30px;border-bottom:3px solid #2563eb;padding-bottom:20px;">
        <div style="font-size:28px;font-weight:700;color:#2563eb;">Batch Feedback Report</div>
        <div style="font-size:13px;color:#475569;">${successResults.length} students | ${date} | Generated by Teacher Toolkit</div>
      </div>
      ${feedbackCards}
      <div style="border-top:2px solid #e0f2fe;padding-top:16px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;">Powered by</div>
        <div style="font-size:12px;font-weight:600;color:#2563eb;">Teacher Toolkit by CodeVidhya</div>
      </div>
    </div></body></html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleReset = () => {
    setResults(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Batch Feedback</h1>
            <p className="text-sm text-text-secondary">Generate feedback for multiple students at once</p>
          </div>
        </div>
      </div>

      {results ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-text-primary">Batch Complete</h3>
                <p className="text-sm text-muted">
                  {results.completed} of {results.total} generated successfully
                  {results.failed > 0 && ` (${results.failed} failed)`}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDownloadAll} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download All
                </button>
                <button onClick={handleReset} className="btn-secondary text-sm px-4 py-2">
                  New Batch
                </button>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{results.completed}</p>
                <p className="text-xs text-emerald-700">Completed</p>
              </div>
              {results.failed > 0 && (
                <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{results.failed}</p>
                  <p className="text-xs text-red-700">Failed</p>
                </div>
              )}
              <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{results.total}</p>
                <p className="text-xs text-blue-700">Total</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {results.results.map((result, i) => (
              <ResultCard key={i} result={result} index={i} />
            ))}
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleGenerate}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Shared Settings */}
            <div className="lg:col-span-1 space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 space-y-4">
                <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Shared Settings
                </h3>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    <BookOpen className="w-3 h-3 inline mr-1" />
                    Grade Level
                  </label>
                  <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="input-field text-sm" required>
                    <option value="">Select grade</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                    Feedback Type
                  </label>
                  <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)} className="input-field text-sm" required>
                    <option value="">Select type</option>
                    {FEEDBACK_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    <Heart className="w-3 h-3 inline mr-1" />
                    Tone
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TONES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTone(t.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          tone === t.value
                            ? "bg-primary text-white shadow-sm"
                            : "bg-panel text-text-secondary border border-border hover:bg-surface-hover"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {rubrics.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      <ClipboardList className="w-3 h-3 inline mr-1" />
                      Rubric <span className="text-muted font-normal">(Optional)</span>
                    </label>
                    <select
                      value={selectedRubricId}
                      onChange={(e) => {
                        setSelectedRubricId(e.target.value);
                        setStudents((prev) => prev.map((s) => ({ ...s, rubric_scores: {} })));
                      }}
                      className="input-field text-sm"
                    >
                      <option value="">No rubric</option>
                      {rubrics.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.subject ? `(${r.subject})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2 border-t border-border-light">
                  <p className="text-xs text-muted">
                    {validStudents.length} student{validStudents.length !== 1 ? "s" : ""} ready
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Student List */}
            <div className="lg:col-span-2 space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Students ({students.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addStudent}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Student
                  </button>
                </div>

                <div className="space-y-2">
                  <AnimatePresence>
                    {students.map((student, i) => (
                      <StudentCard
                        key={i}
                        student={student}
                        index={i}
                        onUpdate={(data) => updateStudent(i, data)}
                        onRemove={() => removeStudent(i)}
                        canRemove={students.length > 1}
                        rubrics={rubrics}
                        selectedRubricId={selectedRubricId}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={addStudent}
                  className="w-full mt-3 py-3 border-2 border-dashed border-border-light rounded-xl text-sm text-muted hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Student
                </button>
              </motion.div>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {loading && (
                <div className="glass-panel p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-text-secondary">
                      Generating feedback for {validStudents.length} student{validStudents.length !== 1 ? "s" : ""}...
                    </p>
                  </div>
                  <div className="w-full bg-panel rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-1.5 text-right">{Math.round(progress)}%</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || validStudents.length === 0}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate Feedback for {validStudents.length} Student{validStudents.length !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
