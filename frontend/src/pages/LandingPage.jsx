import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, FileText, Clock, Sparkles, BookOpen, PenTool,
  ArrowRight, CheckCircle2, Star, Users, Shield
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
  }),
};

const features = [
  {
    icon: PenTool,
    title: "Personalized Feedback",
    desc: "Generate tailored student feedback in seconds. Choose tone, type, and grade level for perfectly crafted comments.",
    color: "bg-blue-50 text-primary",
  },
  {
    icon: FileText,
    title: "Document Summarizer",
    desc: "Instantly summarize circulars, reports, and notices. Upload PDFs, DOCX, or paste text directly.",
    color: "bg-sky-50 text-accent",
  },
  {
    icon: Clock,
    title: "Persistent History",
    desc: "All your generated feedback and summaries are saved. Access them anytime, even months later.",
    color: "bg-emerald-50 text-success",
  },
];

const stats = [
  { label: "Feedback Types", value: "6+", icon: Star },
  { label: "Tone Options", value: "5", icon: Sparkles },
  { label: "Doc Formats", value: "3+", icon: FileText },
  { label: "Always Free", value: "100%", icon: Shield },
];

export default function LandingPage({ user }) {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-border-light">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-text-primary">Teacher Toolkit</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard/feedback" className="btn-primary text-sm">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth" className="btn-secondary text-sm">Log In</Link>
                <Link to="/auth" className="btn-primary text-sm">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ y: [-20, 20, -20], rotate: [0, 5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-[10%] w-72 h-72 bg-blue-100/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [20, -20, 20], rotate: [0, -5, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-40 right-[10%] w-96 h-96 bg-sky-100/40 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ y: [-15, 15, -15] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 left-[30%] w-64 h-64 bg-blue-50/60 rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="badge-blue mb-6 inline-flex items-center gap-1.5 text-sm px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Teaching Assistant
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-text-primary leading-tight mb-6"
          >
            Your Smart{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Teaching
            </span>{" "}
            Companion
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Generate personalized student feedback and summarize school documents in seconds.
            Save hours of work with AI that understands education.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/auth" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2 shadow-lg shadow-primary/20">
              Start Writing Feedback
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="btn-secondary text-base px-8 py-3 inline-flex items-center gap-2">
              See How It Works
            </a>
          </motion.div>
        </div>

        {/* Floating icons */}
        <motion.div
          animate={{ y: [-10, 10, -10], rotate: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-36 left-[5%] hidden lg:block"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shadow-sm border border-border-light">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
        </motion.div>
        <motion.div
          animate={{ y: [10, -10, 10], rotate: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-48 right-[5%] hidden lg:block"
        >
          <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center shadow-sm border border-border-light">
            <PenTool className="w-7 h-7 text-accent" />
          </div>
        </motion.div>
        <motion.div
          animate={{ y: [-8, 8, -8] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute bottom-10 right-[15%] hidden lg:block"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-sm border border-border-light">
            <Star className="w-6 h-6 text-success" />
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 bg-panel border-y border-border-light">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-text-primary">{s.value}</div>
              <div className="text-sm text-text-secondary">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Everything You Need
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Powerful tools designed specifically for teachers, powered by advanced AI.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                viewport={{ once: true }}
                className="glass-panel p-8 hover:shadow-md transition-shadow group"
              >
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-3">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-panel">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              How It Works
            </h2>
            <p className="text-text-secondary text-lg">Three simple steps to transform your workflow</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Choose Your Task", desc: "Select feedback generation or document summarization from your dashboard." },
              { step: "02", title: "Provide Details", desc: "Enter student info and context, or upload your document. Choose your preferences." },
              { step: "03", title: "Get Results", desc: "AI generates personalized content instantly. Copy, edit, or save for later." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-text-secondary">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / CTA */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-accent rounded-3xl p-12 text-center text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          </div>
          <div className="relative z-10">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Save Hours Every Week?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Join teachers who are already using AI to write better feedback and understand documents faster.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border-light">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-text-primary">Teacher Toolkit</span>
          </div>
          <p className="text-sm text-muted">
            Built with AI for educators. Open source & free forever.
          </p>
          <div className="flex items-center gap-1 text-sm text-muted">
            <span>Powered by</span>
            <span className="font-medium text-text-secondary">Groq + Llama</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
