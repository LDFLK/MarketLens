"use client";

import { useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import {
  useDashboardOverview,
  useOccupationAnalytics,
  useIndustryAnalytics,
  useEmploymentSectorAnalytics,
} from "@/hooks/use-dashboard";
import Header from "@/components/layout/Header";

const currentYearNum = new Date().getFullYear();
const DYNAMIC_YEARS = [
  String(currentYearNum),
  String(currentYearNum - 1),
  String(currentYearNum - 2),
];

const CHART_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#6366f1",
  "#ec4899",
];

export default function DashboardPage() {
  const [activeKpiRow, setActiveKpiRow] = useState<"SLSO" | "SLSIC" | null>(
    null,
  );
  const [activePanel, setActivePanel] = useState<
    "OCCUPATION" | "INDUSTRY" | "SECTOR" | null
  >(null);
  const [selectedOccId, setSelectedOccId] = useState<number | null>(null);
  const [selectedOccName, setSelectedOccName] = useState<string>("");
  const [selectedIndId, setSelectedIndId] = useState<number | null>(null);
  const [selectedIndName, setSelectedIndName] = useState<string>("");
  const [analyticsYear, setAnalyticsYear] = useState(Number(DYNAMIC_YEARS[0]));
  const [selectedEmpSectorId, setSelectedEmpSectorId] = useState<number | null>(
    null,
  );
  const [selectedEmpSectorName, setSelectedEmpSectorName] =
    useState<string>("");

  const { data: overview, isLoading, isError } = useDashboardOverview();
  const { data: occAnalytics, isLoading: occLoading } = useOccupationAnalytics(
    selectedOccId,
    analyticsYear,
  );
  const { data: indAnalytics, isLoading: indLoading } = useIndustryAnalytics(
    selectedIndId,
    analyticsYear,
  );
  const { data: empSectorAnalytics, isLoading: empSectorLoading } =
    useEmploymentSectorAnalytics(selectedEmpSectorId);

  const occupationChartData =
    overview?.by_occupation.occupations.map((o) => ({
      name: o.name,
      count: o.open_job_count,
      id: o.id,
    })) ?? [];

  const industryChartData =
    overview?.by_industry.industries.map((i) => ({
      name: i.name,
      count: i.open_job_count,
      id: i.id,
    })) ?? [];

  const experienceChartData =
    overview?.by_experience.experiences.map((e) => ({
      name: e.name,
      value: e.open_job_count,
    })) ?? [];

  const educationChartData =
    overview?.by_education.education_levels.map((e) => ({
      name: e.level,
      value: e.open_job_count,
    })) ?? [];

  const employmentSectorChartData =
    overview?.by_employment_sector.employment_sectors.map((e) => ({
      id: e.id,
      name: e.sector,
      value: e.open_job_count,
    })) ?? [];

  const formalityChartData =
    overview?.by_formality.formalities.map((f) => ({
      name: f.formality_type,
      value: f.open_job_count,
    })) ?? [];

  const genderChartData =
    overview?.by_gender.genders.map((g) => ({
      name: g.gender_type,
      value: g.open_job_count,
    })) ?? [];

  const vocationEduChartData =
    overview?.by_vocational_education.vocational_educations.map((v) => ({
      name: v.level,
      value: v.open_job_count,
    })) ?? [];

  const remoteCount = overview?.remote_vs_onsite.remote_count ?? 0;
  const onsiteCount = overview?.remote_vs_onsite.on_site_count ?? 0;
  const totalRemote = remoteCount + onsiteCount;
  const remotePct =
    totalRemote > 0 ? Math.round((remoteCount / totalRemote) * 100) : 0;
  const onsitePct =
    totalRemote > 0 ? Math.round((onsiteCount / totalRemote) * 100) : 0;
  const jobTypeData = overview?.by_job_type.job_types ?? [];
  const totalJobTypes = jobTypeData.reduce(
    (sum, jt) => sum + jt.open_job_count,
    0,
  );

  const occTrendData =
    occAnalytics?.yearly_trend?.yearly_trend?.map((t) => ({
      year: String(t.year),
      vacancies: t.open_job_count,
    })) ?? [];

  const occFormalityData =
    occAnalytics?.by_formality.formalities.map((f) => ({
      name: f.formality_type,
      value: f.open_job_count,
    })) ?? [];

  const occGenderData =
    occAnalytics?.by_gender.genders.map((g) => ({
      name: g.gender_type,
      value: g.open_job_count,
    })) ?? [];

  const topJobRoles = occAnalytics?.top_job_roles.top_job_roles ?? [];
  const indTrendData =
    indAnalytics?.yearly_trend?.yearly_trend?.map((t) => ({
      year: String(t.year),
      vacancies: t.open_job_count,
    })) ?? [];
  const indExpData =
    indAnalytics?.by_experience.experiences.map((e) => ({
      label: e.name,
      value: e.open_job_count,
    })) ?? [];
  const indProvinceData =
    indAnalytics?.by_province.provinces.map((p) => ({
      name: p.province,
      value: p.open_job_count,
    })) ?? [];
  const indEduData =
    indAnalytics?.by_education.education_levels.map((e) => ({
      label: e.level,
      value: e.open_job_count,
    })) ?? [];
  const indVocationalEduData =
    indAnalytics?.by_vocational_education.vocational_educations.map((v) => ({
      label: v.level,
      value: v.open_job_count,
    })) ?? [];
  const indEmployers = indAnalytics?.top_employers.employers ?? [];

  const employmentSectorAnalyticsData =
    empSectorAnalytics?.yearly_trend.yearly_trend?.map((y) => ({
      label: String(y.year),
      value: y.open_job_count,
    })) ?? [];

  const handleOpenOccPanel = () => {
    if (!selectedOccId && occupationChartData.length > 0) {
      setSelectedOccId(occupationChartData[0].id);
      setSelectedOccName(occupationChartData[0].name);
    }
    setActivePanel("OCCUPATION");
  };

  const handleOpenIndPanel = () => {
    if (!selectedIndId && industryChartData.length > 0) {
      setSelectedIndId(industryChartData[0].id);
      setSelectedIndName(industryChartData[0].name);
    }
    setActivePanel("INDUSTRY");
  };

  const handleOpenEmpSectorPanel = () => {
    if (!selectedEmpSectorId && employmentSectorChartData.length > 0) {
      setSelectedEmpSectorId(employmentSectorChartData[0].id);
      setSelectedEmpSectorName(employmentSectorChartData[0].name);
    }
    setActivePanel("SECTOR");
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400 font-medium">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );

  if (isError)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-red-500 font-medium">
          Failed to load dashboard. Please try again.
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* HEADER */}
      <Header
        title="Labour Market Demand Dashboard"
        subtitle="National Strategic Overview Driven by SLSCO & SLSIC Registries"
      />

      {/* ROOT SPLIT LAYOUT */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* LEFT: MAIN SCROLLABLE CONTENT */}
        <div
          className={`flex-1 overflow-y-auto transition-all duration-300 ${activePanel ? "xl:mr-0" : ""}`}
        >
          <div className="p-8 space-y-8 max-w-[1200px] mx-auto pb-20">
            {/* TIER 1: KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Current Vacancies
                  </p>
                  <h3 className="text-3xl font-black text-gray-900 mt-2">
                    {overview?.active_jobs.active_job_count.toLocaleString()}
                  </h3>
                </div>
                <div
                  className={`mt-4 flex items-center text-xs font-bold ${overview?.active_jobs.trend === "up" ? "text-emerald-600" : overview?.active_jobs.trend === "down" ? "text-red-500" : "text-gray-400"}`}
                >
                  {overview?.active_jobs.trend === "up"
                    ? "▲"
                    : overview?.active_jobs.trend === "down"
                      ? "▼"
                      : "─"}{" "}
                  {Math.abs(overview?.active_jobs.change_percent ?? 0).toFixed(
                    1,
                  )}
                  % vs last month
                </div>
              </div>

              <div
                onClick={() =>
                  setActiveKpiRow(activeKpiRow === "SLSO" ? null : "SLSO")
                }
                className={`bg-white p-6 rounded-xl transition-all cursor-pointer shadow-sm flex flex-col justify-between ${activeKpiRow === "SLSO" ? "ring-2 ring-blue-500" : ""}`}
              >
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Occupations Framework
                  </p>
                  <h3 className="text-3xl font-black text-gray-900 mt-2">
                    {overview?.by_occupation.count}
                  </h3>
                  <p className="text-[11px] font-semibold text-gray-400 mt-1">
                    Based on SLSCO
                  </p>
                </div>
                <p className="mt-4 text-[11px] text-blue-600 font-medium">
                  {activeKpiRow === "SLSO"
                    ? "Click to collapse"
                    : "Click to view full breakdown"}
                </p>
              </div>

              <div
                onClick={() =>
                  setActiveKpiRow(activeKpiRow === "SLSIC" ? null : "SLSIC")
                }
                className={`bg-white p-6 rounded-xl transition-all cursor-pointer shadow-sm flex flex-col justify-between ${activeKpiRow === "SLSIC" ? "ring-2 ring-emerald-500" : ""}`}
              >
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                    Industries Framework
                  </p>
                  <h3 className="text-3xl font-black text-gray-900 mt-2">
                    {overview?.by_industry.count}
                  </h3>
                  <p className="text-[11px] font-semibold text-gray-400 mt-1">
                    Based on SLSIC
                  </p>
                </div>
                <p className="mt-4 text-[11px] text-emerald-600 font-medium">
                  {activeKpiRow === "SLSIC"
                    ? "Click to collapse"
                    : "Click to view full breakdown"}
                </p>
              </div>
            </div>

            {/* EXPANDABLE MATRIX */}
            {activeKpiRow && (
              <div className="bg-white p-6 rounded-xl shadow-inner">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 font-mono">
                  Registered Framework Classifications Matrix ({activeKpiRow})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(activeKpiRow === "SLSO"
                    ? occupationChartData
                    : industryChartData
                  ).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 rounded-lg bg-gray-50 text-xs"
                    >
                      <span className="font-semibold text-gray-700 truncate mr-2">
                        {item.name}
                      </span>
                      <span className="font-mono font-bold bg-white px-2.5 py-1 rounded text-gray-600">
                        {item.count} open
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OCCUPATION CHART */}
            <div className="bg-white p-5 rounded-xl shadow-sm h-[520px] flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-800">
                    Current Job Distribution by Occupation (SLSCO)
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Horizontal mapping showing all 10 standard occupation bands
                  </p>
                </div>
                <button
                  onClick={handleOpenOccPanel}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activePanel === "OCCUPATION" ? "bg-blue-600 text-white" : "text-blue-600 bg-blue-50 hover:bg-blue-100"}`}
                >
                  See Analytics
                </button>
              </div>
              <div className="flex-1 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={occupationChartData}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) =>
                        v.length > 50 ? `${v.substring(0, 50)}...` : v
                      }
                      width={160}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#2563eb"
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* INDUSTRY CHART */}
            <div className="bg-white p-5 rounded-xl shadow-sm h-[620px] flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-800">
                    Current Job Distribution by Industry (SLSIC)
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Vertical bar chart projection featuring rotated X-axis
                    headers for all 21 divisions
                  </p>
                </div>
                <button
                  onClick={handleOpenIndPanel}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activePanel === "INDUSTRY" ? "bg-emerald-600 text-white" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"}`}
                >
                  See Analytics
                </button>
              </div>
              <div className="flex-1 mt-4 pb-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={industryChartData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tickFormatter={(v) =>
                        v.length > 20 ? `${v.substring(0, 20)}...` : v
                      }
                    />
                    <YAxis type="number" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* EMPLOYMENT SECTOR CHART */}
            <div className="bg-white p-5 rounded-xl shadow-sm h-[440px] flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-800">
                    Current Job Distribution by Employment Sector
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Government, Semi-Government, Private and NGO share of
                    current vacancies
                  </p>
                </div>
                <button
                  onClick={handleOpenEmpSectorPanel}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activePanel === "SECTOR" ? "bg-indigo-600 text-white" : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"}`}
                >
                  See Analytics
                </button>
              </div>
              <div className="flex-1 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={employmentSectorChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
                      {employmentSectorChartData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* EXPERIENCE & EDUCATION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm h-[400px] flex flex-col">
                <h4 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-2">
                  Current Job Distribution by Experience
                </h4>
                <div className="flex-1 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={experienceChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) =>
                          v.length > 6 ? `${v.substring(0, 6)}...` : v
                        }
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm h-[400px] flex flex-col">
                <h4 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-2">
                  Current Job Distribution by Education Level
                </h4>
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={educationChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {educationChartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* FORMAL/INFORMAL & GENDER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm h-[380px] flex flex-col">
                <h4 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-2">
                  Current Job Distribution by Formal / Informal
                </h4>
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formalityChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {formalityChartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm h-[380px] flex flex-col">
                <h4 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-2">
                  Current Job Distribution by Gender
                </h4>
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {genderChartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* VOCATIONAL EDUCATION (NVQ) */}
            <div className="bg-white p-5 rounded-xl shadow-sm h-[380px] flex flex-col">
              <h4 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-2">
                Current Job Distribution by Vocational Education (NVQ Level)
              </h4>
              <div className="flex-1 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={vocationEduChartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) =>
                        v.length > 22 ? `${v.substring(0, 22)}...` : v
                      }
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      barSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* REMOTE & JOB TYPE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Remote / On-Site
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "On-Site", share: onsitePct },
                    { label: "Remote", share: remotePct },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1 font-medium text-gray-600">
                        <span>{item.label}</span>
                        <span className="font-mono">{item.share}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-1000"
                          style={{ width: `${item.share}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Contract Type Share
                </h3>
                <div className="space-y-4">
                  {jobTypeData.map((jt, i) => {
                    const pct =
                      totalJobTypes > 0
                        ? Math.round((jt.open_job_count / totalJobTypes) * 100)
                        : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1 font-medium text-gray-600">
                          <span>{jt.type}</span>
                          <span className="font-mono">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 transition-all duration-1000"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: ANALYTICS PANEL */}
        {activePanel && (
          <div className="w-[480px] min-w-[480px] border-l border-gray-200 bg-white flex flex-col overflow-hidden shadow-lg">
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-white shrink-0">
              <div>
                <h2 className="text-sm font-black text-gray-900">
                  {activePanel === "OCCUPATION"
                    ? "Occupation Analytics"
                    : activePanel === "INDUSTRY"
                      ? "Industry Analytics"
                      : "Employment Sector Analytics"}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {activePanel === "OCCUPATION"
                    ? "Past year analytics categorized by specific market occupations"
                    : activePanel === "INDUSTRY"
                      ? "Past year analytics categorized by specific market industries"
                      : "Yearly vacancy trend for each employment sector"}
                </p>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="ml-4 shrink-0 text-xs font-bold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all"
              >
                Close ✕
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* OCCUPATION PANEL CONTENT */}
              {activePanel === "OCCUPATION" && (
                <>
                  {/* Occupation selector */}
                  <div className="flex flex-wrap gap-2">
                    {occupationChartData.map((occ) => (
                      <button
                        key={occ.id}
                        onClick={() => {
                          setSelectedOccId(occ.id);
                          setSelectedOccName(occ.name);
                        }}
                        className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all border ${selectedOccId === occ.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"}`}
                      >
                        {occ.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                    {DYNAMIC_YEARS.map((year) => (
                      <button
                        key={year}
                        onClick={() => setAnalyticsYear(Number(year))}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${analyticsYear === Number(year) ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>

                  {occLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Trend chart */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          "Variation Over Past Years (Historical Demand Trend)"
                        </h4>
                        <div className="h-40">
                          <ResponsiveContainer>
                            <LineChart data={occTrendData}>
                              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Line
                                type="monotone"
                                dataKey="vacancies"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Formality */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          Formal / Informal Job Count
                        </h4>
                        <div className="h-36">
                          <ResponsiveContainer>
                            <BarChart
                              data={occFormalityData}
                              margin={{ left: -20 }}
                            >
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Bar
                                dataKey="value"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                              >
                                {occFormalityData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gender */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          Gender Wise Job Count
                        </h4>
                        <div className="h-40">
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={occGenderData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={55}
                                paddingAngle={2}
                              >
                                {occGenderData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={
                                      CHART_COLORS[
                                        (i + 2) % CHART_COLORS.length
                                      ]
                                    }
                                  />
                                ))}
                              </Pie>
                              <Legend
                                iconSize={8}
                                iconType="circle"
                                wrapperStyle={{ fontSize: 10 }}
                              />
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Top job roles */}
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          "Current Demanding Jobs for"{" "}
                          <span className="text-blue-600">
                            {selectedOccName}
                          </span>
                        </h4>
                        <div className="space-y-2">
                          {topJobRoles.map((role, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-gray-300 font-mono w-4">
                                  {i + 1}
                                </span>
                                <span className="text-xs font-bold text-gray-800">
                                  {role.name}
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                {role.open_job_count} open
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* INDUSTRY PANEL CONTENT */}
              {activePanel === "INDUSTRY" && (
                <>
                  {/* Industry selector + year tabs */}
                  <div className="space-y-3">
                    <select
                      value={selectedIndId ?? ""}
                      onChange={(e) => {
                        const found = industryChartData.find(
                          (i) => i.id === Number(e.target.value),
                        );
                        if (found) {
                          setSelectedIndId(found.id);
                          setSelectedIndName(found.name);
                        }
                      }}
                      className="w-full bg-gray-50 rounded-xl p-2.5 text-xs font-bold border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      {industryChartData.map((ind) => (
                        <option key={ind.id} value={ind.id}>
                          {ind.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                      {DYNAMIC_YEARS.map((year) => (
                        <button
                          key={year}
                          onClick={() => setAnalyticsYear(Number(year))}
                          className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${analyticsYear === Number(year) ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </div>

                  {indLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Sector trend */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          "Sector Variant Level Across Years"
                        </h4>
                        <div className="h-36">
                          <ResponsiveContainer>
                            <LineChart data={indTrendData}>
                              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Line
                                type="monotone"
                                dataKey="vacancies"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Experience allocation */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          "Experience Allocation Distribution"
                        </h4>
                        <div className="h-36">
                          <ResponsiveContainer>
                            <BarChart data={indExpData} margin={{ left: -20 }}>
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 9 }}
                                tickFormatter={(v) =>
                                  v.length > 6 ? `${v.substring(0, 6)}...` : v
                                }
                              />
                              <YAxis tick={{ fontSize: 9 }} />
                              <Tooltip />
                              <Bar
                                dataKey="value"
                                fill="#3b82f6"
                                radius={[3, 3, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Province share */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          "Regional Province Share Allocation"
                        </h4>
                        <div className="h-44">
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={indProvinceData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={55}
                                paddingAngle={2}
                              >
                                {indProvinceData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Legend
                                iconSize={8}
                                iconType="circle"
                                wrapperStyle={{ fontSize: 10 }}
                              />
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Education */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          Minimum Educational Level Threshold
                        </h4>
                        <div className="h-36">
                          <ResponsiveContainer>
                            <BarChart data={indEduData} margin={{ left: -20 }}>
                              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} />
                              <Tooltip />
                              <Bar
                                dataKey="value"
                                fill="#f59e0b"
                                radius={[3, 3, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Vocational Education */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          Vocational Education Wise Job Count (NVQ)
                        </h4>
                        <div className="h-36">
                          <ResponsiveContainer>
                            <BarChart
                              data={indVocationalEduData}
                              margin={{ left: -20 }}
                            >
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 9 }}
                                tickFormatter={(v) =>
                                  v.length > 6 ? `${v.substring(0, 6)}...` : v
                                }
                              />
                              <YAxis tick={{ fontSize: 9 }} />
                              <Tooltip />
                              <Bar
                                dataKey="value"
                                fill="#8b5cf6"
                                radius={[3, 3, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Top employers */}
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                          Top hiring employers for this industry
                        </h4>
                        <div className="space-y-2">
                          {indEmployers.map((emp, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-xl border border-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-gray-300 font-mono w-4">
                                  {i + 1}
                                </span>
                                <span className="text-xs font-semibold text-gray-800 truncate max-w-[240px]">
                                  {emp.name}
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                                {emp.open_job_count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* EMPLOYMENT SECTOR PANEL CONTENT */}
              {activePanel === "SECTOR" && (
                <>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                      Select Employment Sector
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {employmentSectorChartData.map((sec) => (
                        <button
                          key={sec.id}
                          onClick={() => {
                            setSelectedEmpSectorId(sec.id);
                            setSelectedEmpSectorName(sec.name);
                          }}
                          className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all border ${selectedEmpSectorName === sec.name ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}
                        >
                          {sec.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {empSectorLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">
                        Yearly Trend for Selected Sector —{" "}
                        <span className="text-indigo-600">
                          {selectedEmpSectorName}
                        </span>
                      </h4>
                      <div className="h-44">
                        <ResponsiveContainer>
                          <LineChart data={employmentSectorAnalyticsData}>
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#6366f1"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
