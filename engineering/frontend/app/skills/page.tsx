"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  useIndustries,
  useIndustrySkillsAnalytics,
} from "@/hooks/use-industry";
import { SkillDemand } from "@/types/industry";
import Header from "@/components/layout/Header";

const CHART_COLOR = "#10b981";

export default function IndustryPage() {
  const [selectedIndustryId, setSelectedIndustryId] = useState<number | null>(
    null,
  );
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);

  // Data fetching
  const { data: industryList, isLoading: isIndustriesLoading } =
    useIndustries();

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
  } = useIndustrySkillsAnalytics(selectedIndustryId);

  // Derived data
  const top15Skills = analytics?.top15_skills ?? [];
  const allSkills = analytics?.all_skills ?? [];
  const topEmployers = analytics?.top_employers ?? [];

  const activeSkill: SkillDemand | null = useMemo(() => {
    if (!selectedSkillId) return allSkills[0] ?? null;
    return (
      allSkills.find((s) => s.id === selectedSkillId) ?? allSkills[0] ?? null
    );
  }, [allSkills, selectedSkillId]);

  const selectedIndustryName = useMemo(() => {
    return (
      industryList?.industries.find((i) => i.id === selectedIndustryId)?.name ??
      ""
    );
  }, [industryList, selectedIndustryId]);

  const handleIndustryChange = (value: string) => {
    setSelectedIndustryId(value ? Number(value) : null);
    setSelectedSkillId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased">
      {/* HEADER */}
      <Header
        title="Industry Skill Analytics"
        subtitle="Tracking talent demand curves and domain skills across active job segments"
      />

      <div className="p-8 space-y-6">
        {/* INDUSTRY FILTER */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-md w-full">
            <label className="block text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">
              Filter by Core Industry
            </label>
            <select
              value={selectedIndustryId ?? ""}
              onChange={(e) => handleIndustryChange(e.target.value)}
              disabled={isIndustriesLoading}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white cursor-pointer font-medium outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50"
            >
              <option value="">Select an industry to view analytics</option>
              {industryList?.industries.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-400 font-medium font-mono bg-gray-50 px-3 py-1.5 rounded-lg border">
            Sector Matrix: 21 Verticals Available
          </div>
        </div>

        {!selectedIndustryId && (
          <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-16 text-center">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-sm text-gray-400 font-medium">
              Select an industry to view analytics
            </p>
          </div>
        )}

        {selectedIndustryId && isAnalyticsLoading && (
          <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-16 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-400 font-medium">
                Loading analytics...
              </p>
            </div>
          </div>
        )}

        {selectedIndustryId && isAnalyticsError && (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm p-12 text-center">
            <p className="text-sm text-red-500 font-medium">
              Failed to load data.
            </p>
          </div>
        )}

        {/* ANALYTICS CONTENT */}
        {selectedIndustryId && analytics && !isAnalyticsLoading && (
          <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Unique Skills Tracked
                  </p>
                  <h3 className="text-3xl font-black text-zinc-900 mt-1">
                    {analytics.unique_skills_count}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Distinct skills indexed inside selected industry.
                  </p>
                </div>
                <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-lg">
                  💡
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Most Demanding Skill
                  </p>
                  <h3 className="text-xl font-black text-zinc-900 mt-2 truncate max-w-[280px]">
                    {analytics.most_in_demand_skill?.skill ?? "—"}
                  </h3>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    🔥{" "}
                    {(
                      analytics.most_in_demand_skill?.open_job_count ?? 0
                    ).toLocaleString()}{" "}
                    Requisitions Pending
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-lg">
                  📈
                </div>
              </div>
            </div>

            {/* TOP 15 BAR CHART */}
            <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm">
              <div className="mb-4">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                  Top 15 Skills Framework Volume Graph
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  This bar chart represents the highly demanding skills for the
                  selected industry.
                </p>
              </div>
              {top15Skills.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-12">
                  No skills data available.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={top15Skills}
                    margin={{ top: 10, bottom: 25, left: 10, right: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f8f9fa"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="skill"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={65}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [`${value}`, "Active Vacancies"]}
                    />
                    <Bar
                      dataKey="open_job_count"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    >
                      {top15Skills.map((_, i) => (
                        <Cell key={i} fill={CHART_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* MASTER-DETAIL: ALL SKILLS TABLE + EMPLOYERS SIDEBAR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* ALL SKILLS TABLE */}
              <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm lg:col-span-2">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-zinc-900">
                    Complete Industry Skills Breakdown
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    This table view represents all skills for the selected
                    industry.
                  </p>
                </div>
                <div className="overflow-y-auto max-h-[480px] border border-gray-100 rounded-xl shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-gray-200 bg-gray-50/90 backdrop-blur-xs">
                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-400 w-16">
                          No
                        </th>
                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                          Tracked Skill
                        </th>
                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-gray-400 w-44 text-right">
                          Active Vacancies
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSkills.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-12 text-center text-sm text-gray-400"
                          >
                            No skills data available.
                          </td>
                        </tr>
                      ) : (
                        allSkills.map((s, i) => (
                          <tr key={s.id} className="border-b border-gray-50">
                            <td className="py-3.5 px-4 text-xs font-mono text-gray-400">
                              {i + 1}
                            </td>
                            <td className="py-3.5 px-4 text-sm font-semibold text-gray-900">
                              {s.skill}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-sm text-right text-gray-700">
                              {s.open_job_count.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EMPLOYERS SIDEBAR */}
              <div className="bg-white p-6 rounded-xl border border-gray-200/60 shadow-sm sticky top-[100px]">
                <div className="flex flex-col gap-1 mb-4">
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">
                    Top Hiring Employers
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Enterprise institutions with most hirings for the selected
                  industry.
                </p>

                <div className="space-y-3 min-h-[280px]">
                  {topEmployers.length === 0 ? (
                    <div className="text-center py-12 text-xs text-gray-400">
                      No matching hiring records.
                    </div>
                  ) : (
                    topEmployers.map((employer) => (
                      <div
                        key={employer.id}
                        className="p-3.5 border border-gray-100 rounded-xl bg-gray-50/50 flex items-center justify-between shadow-xs"
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="text-sm font-bold text-gray-900 tracking-tight truncate max-w-[160px]">
                            {employer.name}
                          </div>
                        </div>
                        <div className="text-right min-w-[65px]">
                          <div className="text-sm font-black text-blue-600 font-mono">
                            {employer.open_job_count}
                          </div>
                          <div className="text-[9px] uppercase font-black text-gray-400 tracking-tighter">
                            Vacancies
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                  <span>BFF Live Metrics Channel</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
