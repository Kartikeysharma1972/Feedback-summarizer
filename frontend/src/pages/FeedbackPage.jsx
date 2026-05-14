import { useState } from "react";
import { motion } from "framer-motion";
import {
  PenTool, Send, Copy, Check, RefreshCw, Sparkles,
  User, BookOpen, MessageSquare, Heart
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { FEEDBACK_TYPES, TONES, GRADE_LEVELS } from "../utils/constants";

export default function FeedbackPage({ user }) {
  const [studentName, setStudentName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [tone, setTone] = useState("encouraging");
  const [context, setContext] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const { loading, error, execute, setError } = useApi();

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await execute("/feedback/generate", {
        method: "POST",
        body: JSON.stringify({
          student_name: studentName,
          feedback_type: feedbackType,
          context,
          tone,
          grade_level: gradeLevel,
          user_id: user.id,
        }),
      });
      setResult(data);
    } catch {}
  };

  const handleCopy = () => {
    if (result?.generated_feedback) {
      navigator.clipboard.writeText(result.generated_feedback);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setStudentName("");
    setGradeLevel("");
    setFeedbackType("");
    setTone("encouraging");
    setContext("");
    setResult(null);
  };

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

            {/* Context */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                Your Notes / Context
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="input-field min-h-[120px] resize-none"
                placeholder="Describe the student's performance, strengths, areas to improve, specific incidents, etc."
                required
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
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-primary hover:bg-panel rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge-sky">{result.grade_level}</span>
                <span className="badge-green">{TONES.find(t => t.value === result.tone)?.label}</span>
              </div>

              <div className="prose-sm text-text-primary leading-relaxed whitespace-pre-wrap bg-panel p-5 rounded-xl border border-border-light">
                {result.generated_feedback}
              </div>

              <p className="text-xs text-muted mt-3 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Auto-saved to history
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                <PenTool className="w-8 h-8 text-primary/30" />
              </div>
              <h3 className="font-medium text-text-primary mb-1">Ready to Generate</h3>
              <p className="text-sm text-text-secondary max-w-xs">
                Fill in the form and click generate to create personalized student feedback.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
