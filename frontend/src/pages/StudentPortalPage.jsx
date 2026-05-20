import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Star, TrendingUp, Calendar, MessageSquare,
  ChevronDown, ChevronUp, Smile, Frown, Meh, AlertCircle,
  BookOpen, Clock, Award, Sun, Sprout,
} from "lucide-react";
import { API_BASE, FEEDBACK_TYPES, TONES } from "../utils/constants";

function getLabel(arr, value) {
  return arr.find((i) => i.value === value)?.label || value;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const sentimentConfig = {
  positive: { icon: Smile, color: "text-emerald-600", bg: "bg-emerald-50", label: "Positive" },
  negative: { icon: Frown, color: "text-red-600", bg: "bg-red-50", label: "Needs Improvement" },
  mixed: { icon: Meh, color: "text-amber-600", bg: "bg-amber-50", label: "Mixed" },
  neutral: { icon: Meh, color: "text-slate-500", bg: "bg-slate-50", label: "Neutral" },
};

function SentimentBadge({ label }) {
  const config = sentimentConfig[label] || sentimentConfig.neutral;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function RatingStars({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= value ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

const ratingLabels = {
  academic_performance: "Academic",
  concept_clarity: "Concepts",
  communication_skill: "Communication",
  homework_completion: "Homework",
  discipline: "Discipline",
  creativity: "Creativity",
  examination_performance: "Exams",
  learning_progress: "Progress",
  behavior: "Behavior",
  participation: "Participation",
  social_skills: "Social",
  overall_progress: "Overall",
};

function FeedbackCard({ item, isFirst }) {
  const [expanded, setExpanded] = useState(isFirst);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-800">
              {getLabel(FEEDBACK_TYPES, item.feedback_type)}
            </span>
            {item.sentiment_label && <SentimentBadge label={item.sentiment_label} />}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(item.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {item.grade_level}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-300 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-300 flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                {item.generated_feedback}
              </div>

              {item.ratings && Object.keys(item.ratings).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ratings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(item.ratings).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between bg-white border border-slate-100 rounded-lg px-3 py-2">
                        <span className="text-xs text-slate-600">{ratingLabels[key] || key}</span>
                        <RatingStars value={val} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.sentiment_breakdown && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sentiment Breakdown</h4>
                  <div className="flex gap-3 flex-wrap">
                    {Object.entries(item.sentiment_breakdown).map(([key, val]) => (
                      <div key={key} className="bg-white border border-slate-100 rounded-lg px-3 py-2 text-center min-w-[80px]">
                        <div className="text-lg font-bold text-indigo-600">{Math.round(val * 100)}%</div>
                        <div className="text-[10px] text-slate-400 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {item.glow_grow && (item.glow_grow.glows?.length > 0 || item.glow_grow.grows?.length > 0) && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Glow & Grow</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {item.glow_grow.glows?.length > 0 && (
                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-semibold text-emerald-700">Glows</span>
                        </div>
                        <ul className="space-y-1">
                          {item.glow_grow.glows.map((g, i) => (
                            <li key={i} className="text-xs text-emerald-700 flex items-start gap-1.5">
                              <span className="text-emerald-400 mt-0.5">•</span>{g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.glow_grow.grows?.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sprout className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-semibold text-blue-700">Grows</span>
                        </div>
                        <ul className="space-y-1">
                          {item.glow_grow.grows.map((g, i) => (
                            <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                              <span className="text-blue-400 mt-0.5">•</span>{g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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

export default function StudentPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/students/portal/${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Link not found");
        }
        setData(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const { student_name, teacher_name, feedback, stats } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">My Feedback Portal</h1>
            <p className="text-xs text-slate-400">by {teacher_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Student hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <span className="text-3xl font-bold text-white">
              {student_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">{student_name}</h2>
          <p className="text-sm text-slate-400">Your feedback from {teacher_name}</p>
        </motion.div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800">{stats.total_feedback}</div>
            <div className="text-[11px] text-slate-400">Feedback</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {stats.avg_sentiment ? `${Math.round(stats.avg_sentiment * 100)}%` : "—"}
            </div>
            <div className="text-[11px] text-slate-400">Positivity</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              {stats.latest_date ? formatDate(stats.latest_date) : "—"}
            </div>
            <div className="text-[11px] text-slate-400">Latest</div>
          </motion.div>
        </div>

        {/* Feedback list */}
        {feedback.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-200" />
            </div>
            <h3 className="font-semibold text-slate-600 mb-1">No feedback yet</h3>
            <p className="text-sm text-slate-400">Your teacher hasn't added any feedback yet. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <Award className="w-4 h-4" />
              Your Feedback ({feedback.length})
            </h3>
            {feedback.map((item, i) => (
              <FeedbackCard key={item.id} item={item} isFirst={i === 0} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-300">
        Powered by Teacher Toolkit
      </footer>
    </div>
  );
}
