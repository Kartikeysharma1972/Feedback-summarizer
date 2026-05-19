export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8002";

export const FEEDBACK_TYPES = [
  { value: "academic_performance", label: "Academic Performance" },
  { value: "concept_clarity", label: "Concept Clarity & Problem Solving" },
  { value: "communication_skill", label: "Communication Skill" },
  { value: "homework_completion", label: "Homework Completion" },
  { value: "discipline", label: "Discipline" },
  { value: "creativity", label: "Creativity" },
  { value: "examination_performance", label: "Examination Performance" },
  { value: "learning_progress", label: "Learning Progress" },
  { value: "behavior", label: "Behavior & Conduct" },
  { value: "participation", label: "Class Participation" },
  { value: "social_skills", label: "Social Skills" },
  { value: "overall_progress", label: "Overall Progress" },
];

export const TONES = [
  { value: "encouraging", label: "Encouraging & Constructive" },
  { value: "formal", label: "Formal" },
  { value: "warm", label: "Warm & Friendly" },
  { value: "direct", label: "Direct" },
  { value: "warning", label: "Warning" },
];

export const GRADE_LEVELS = [
  "Pre-K", "Kindergarten",
  "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade",
  "6th Grade", "7th Grade", "8th Grade",
  "9th Grade", "10th Grade", "11th Grade", "12th Grade",
];

export const DOCUMENT_TYPES = [
  { value: "circular", label: "Circular" },
  { value: "report", label: "Report" },
  { value: "notice", label: "Notice" },
  { value: "newsletter", label: "Newsletter" },
  { value: "policy", label: "Policy Document" },
  { value: "meeting_minutes", label: "Meeting Minutes" },
  { value: "other", label: "Other" },
];

export const SUMMARY_LENGTHS = [
  { value: "brief", label: "Brief (2-3 sentences)" },
  { value: "detailed", label: "Detailed" },
  { value: "bullet_points", label: "Bullet Points" },
];
