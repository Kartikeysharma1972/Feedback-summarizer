export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8002";
export const API_TIMEOUT = 30000;

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
  { value: "lecture", label: "Lecture / Class Recording" },
  { value: "audio_note", label: "Audio Note / Voice Memo" },
  { value: "other", label: "Other" },
];

export const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "ogg", "webm", "flac", "mp4", "mpeg", "mpga"];

export const SUMMARY_LENGTHS = [
  { value: "brief", label: "Brief (2-3 sentences)" },
  { value: "detailed", label: "Detailed" },
  { value: "bullet_points", label: "Bullet Points" },
];

export const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi (हिन्दी)" },
  { value: "tamil", label: "Tamil (தமிழ்)" },
  { value: "telugu", label: "Telugu (తెలుగు)" },
  { value: "kannada", label: "Kannada (ಕನ್ನಡ)" },
  { value: "malayalam", label: "Malayalam (മലയാളം)" },
  { value: "bengali", label: "Bengali (বাংলা)" },
  { value: "marathi", label: "Marathi (मराठी)" },
  { value: "gujarati", label: "Gujarati (ગુજરાતી)" },
  { value: "punjabi", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { value: "urdu", label: "Urdu (اردو)" },
  { value: "spanish", label: "Spanish (Español)" },
  { value: "french", label: "French (Français)" },
  { value: "arabic", label: "Arabic (العربية)" },
];

export const STANDARD_FRAMEWORKS = [
  {
    id: "cbse",
    name: "CBSE Learning Outcomes",
    standards: [
      { code: "CBSE-ENG-R", name: "Reading Comprehension", description: "Reads and comprehends texts across genres" },
      { code: "CBSE-ENG-W", name: "Writing Skills", description: "Writes clearly with proper grammar and structure" },
      { code: "CBSE-MATH-NS", name: "Number Sense", description: "Understands number systems and operations" },
      { code: "CBSE-MATH-PS", name: "Problem Solving", description: "Applies mathematical reasoning to solve problems" },
      { code: "CBSE-SCI-OB", name: "Scientific Observation", description: "Observes, records, and analyzes scientific phenomena" },
      { code: "CBSE-SCI-EX", name: "Experimentation", description: "Designs and conducts experiments systematically" },
      { code: "CBSE-SS-CR", name: "Critical Reasoning", description: "Analyzes social issues with critical thinking" },
      { code: "CBSE-VA-CL", name: "Values & Life Skills", description: "Demonstrates ethical values and life skills" },
    ],
  },
  {
    id: "ccss_ela",
    name: "Common Core — ELA",
    standards: [
      { code: "CCSS.ELA.RL", name: "Reading Literature", description: "Analyze themes, characters, and structure in literary texts" },
      { code: "CCSS.ELA.RI", name: "Reading Informational", description: "Comprehend and evaluate informational texts" },
      { code: "CCSS.ELA.W", name: "Writing", description: "Produce clear, coherent writing for various purposes" },
      { code: "CCSS.ELA.SL", name: "Speaking & Listening", description: "Engage in collaborative discussions effectively" },
      { code: "CCSS.ELA.L", name: "Language", description: "Demonstrate command of grammar, usage, and vocabulary" },
    ],
  },
  {
    id: "ccss_math",
    name: "Common Core — Math",
    standards: [
      { code: "CCSS.MATH.OA", name: "Operations & Algebraic Thinking", description: "Understand and apply arithmetic operations" },
      { code: "CCSS.MATH.G", name: "Geometry", description: "Analyze shapes, spatial reasoning, and geometric properties" },
      { code: "CCSS.MATH.MD", name: "Measurement & Data", description: "Measure, estimate, and interpret data" },
      { code: "CCSS.MATH.NF", name: "Number & Fractions", description: "Understand fractions, decimals, and number relationships" },
      { code: "CCSS.MATH.MP", name: "Mathematical Practices", description: "Apply reasoning, modeling, and problem-solving strategies" },
    ],
  },
  {
    id: "ngss",
    name: "NGSS — Science",
    standards: [
      { code: "NGSS.PS", name: "Physical Science", description: "Understand matter, forces, energy, and interactions" },
      { code: "NGSS.LS", name: "Life Science", description: "Understand ecosystems, organisms, and biological processes" },
      { code: "NGSS.ESS", name: "Earth & Space Science", description: "Understand Earth systems, weather, and space" },
      { code: "NGSS.ETS", name: "Engineering & Technology", description: "Apply engineering design and technological solutions" },
    ],
  },
  {
    id: "21st_century",
    name: "21st Century Skills",
    standards: [
      { code: "21C.CT", name: "Critical Thinking", description: "Analyze, evaluate, and synthesize information" },
      { code: "21C.CR", name: "Creativity & Innovation", description: "Generate original ideas and solutions" },
      { code: "21C.CO", name: "Communication", description: "Express ideas clearly across media and contexts" },
      { code: "21C.CL", name: "Collaboration", description: "Work effectively in diverse teams" },
      { code: "21C.DL", name: "Digital Literacy", description: "Use technology responsibly and effectively" },
      { code: "21C.SM", name: "Self-Management", description: "Set goals, manage time, and take responsibility" },
    ],
  },
];
