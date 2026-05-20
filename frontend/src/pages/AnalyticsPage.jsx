import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Users, FileText, PenTool, Star,
  Heart, Activity, Award, ArrowUp, ArrowDown, Minus, Target
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { useApi } from "../hooks/useApi";

const COLORS = ["#10b981", "#ef4444", "#94a3b8", "#f59e0b"];
const CHART_COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#06b6d4"];

function StatCard({ icon: Icon, label, value, subtitle, color, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5"
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${
            trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-muted"
          }`}>
            {trend === "up" ? <ArrowUp className="w-3 h-3" /> :
             trend === "down" ? <ArrowDown className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-text-primary mt-3">{value}</p>
      <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </motion.div>
  );
}

function SentimentBadge({ label }) {
  const styles = {
    positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
    negative: "bg-red-50 text-red-700 border-red-200",
    neutral: "bg-slate-50 text-slate-600 border-slate-200",
    mixed: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[label] || styles.neutral}`}>
      {label?.charAt(0).toUpperCase() + label?.slice(1)}
    </span>
  );
}

function ChartCard({ title, icon: Icon, children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border-light rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-text-primary mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-text-secondary">
          <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage({ user }) {
  const [overview, setOverview] = useState(null);
  const [sentimentDist, setSentimentDist] = useState([]);
  const [ratingDist, setRatingDist] = useState([]);
  const [activity, setActivity] = useState([]);
  const [gradeDist, setGradeDist] = useState([]);
  const [typeDist, setTypeDist] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [standardsCoverage, setStandardsCoverage] = useState([]);
  const { loading, execute } = useApi();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ov, sd, rd, act, gd, td, ts, sc] = await Promise.all([
          execute(`/analytics/overview?user_id=${user.id}`),
          execute(`/analytics/sentiment-distribution?user_id=${user.id}`),
          execute(`/analytics/rating-distribution?user_id=${user.id}`),
          execute(`/analytics/activity-timeline?user_id=${user.id}`),
          execute(`/analytics/grade-distribution?user_id=${user.id}`),
          execute(`/analytics/feedback-type-distribution?user_id=${user.id}`),
          execute(`/analytics/top-students?user_id=${user.id}`),
          execute(`/analytics/standards-coverage?user_id=${user.id}`),
        ]);
        setOverview(ov);
        setSentimentDist(sd);
        setRatingDist(rd);
        setActivity(act);
        setGradeDist(gd);
        setTypeDist(td);
        setTopStudents(ts);
        setStandardsCoverage(sc);
      } catch {}
    };
    fetchAll();
  }, []);

  const sentimentLabel = overview?.avg_sentiment_score >= 0.7 ? "Mostly Positive" :
    overview?.avg_sentiment_score >= 0.4 ? "Balanced" : "Needs Review";

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin" />
        <p className="text-text-secondary text-sm">Loading analytics...</p>
      </div>
    );
  }

  const hasData = overview && overview.total_feedback > 0;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Analytics Dashboard</h1>
            <p className="text-sm text-text-secondary">Insights from your feedback and summarization activity</p>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="glass-panel p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-panel flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-muted/40" />
          </div>
          <h3 className="font-medium text-text-primary mb-1">No data yet</h3>
          <p className="text-sm text-text-secondary">
            Generate some feedback to see analytics here.
          </p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              icon={PenTool}
              label="Total Feedback"
              value={overview?.total_feedback || 0}
              color="bg-blue-50 text-primary"
            />
            <StatCard
              icon={FileText}
              label="Total Summaries"
              value={overview?.total_summaries || 0}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              icon={Star}
              label="Avg Rating"
              value={`${overview?.avg_rating || 0}/5`}
              color="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={Heart}
              label="Sentiment Score"
              value={`${Math.round((overview?.avg_sentiment_score || 0) * 100)}%`}
              subtitle={sentimentLabel}
              color="bg-rose-50 text-rose-600"
            />
            <StatCard
              icon={Users}
              label="Students"
              value={overview?.unique_students || 0}
              color="bg-violet-50 text-violet-600"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            {/* Sentiment Pie Chart */}
            <ChartCard title="Sentiment Distribution" icon={Heart}>
              {sentimentDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={sentimentDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sentimentDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted text-center py-12">No sentiment data yet</p>
              )}
            </ChartCard>

            {/* Rating Radar Chart */}
            <ChartCard title="Average Ratings by Category" icon={Star}>
              {ratingDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={ratingDist} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#e0f2fe" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "#475569" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
                    <Radar name="Avg Rating" dataKey="avg_rating" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted text-center py-12">No rating data yet</p>
              )}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            {/* Activity Timeline */}
            <ChartCard title="Activity Over Time" icon={Activity} className="lg:col-span-2">
              {activity.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={activity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="feedback" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="Feedback" />
                    <Line type="monotone" dataKey="summaries" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Summaries" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted text-center py-12">No activity data yet</p>
              )}
            </ChartCard>
          </div>

          {/* Charts Row 3 */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            {/* Grade Distribution */}
            <ChartCard title="Feedback by Grade Level" icon={Award}>
              {gradeDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gradeDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                    <XAxis dataKey="grade" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Feedback Count" radius={[6, 6, 0, 0]}>
                      {gradeDist.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted text-center py-12">No grade data yet</p>
              )}
            </ChartCard>

            {/* Feedback Type Distribution */}
            <ChartCard title="Feedback by Type" icon={TrendingUp}>
              {typeDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={typeDist}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {typeDist.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted text-center py-12">No type data yet</p>
              )}
            </ChartCard>
          </div>

          {/* Top Students Table */}
          <ChartCard title="Top Students" icon={Users}>
            {topStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left py-2.5 px-3 text-text-secondary font-medium">#</th>
                      <th className="text-left py-2.5 px-3 text-text-secondary font-medium">Student</th>
                      <th className="text-left py-2.5 px-3 text-text-secondary font-medium">Grade</th>
                      <th className="text-center py-2.5 px-3 text-text-secondary font-medium">Feedback Count</th>
                      <th className="text-center py-2.5 px-3 text-text-secondary font-medium">Avg Sentiment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStudents.map((s, i) => (
                      <tr key={i} className="border-b border-border-light/50 hover:bg-panel/50 transition-colors">
                        <td className="py-2.5 px-3 text-muted">{i + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-text-primary">{s.name}</td>
                        <td className="py-2.5 px-3 text-text-secondary">{s.grade}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="badge-blue">{s.feedback_count}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {s.avg_sentiment != null ? (
                            <SentimentBadge label={
                              s.avg_sentiment >= 0.7 ? "positive" :
                              s.avg_sentiment >= 0.4 ? "mixed" : "negative"
                            } />
                          ) : (
                            <span className="text-muted text-xs">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-8">No student data yet</p>
            )}
          </ChartCard>

          {/* Standards Coverage */}
          {standardsCoverage.length > 0 && (
            <ChartCard title="Standards Coverage" icon={Target} className="mt-4">
              <ResponsiveContainer width="100%" height={Math.max(200, standardsCoverage.length * 40)}>
                <BarChart data={standardsCoverage} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    width={160}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Times Used" radius={[0, 6, 6, 0]}>
                    {standardsCoverage.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}
