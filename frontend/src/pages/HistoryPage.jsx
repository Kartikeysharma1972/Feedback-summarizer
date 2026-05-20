import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Search, PenTool, FileText, Trash2, Copy, Check,
  ChevronDown, ChevronUp, X, Calendar, Filter, Share2, Link2
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { FEEDBACK_TYPES, TONES, DOCUMENT_TYPES, SUMMARY_LENGTHS } from "../utils/constants";

function getLabel(arr, value) {
  return arr.find((i) => i.value === value)?.label || value;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function filterByTime(items, range) {
  if (range === "all") return items;
  const now = Date.now();
  const ms = { today: 86400000, week: 604800000, month: 2592000000 };
  return items.filter((i) => now - new Date(i.created_at).getTime() < ms[range]);
}

export default function HistoryPage({ user }) {
  const [tab, setTab] = useState("feedback");
  const [feedbackList, setFeedbackList] = useState([]);
  const [summaryList, setSummaryList] = useState([]);
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(null);
  const [sharing, setSharing] = useState(null);
  const { loading, execute } = useApi();

  const fetchData = async () => {
    try {
      const [fb, sm] = await Promise.all([
        execute(`/feedback/history?user_id=${user.id}`),
        execute(`/summarizer/history?user_id=${user.id}`),
      ]);
      setFeedbackList(fb);
      setSummaryList(sm);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (type, id) => {
    try {
      await execute(`/${type}/history/${id}`, { method: "DELETE" });
      if (type === "feedback") {
        setFeedbackList((prev) => prev.filter((i) => i.id !== id));
      } else {
        setSummaryList((prev) => prev.filter((i) => i.id !== id));
      }
      if (expanded === id) setExpanded(null);
    } catch {}
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async (studentName) => {
    try {
      setSharing(studentName);
      const res = await execute("/students/share", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, student_name: studentName }),
      });
      const shareUrl = `${window.location.origin}/student/${res.token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(`share-${studentName}`);
      setTimeout(() => setCopied(null), 3000);
    } catch {} finally {
      setSharing(null);
    }
  };

  const currentList = tab === "feedback" ? feedbackList : summaryList;
  const filtered = filterByTime(currentList, timeRange).filter((item) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (tab === "feedback") return item.student_name.toLowerCase().includes(q);
    return item.document_name.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">History</h1>
            <p className="text-sm text-text-secondary">View all your past feedback and summaries</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-white border border-border-light p-1 mb-4 max-w-sm">
        <button
          onClick={() => setTab("feedback")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "feedback" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-primary"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          Feedback ({feedbackList.length})
        </button>
        <button
          onClick={() => setTab("summary")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "summary" ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-primary"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Summaries ({summaryList.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder={tab === "feedback" ? "Search by student name..." : "Search by document name..."}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted hover:text-text-secondary" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {[
            { value: "all", label: "All Time" },
            { value: "today", label: "Today" },
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                timeRange === r.value
                  ? "bg-primary text-white"
                  : "bg-white text-text-secondary border border-border hover:bg-panel"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading && currentList.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-panel flex items-center justify-center mx-auto mb-4">
            {tab === "feedback" ? (
              <PenTool className="w-8 h-8 text-muted/40" />
            ) : (
              <FileText className="w-8 h-8 text-muted/40" />
            )}
          </div>
          <h3 className="font-medium text-text-primary mb-1">No {tab === "feedback" ? "feedback" : "summaries"} yet</h3>
          <p className="text-sm text-text-secondary">
            {search ? "Try a different search term." : `Start using the ${tab === "feedback" ? "Feedback Generator" : "Document Summarizer"} to see history here.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-panel/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-text-primary text-sm">
                        {tab === "feedback" ? item.student_name : item.document_name}
                      </span>
                      <span className="badge-blue text-xs">
                        {tab === "feedback"
                          ? getLabel(FEEDBACK_TYPES, item.feedback_type)
                          : getLabel(DOCUMENT_TYPES, item.document_type)}
                      </span>
                      {tab === "feedback" && (
                        <span className="badge-green text-xs">{getLabel(TONES, item.tone)}</span>
                      )}
                      {tab === "feedback" && item.sentiment_label && (
                        <span className={`badge text-xs ${
                          item.sentiment_label === "positive" ? "bg-emerald-50 text-emerald-700" :
                          item.sentiment_label === "negative" ? "bg-red-50 text-red-700" :
                          item.sentiment_label === "mixed" ? "bg-amber-50 text-amber-700" :
                          "bg-slate-50 text-slate-600"
                        }`}>
                          {item.sentiment_label}
                        </span>
                      )}
                      {tab === "summary" && (
                        <span className="badge-amber text-xs">{getLabel(SUMMARY_LENGTHS, item.summary_length)}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  {expanded === item.id ? (
                    <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {expanded === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-border-light pt-4">
                        <div className="bg-panel p-4 rounded-xl text-sm text-text-primary whitespace-pre-wrap leading-relaxed mb-3">
                          {tab === "feedback" ? item.generated_feedback : item.summary}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleCopy(
                                tab === "feedback" ? item.generated_feedback : item.summary,
                                item.id
                              )
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-primary hover:bg-panel rounded-lg transition-colors"
                          >
                            {copied === item.id ? (
                              <Check className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            {copied === item.id ? "Copied!" : "Copy"}
                          </button>
                          {tab === "feedback" && (
                            <button
                              onClick={() => handleShare(item.student_name)}
                              disabled={sharing === item.student_name}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              {copied === `share-${item.student_name}` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-success" />
                                  Link Copied!
                                </>
                              ) : sharing === item.student_name ? (
                                <>
                                  <Link2 className="w-3.5 h-3.5 animate-pulse" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-3.5 h-3.5" />
                                  Share with Student
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(tab === "feedback" ? "feedback" : "summarizer", item.id)}
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
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
