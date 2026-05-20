import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp,
  GripVertical, BookOpen, Star, AlertCircle,
} from "lucide-react";
import { useApi } from "../hooks/useApi";
import { GRADE_LEVELS } from "../utils/constants";

const DEFAULT_LEVELS = [
  { key: 1, label: "Beginning", description: "" },
  { key: 2, label: "Developing", description: "" },
  { key: 3, label: "Proficient", description: "" },
  { key: 4, label: "Advanced", description: "" },
  { key: 5, label: "Exemplary", description: "" },
];

function emptyCriterion(order = 0) {
  return {
    name: "",
    description: "",
    sort_order: order,
    level_1_label: "Beginning", level_1_description: "",
    level_2_label: "Developing", level_2_description: "",
    level_3_label: "Proficient", level_3_description: "",
    level_4_label: "Advanced", level_4_description: "",
    level_5_label: "Exemplary", level_5_description: "",
  };
}

function CriterionEditor({ criterion, index, onChange, onRemove, canRemove }) {
  const [expanded, setExpanded] = useState(true);

  const update = (field, value) => {
    onChange(index, { ...criterion, [field]: value });
  };

  return (
    <div className="border border-border-light rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-panel/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="w-4 h-4 text-muted flex-shrink-0" />
        <span className="text-sm font-medium text-text-primary flex-1">
          {criterion.name || `Criterion ${index + 1}`}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            className="p-1 text-muted hover:text-danger transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border-light pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Criterion Name *</label>
                  <input
                    type="text"
                    value={criterion.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="input-field text-sm"
                    placeholder="e.g. Critical Thinking"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                  <input
                    type="text"
                    value={criterion.description || ""}
                    onChange={(e) => update("description", e.target.value)}
                    className="input-field text-sm"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Performance Levels</label>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className="flex items-start gap-2">
                      <div className="flex items-center gap-1.5 min-w-[80px] pt-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          level <= 2 ? "bg-red-100 text-red-600" :
                          level === 3 ? "bg-amber-100 text-amber-600" :
                          "bg-emerald-100 text-emerald-600"
                        }`}>
                          {level}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={criterion[`level_${level}_label`] || ""}
                        onChange={(e) => update(`level_${level}_label`, e.target.value)}
                        className="input-field text-sm flex-shrink-0 w-32"
                        placeholder="Label"
                      />
                      <input
                        type="text"
                        value={criterion[`level_${level}_description`] || ""}
                        onChange={(e) => update(`level_${level}_description`, e.target.value)}
                        className="input-field text-sm flex-1"
                        placeholder={`What does level ${level} look like?`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RubricCard({ rubric, onEdit, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{rubric.name}</h3>
          {rubric.description && (
            <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{rubric.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
          <button
            onClick={() => onEdit(rubric)}
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(rubric.id)}
            className="p-2 text-text-secondary hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {rubric.subject && <span className="badge-blue">{rubric.subject}</span>}
        {rubric.grade_level && <span className="badge-sky">{rubric.grade_level}</span>}
        <span className="badge-green">{rubric.criteria?.length || 0} criteria</span>
      </div>

      {rubric.criteria?.length > 0 && (
        <div className="space-y-1.5">
          {rubric.criteria.slice(0, 4).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
              <span className="text-text-secondary truncate">{c.name}</span>
            </div>
          ))}
          {rubric.criteria.length > 4 && (
            <p className="text-xs text-muted pl-3.5">+{rubric.criteria.length - 4} more</p>
          )}
        </div>
      )}

      <p className="text-xs text-muted mt-3">
        Updated {new Date(rubric.updated_at).toLocaleDateString()}
      </p>
    </motion.div>
  );
}

export default function RubricPage({ user }) {
  const [rubrics, setRubrics] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRubric, setEditingRubric] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [criteria, setCriteria] = useState([emptyCriterion(0)]);
  const { loading, error, execute, setError } = useApi();
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchRubrics = async () => {
    try {
      const data = await execute(`/rubrics?user_id=${user.id}`);
      setRubrics(data);
    } catch {}
  };

  useEffect(() => {
    fetchRubrics();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSubject("");
    setGradeLevel("");
    setCriteria([emptyCriterion(0)]);
    setEditingRubric(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (rubric) => {
    setEditingRubric(rubric);
    setName(rubric.name);
    setDescription(rubric.description || "");
    setSubject(rubric.subject || "");
    setGradeLevel(rubric.grade_level || "");
    setCriteria(
      rubric.criteria.map((c, i) => ({
        name: c.name,
        description: c.description || "",
        sort_order: c.sort_order ?? i,
        level_1_label: c.level_1_label || "Beginning",
        level_1_description: c.level_1_description || "",
        level_2_label: c.level_2_label || "Developing",
        level_2_description: c.level_2_description || "",
        level_3_label: c.level_3_label || "Proficient",
        level_3_description: c.level_3_description || "",
        level_4_label: c.level_4_label || "Advanced",
        level_4_description: c.level_4_description || "",
        level_5_label: c.level_5_label || "Exemplary",
        level_5_description: c.level_5_description || "",
      }))
    );
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await execute(`/rubrics/${id}`, { method: "DELETE" });
      setRubrics((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
    } catch {}
  };

  const handleCriterionChange = (index, updated) => {
    setCriteria((prev) => prev.map((c, i) => (i === index ? updated : c)));
  };

  const handleRemoveCriterion = (index) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCriterion = () => {
    setCriteria((prev) => [...prev, emptyCriterion(prev.length)]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validCriteria = criteria.filter((c) => c.name.trim());
    if (validCriteria.length === 0) {
      setError("Add at least one criterion with a name");
      return;
    }

    const payload = {
      name, description: description || null,
      subject: subject || null, grade_level: gradeLevel || null,
      criteria: validCriteria.map((c, i) => ({ ...c, sort_order: i })),
    };

    try {
      if (editingRubric) {
        await execute(`/rubrics/${editingRubric.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await execute("/rubrics", {
          method: "POST",
          body: JSON.stringify({ ...payload, user_id: user.id }),
        });
      }
      resetForm();
      fetchRubrics();
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Rubric Templates</h1>
            <p className="text-sm text-text-secondary">Create and manage grading rubrics</p>
          </div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Rubric
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingRubric ? "Edit Rubric" : "Create Rubric"}
              </h2>
              <button onClick={resetForm} className="p-2 text-muted hover:text-text-primary rounded-lg hover:bg-panel transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Rubric Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                    placeholder="e.g. Essay Writing Rubric"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input-field"
                    placeholder="e.g. English, Math, Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Grade Level</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Any grade</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field"
                    placeholder="Brief description of this rubric"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    Criteria ({criteria.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Criterion
                  </button>
                </div>

                <div className="space-y-3">
                  {criteria.map((c, i) => (
                    <CriterionEditor
                      key={i}
                      criterion={c}
                      index={i}
                      onChange={handleCriterionChange}
                      onRemove={handleRemoveCriterion}
                      canRemove={criteria.length > 1}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingRubric ? "Update Rubric" : "Save Rubric"}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 shadow-xl max-w-sm mx-4"
            >
              <h3 className="font-semibold text-text-primary mb-2">Delete Rubric?</h3>
              <p className="text-sm text-text-secondary mb-4">
                This will permanently delete this rubric template. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-sm">
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rubric list */}
      {rubrics.length === 0 && !showForm ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-primary/30" />
          </div>
          <h3 className="font-medium text-text-primary mb-1">No Rubrics Yet</h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto mb-4">
            Create your first rubric template to use criterion-based grading in feedback generation.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create First Rubric
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rubrics.map((r) => (
            <RubricCard
              key={r.id}
              rubric={r}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
