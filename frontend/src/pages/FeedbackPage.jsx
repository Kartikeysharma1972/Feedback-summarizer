import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PenTool, Send, Copy, Check, RefreshCw, Sparkles,
  User, BookOpen, MessageSquare, Heart, Star, Download,
  Edit3, Save, Undo2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, Minus,
  ClipboardList, ChevronDown, ChevronUp, Target,
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { FEEDBACK_TYPES, TONES, GRADE_LEVELS, API_BASE, STANDARD_FRAMEWORKS } from "../utils/constants";

function StarRating({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-text-secondary min-w-[140px]">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`w-5 h-5 transition-colors ${
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

function RubricScorer({ rubric, scores, onScoresChange }) {
  const [expanded, setExpanded] = useState(true);

  if (!rubric) return null;

  return (
    <div className="bg-panel rounded-xl border border-border-light overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-hover transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-text-primary">{rubric.name}</span>
          <span className="text-xs text-muted">({rubric.criteria?.length} criteria)</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-light pt-3">
          {rubric.criteria?.map((criterion) => {
            const currentScore = scores[criterion.id] || 0;
            return (
              <div key={criterion.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{criterion.name}</span>
                  {currentScore > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      currentScore <= 2 ? "bg-red-100 text-red-600" :
                      currentScore === 3 ? "bg-amber-100 text-amber-600" :
                      "bg-emerald-100 text-emerald-600"
                    }`}>
                      {criterion[`level_${currentScore}_label`] || `Level ${currentScore}`}
                    </span>
                  )}
                </div>
                {criterion.description && (
                  <p className="text-xs text-muted">{criterion.description}</p>
                )}
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const label = criterion[`level_${level}_label`] || `Level ${level}`;
                    const desc = criterion[`level_${level}_description`];
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          onScoresChange({ ...scores, [criterion.id]: level });
                        }}
                        title={desc ? `${label}: ${desc}` : label}
                        className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all border ${
                          currentScore === level
                            ? level <= 2
                              ? "bg-red-500 text-white border-red-500 shadow-sm"
                              : level === 3
                              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                              : "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : "bg-white text-text-secondary border-border-light hover:border-primary/30 hover:text-primary"
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-bold">{level}</div>
                          <div className="truncate hidden sm:block" style={{ fontSize: "10px" }}>{label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportCard({ result, ratings, studentName, gradeLevel, feedbackType, tone, user }) {
  const reportRef = useRef(null);

  const handleDownload = () => {
    const ratingRows = Object.entries(ratings || {})
      .map(([key, val]) => {
        const label = FEEDBACK_TYPES.find((f) => f.value === key)?.label || key;
        const stars = "★".repeat(val) + "☆".repeat(5 - val);
        return `<tr><td style="padding:8px 12px;border:1px solid #e0f2fe;font-size:13px;">${label}</td><td style="padding:8px 12px;border:1px solid #e0f2fe;text-align:center;color:#f59e0b;font-size:16px;letter-spacing:2px;">${stars}</td><td style="padding:8px 12px;border:1px solid #e0f2fe;text-align:center;font-weight:600;font-size:13px;">${val}/5</td></tr>`;
      })
      .join("");

    const avgRating = ratings
      ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length).toFixed(1)
      : "N/A";

    const date = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric",
    });

    const toneLabel = TONES.find((t) => t.value === tone)?.label || tone;
    const typeLabel = FEEDBACK_TYPES.find((t) => t.value === feedbackType)?.label || feedbackType;

    const html = `
    <html>
    <head><title>Student Report Card - ${studentName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Outfit', sans-serif; background: #fff; color: #0f172a; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head>
    <body>
    <div style="max-width:700px;margin:0 auto;padding:40px 30px;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:30px;border-bottom:3px solid #2563eb;padding-bottom:20px;">
        <div style="font-size:28px;font-weight:700;color:#2563eb;margin-bottom:4px;">Student Report Card</div>
        <div style="font-size:13px;color:#475569;">Generated by Teacher Toolkit | ${date}</div>
      </div>

      <!-- Student Info -->
      <div style="display:flex;gap:20px;margin-bottom:24px;background:#f0f9ff;padding:16px 20px;border-radius:12px;">
        <div style="flex:1;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Student Name</div>
          <div style="font-size:18px;font-weight:600;margin-top:2px;">${studentName}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Grade</div>
          <div style="font-size:18px;font-weight:600;margin-top:2px;">${gradeLevel}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Overall Rating</div>
          <div style="font-size:18px;font-weight:600;margin-top:2px;color:#2563eb;">${avgRating}/5</div>
        </div>
      </div>

      <!-- Ratings Table -->
      <div style="margin-bottom:24px;">
        <div style="font-size:15px;font-weight:600;margin-bottom:10px;color:#0f172a;">Performance Ratings</div>
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#2563eb;color:white;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:500;">Category</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:500;">Rating</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:500;">Score</th>
            </tr>
          </thead>
          <tbody>${ratingRows}</tbody>
        </table>
      </div>

      <!-- Feedback -->
      <div style="margin-bottom:24px;">
        <div style="font-size:15px;font-weight:600;margin-bottom:10px;color:#0f172a;">
          Teacher's Feedback
          <span style="font-size:11px;font-weight:400;color:#475569;margin-left:8px;">${typeLabel} | ${toneLabel}</span>
        </div>
        <div style="background:#f8fafc;border:1px solid #e0f2fe;border-radius:10px;padding:16px 20px;font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;">
${result.generated_feedback}
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top:2px solid #e0f2fe;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:12px;color:#94a3b8;">Teacher: ${user?.name || "N/A"}</div>
          <div style="font-size:11px;color:#94a3b8;">${user?.email || ""}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#94a3b8;">Powered by</div>
          <div style="font-size:12px;font-weight:600;color:#2563eb;">Teacher Toolkit by CodeVidhya</div>
        </div>
      </div>
    </div>
    </body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 mt-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-text-primary flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Report Card
        </h4>
        <button
          onClick={handleDownload}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
      </div>

      <div className="bg-panel rounded-xl p-4 border border-border-light text-sm space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted text-xs">Student</span>
            <p className="font-medium">{studentName}</p>
          </div>
          <div>
            <span className="text-muted text-xs">Grade</span>
            <p className="font-medium">{gradeLevel}</p>
          </div>
        </div>

        {ratings && Object.keys(ratings).length > 0 && (
          <div className="pt-2 border-t border-border-light">
            <span className="text-muted text-xs">Ratings</span>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {Object.entries(ratings).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="text-xs text-text-secondary truncate">
                    {FEEDBACK_TYPES.find((f) => f.value === key)?.label || key}
                  </span>
                  <div className="flex gap-px ml-auto">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= val ? "fill-amber-400 text-amber-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border-light">
          <span className="text-muted text-xs">Overall</span>
          <p className="font-semibold text-primary text-lg">
            {ratings
              ? (Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length).toFixed(1)
              : "N/A"}{" "}
            / 5
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function FeedbackPage({ user }) {
  const [studentName, setStudentName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [tone, setTone] = useState("encouraging");
  const [context, setContext] = useState("");
  const [ratings, setRatings] = useState({});
  const [rubrics, setRubrics] = useState([]);
  const [selectedRubricId, setSelectedRubricId] = useState("");
  const [rubricScores, setRubricScores] = useState({});
  const [selectedFramework, setSelectedFramework] = useState("");
  const [selectedStandards, setSelectedStandards] = useState([]);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalFeedback, setOriginalFeedback] = useState("");
  const editorRef = useRef(null);
  const { loading, error, execute, setError } = useApi();

  useEffect(() => {
    async function fetchRubrics() {
      try {
        const res = await fetch(`${API_BASE}/rubrics?user_id=${user.id}`);
        if (res.ok) setRubrics(await res.json());
      } catch {}
    }
    fetchRubrics();
  }, [user.id]);

  const handleRatingChange = (type, value) => {
    setRatings((prev) => ({ ...prev, [type]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await execute("/feedback/generate", {
        method: "POST",
        body: JSON.stringify({
          student_name: studentName,
          feedback_type: feedbackType,
          context: context.trim() || null,
          tone,
          grade_level: gradeLevel,
          user_id: user.id,
          ratings: Object.keys(ratings).length > 0 ? ratings : null,
          rubric_id: selectedRubricId || null,
          rubric_scores: selectedRubricId && Object.keys(rubricScores).length > 0 ? rubricScores : null,
          standards: selectedStandards.length > 0 ? selectedStandards : null,
        }),
      });
      setResult(data);
    } catch {}
  };

  const handleStartEdit = () => {
    setOriginalFeedback(result.generated_feedback);
    setIsEditing(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 50);
  };

  const handleSaveEdit = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerHTML;
      setResult((prev) => ({ ...prev, generated_feedback: text, _isHtml: true }));
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = originalFeedback;
    }
    setIsEditing(false);
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleCopy = () => {
    if (!result) return;
    const text = editorRef.current?.innerText || result.generated_feedback;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setStudentName("");
    setGradeLevel("");
    setFeedbackType("");
    setTone("encouraging");
    setContext("");
    setRatings({});
    setSelectedRubricId("");
    setRubricScores({});
    setSelectedFramework("");
    setSelectedStandards([]);
    setResult(null);
    setIsEditing(false);
    setOriginalFeedback("");
  };

  const selectedRubric = rubrics.find((r) => r.id === selectedRubricId);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <PenTool className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Feedback Generator</h1>
            <p className="text-sm text-text-secondary">Create personalized student feedback with AI</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Student Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <User className="w-3.5 h-3.5 inline mr-1.5" />
                Student Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="input-field"
                placeholder="e.g. Arjun Sharma"
                required
              />
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />
                Grade Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select grade level</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />
                Feedback Type
              </label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select feedback type</option>
                {FEEDBACK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Star Ratings */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <Star className="w-3.5 h-3.5 inline mr-1.5" />
                Rate Each Area
              </label>
              <div className="bg-panel rounded-xl p-4 border border-border-light space-y-2.5">
                {FEEDBACK_TYPES.map((ft) => (
                  <StarRating
                    key={ft.value}
                    label={ft.label}
                    value={ratings[ft.value] || 0}
                    onChange={(val) => handleRatingChange(ft.value, val)}
                  />
                ))}
              </div>
            </div>

            {/* Rubric-Based Grading */}
            {rubrics.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  <ClipboardList className="w-3.5 h-3.5 inline mr-1.5" />
                  Rubric Assessment
                  <span className="text-xs text-muted ml-1.5 font-normal">(Optional)</span>
                </label>
                <select
                  value={selectedRubricId}
                  onChange={(e) => {
                    setSelectedRubricId(e.target.value);
                    setRubricScores({});
                  }}
                  className="input-field mb-2"
                >
                  <option value="">No rubric — use star ratings only</option>
                  {rubrics.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.subject ? `(${r.subject})` : ""} {r.grade_level ? `— ${r.grade_level}` : ""}
                    </option>
                  ))}
                </select>

                {selectedRubric && (
                  <RubricScorer
                    rubric={selectedRubric}
                    scores={rubricScores}
                    onScoresChange={setRubricScores}
                  />
                )}
              </div>
            )}

            {/* Standards Alignment */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <Target className="w-3.5 h-3.5 inline mr-1.5" />
                Standards Alignment
                <span className="text-xs text-muted ml-1.5 font-normal">(Optional)</span>
              </label>
              <select
                value={selectedFramework}
                onChange={(e) => {
                  setSelectedFramework(e.target.value);
                  setSelectedStandards([]);
                }}
                className="input-field mb-2"
              >
                <option value="">No standards — skip alignment</option>
                {STANDARD_FRAMEWORKS.map((fw) => (
                  <option key={fw.id} value={fw.id}>{fw.name}</option>
                ))}
              </select>

              {selectedFramework && (
                <div className="bg-panel rounded-xl p-3 border border-border-light space-y-1.5 max-h-48 overflow-y-auto">
                  {STANDARD_FRAMEWORKS.find((fw) => fw.id === selectedFramework)?.standards.map((std) => {
                    const isSelected = selectedStandards.some((s) => s.code === std.code);
                    return (
                      <label
                        key={std.code}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-surface-hover border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedStandards((prev) => prev.filter((s) => s.code !== std.code));
                            } else {
                              setSelectedStandards((prev) => [...prev, { code: std.code, name: std.name, description: std.description }]);
                            }
                          }}
                          className="mt-0.5 rounded border-border text-primary focus:ring-primary/30"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{std.code}</span>
                            <span className="text-sm font-medium text-text-primary">{std.name}</span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">{std.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedStandards.length > 0 && (
                <p className="text-xs text-primary mt-1.5 font-medium">
                  {selectedStandards.length} standard{selectedStandards.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <Heart className="w-3.5 h-3.5 inline mr-1.5" />
                Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
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

            {/* Extra Insight */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                Extra Insight
                <span className="text-xs text-muted ml-1.5 font-normal">(Optional)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="input-field min-h-[100px] resize-none"
                placeholder="Any specific observations? e.g. 'Led the science project brilliantly but struggles with time management during exams'"
                maxLength={500}
              />
              <p className="text-xs text-muted mt-1 text-right">{context.length}/500</p>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate Feedback
                  </>
                )}
              </button>
              {result && (
                <button type="button" onClick={handleReset} className="btn-secondary">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Result */}
        <div className="space-y-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
                <p className="text-text-secondary text-sm">Generating personalized feedback...</p>
              </div>
            ) : result ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary">Generated Feedback</h3>
                    <span className="badge-blue">{FEEDBACK_TYPES.find(t => t.value === result.feedback_type)?.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isEditing ? (
                      <button
                        onClick={handleStartEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-primary hover:bg-panel rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-primary hover:bg-panel rounded-lg transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="badge-sky">{result.grade_level}</span>
                  <span className="badge-green">{TONES.find(t => t.value === result.tone)?.label}</span>
                  {result.sentiment_label && (
                    <span className={`badge ${
                      result.sentiment_label === "positive" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      result.sentiment_label === "negative" ? "bg-red-50 text-red-700 border border-red-200" :
                      result.sentiment_label === "mixed" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "bg-slate-50 text-slate-600 border border-slate-200"
                    }`}>
                      {result.sentiment_label === "positive" ? "Positive Sentiment" :
                       result.sentiment_label === "negative" ? "Negative Sentiment" :
                       result.sentiment_label === "mixed" ? "Mixed Sentiment" : "Neutral Sentiment"}
                      {result.sentiment_score != null && ` (${Math.round(result.sentiment_score * 100)}%)`}
                    </span>
                  )}
                  {result.standards?.map((s) => (
                    <span key={s.code} className="badge bg-violet-50 text-violet-700 border border-violet-200">
                      {s.code}
                    </span>
                  ))}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-0.5 p-1.5 bg-surface rounded-t-xl border border-b-0 border-border-light flex-wrap">
                    <button type="button" onClick={() => execCommand("bold")} className="p-1.5 rounded hover:bg-panel text-text-secondary hover:text-text-primary transition-colors" title="Bold">
                      <Bold className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("italic")} className="p-1.5 rounded hover:bg-panel text-text-secondary hover:text-text-primary transition-colors" title="Italic">
                      <Italic className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("underline")} className="p-1.5 rounded hover:bg-panel text-text-secondary hover:text-text-primary transition-colors" title="Underline">
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border-light mx-1" />
                    <button type="button" onClick={() => execCommand("justifyLeft")} className="p-1.5 rounded hover:bg-panel text-text-secondary hover:text-text-primary transition-colors" title="Align Left">
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("justifyCenter")} className="p-1.5 rounded hover:bg-panel text-text-secondary hover:text-text-primary transition-colors" title="Align Center">
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("justifyRight")} className="p-1.5 rounded hover:bg-panel text-text-secondary hover:text-text-primary transition-colors" title="Align Right">
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border-light mx-1" />
                    <select
                      onChange={(e) => { if (e.target.value) execCommand("fontSize", e.target.value); }}
                      defaultValue=""
                      className="text-xs bg-transparent border border-border-light rounded px-1.5 py-1 text-text-secondary hover:text-text-primary cursor-pointer"
                      title="Font Size"
                    >
                      <option value="" disabled>Size</option>
                      <option value="1">Small</option>
                      <option value="3">Normal</option>
                      <option value="5">Large</option>
                      <option value="7">Huge</option>
                    </select>
                    <div className="w-px h-5 bg-border-light mx-1" />
                    <button type="button" onClick={() => execCommand("insertHorizontalRule")} className="p-1.5 rounded hover:bg-panel text-text-secondary hover:text-text-primary transition-colors" title="Horizontal Line">
                      <Minus className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execCommand("removeFormat")} className="p-1.5 rounded hover:bg-panel text-text-secondary hover:text-text-primary transition-colors" title="Clear Formatting">
                      <Type className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div
                  ref={editorRef}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: result._isHtml ? result.generated_feedback : result.generated_feedback.replace(/\n/g, "<br/>") }}
                  className={`prose-sm text-text-primary leading-relaxed bg-panel p-5 border border-border-light transition-all ${
                    isEditing
                      ? "rounded-b-xl ring-2 ring-primary/30 outline-none min-h-[200px] cursor-text"
                      : "rounded-xl"
                  }`}
                  style={{ whiteSpace: isEditing ? "normal" : "pre-wrap" }}
                />

                <p className="text-xs text-muted mt-3 flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <Edit3 className="w-3 h-3" />
                      Editing mode — make your changes and click Save
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      Auto-saved to history
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                  <PenTool className="w-8 h-8 text-primary/30" />
                </div>
                <h3 className="font-medium text-text-primary mb-1">Ready to Generate</h3>
                <p className="text-sm text-text-secondary max-w-xs">
                  Fill in the form, rate each area, and click generate to create personalized student feedback.
                </p>
              </div>
            )}
          </motion.div>

          {/* Report Card - shows after feedback is generated */}
          {result && (
            <ReportCard
              result={result}
              ratings={ratings}
              studentName={studentName}
              gradeLevel={gradeLevel}
              feedbackType={feedbackType}
              tone={tone}
              user={user}
            />
          )}
        </div>
      </div>
    </div>
  );
}
