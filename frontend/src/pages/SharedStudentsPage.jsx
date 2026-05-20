import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2, Copy, Check, Trash2, Link2, ExternalLink,
  Search, X, UserPlus, AlertCircle,
} from "lucide-react";
import { useApi } from "../hooks/useApi";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SharedStudentsPage({ user }) {
  const [shares, setShares] = useState([]);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const { loading, error, execute, setError } = useApi();

  const fetchShares = async () => {
    try {
      const data = await execute(`/students/shared?user_id=${user.id}`);
      setShares(data);
    } catch {}
  };

  useEffect(() => { fetchShares(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await execute("/students/share", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, student_name: newName.trim() }),
      });
      setNewName("");
      await fetchShares();
    } catch {} finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (token, studentName) => {
    const url = `${window.location.origin}/student/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleRevoke = async (token) => {
    try {
      await execute(`/students/share/${token}`, { method: "DELETE" });
      setShares((prev) => prev.filter((s) => s.token !== token));
    } catch {}
  };

  const filtered = shares.filter((s) =>
    s.student_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Student Portal</h1>
            <p className="text-sm text-text-secondary">Create shareable links for students to view their feedback</p>
          </div>
        </div>
      </div>

      {/* Create new share */}
      <form onSubmit={handleCreate} className="glass-panel p-4 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Create Student Portal Link
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter student name..."
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="btn-primary px-5 whitespace-nowrap"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Generate Link
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          The student will see all feedback you've generated for them using this exact name.
        </p>
      </form>

      {/* Search */}
      {shares.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search shared students..."
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted hover:text-text-secondary" />
            </button>
          )}
        </div>
      )}

      {/* Shares list */}
      {loading && shares.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-panel flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-muted/40" />
          </div>
          <h3 className="font-medium text-text-primary mb-1">
            {search ? "No matches found" : "No shared portals yet"}
          </h3>
          <p className="text-sm text-text-secondary">
            {search
              ? "Try a different search term."
              : "Generate a link above to share feedback with a student."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((share) => (
              <motion.div
                key={share.token}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-indigo-600">
                      {share.student_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">{share.student_name}</p>
                    <p className="text-xs text-muted">Shared on {formatDate(share.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/student/${share.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Preview
                    </a>
                    <button
                      onClick={() => handleCopyLink(share.token, share.student_name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-primary hover:bg-panel rounded-lg transition-colors"
                    >
                      {copied === share.token ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-success" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRevoke(share.token)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-danger hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-danger bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
