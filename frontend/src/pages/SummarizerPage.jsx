import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText, Send, Copy, Check, Upload, X, File,
  Type, Sparkles, Mic
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useApi } from "../hooks/useApi";
import { DOCUMENT_TYPES, SUMMARY_LENGTHS, API_BASE, AUDIO_EXTENSIONS } from "../utils/constants";

export default function SummarizerPage({ user }) {
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("circular");
  const [summaryLength, setSummaryLength] = useState("detailed");
  const [inputMode, setInputMode] = useState("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const { loading, error, execute, setError } = useApi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (inputMode === "paste") {
        if (!text.trim()) { setError("Please enter document text"); return; }
        const data = await execute("/summarizer/summarize", {
          method: "POST",
          body: JSON.stringify({
            document_name: docName || "Untitled Document",
            document_type: docType,
            text,
            summary_length: summaryLength,
            user_id: user.id,
          }),
        });
        setResult(data);
      } else {
        if (!file) { setError("Please upload a file"); return; }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("document_name", docName || file.name);
        formData.append("document_type", docType);
        formData.append("summary_length", summaryLength);
        formData.append("user_id", user.id);

        const res = await fetch(`${API_BASE}/summarizer/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Upload failed");
        setResult(data);
      }
    } catch (err) {
      if (err.message) setError(err.message);
    }
  };

  const handleCopy = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f) => {
    const ext = f.name.split(".").pop().toLowerCase();
    const supported = ["pdf", "docx", "txt", ...AUDIO_EXTENSIONS];
    if (!supported.includes(ext)) {
      setError("Unsupported file type. Use PDF, DOCX, TXT, or audio files (MP3, WAV, M4A, etc.).");
      return;
    }
    if (AUDIO_EXTENSIONS.includes(ext) && f.size > 25 * 1024 * 1024) {
      setError("Audio file must be under 25 MB.");
      return;
    }
    setFile(f);
    if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ""));
    if (AUDIO_EXTENSIONS.includes(ext) && !["lecture", "audio_note"].includes(docType)) {
      setDocType("lecture");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Document Summarizer</h1>
            <p className="text-sm text-text-secondary">Summarize circulars, reports, and school documents</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Document Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Annual Report"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="input-field">
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary Length */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Summary Length</label>
              <div className="flex flex-wrap gap-2">
                {SUMMARY_LENGTHS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSummaryLength(s.value)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                      summaryLength === s.value
                        ? "bg-accent text-white shadow-sm"
                        : "bg-panel text-text-secondary border border-border hover:bg-surface-hover"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex rounded-xl bg-panel border border-border-light p-1">
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  inputMode === "paste" ? "bg-white text-primary shadow-sm" : "text-text-secondary"
                }`}
              >
                <Type className="w-4 h-4" />
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setInputMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  inputMode === "upload" ? "bg-white text-primary shadow-sm" : "text-text-secondary"
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
            </div>

            {/* Input Area */}
            {inputMode === "paste" ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="input-field min-h-[200px] resize-none"
                placeholder="Paste your document content here..."
              />
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : file
                      ? "border-success bg-emerald-50/50"
                      : "border-border hover:border-primary/40"
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    {AUDIO_EXTENSIONS.includes(file.name.split(".").pop().toLowerCase()) ? (
                      <Mic className="w-8 h-8 text-accent" />
                    ) : (
                      <File className="w-8 h-8 text-success" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium text-text-primary">{file.name}</p>
                      <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-2 p-1 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-danger" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
                    <p className="text-sm text-text-secondary mb-1">
                      Drag & drop your file here, or{" "}
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="text-primary font-medium hover:underline"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-muted">Supports PDF, DOCX, TXT, and audio files (MP3, WAV, M4A, OGG, WebM, FLAC)</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.mp3,.wav,.m4a,.ogg,.webm,.flac,.mp4,.mpeg,.mpga"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files[0]) validateAndSetFile(e.target.files[0]);
                      }}
                    />
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Summarize Document
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
              <div className="w-12 h-12 rounded-full border-4 border-border border-t-accent animate-spin" />
              <p className="text-text-secondary text-sm">
                {file && AUDIO_EXTENSIONS.includes(file.name.split(".").pop().toLowerCase())
                  ? "Transcribing audio & generating summary..."
                  : "Summarizing your document..."}
              </p>
            </div>
          ) : result ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-text-primary">Summary</h3>
                  <span className="badge-sky">
                    {DOCUMENT_TYPES.find(t => t.value === result.document_type)?.label}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-primary hover:bg-panel rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="bg-panel p-5 rounded-xl border border-border-light prose-sm max-w-none">
                <ReactMarkdown>{result.summary}</ReactMarkdown>
              </div>

              <p className="text-xs text-muted mt-3 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Auto-saved to history
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-accent/30" />
              </div>
              <h3 className="font-medium text-text-primary mb-1">Ready to Summarize</h3>
              <p className="text-sm text-text-secondary max-w-xs">
                Paste text or upload a document and click summarize to get an AI-generated summary.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
