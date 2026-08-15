"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
} from "recharts";
import {
  useSubMajorGroups,
  useMinorGroups,
  useUnitGroups,
  useOccupationGroups,
  useOccupationAnalysis,
  useOccupationSkills,
} from "@/hooks/use-occupation";
import type { HierarchyNode } from "@/types/occupation";
import Header from "@/components/layout/Header";

const C = {
  indigo: "#6366f1",
  teal: "#0d9488",
  sky: "#0284c7",
  violet: "#8b5cf6",
  amber: "#d97706",
  rose: "#f472b6",
  slate: "#94a3b8",
};
const CATEGORICAL = [
  C.indigo,
  C.teal,
  C.sky,
  C.violet,
  C.amber,
  C.rose,
  C.slate,
];
const SECTOR_COLORS = [C.sky, C.teal, C.indigo, C.amber];
const FORMAL_COLORS = [C.indigo, C.slate];
const GENDER_COLORS = [C.sky, C.rose, C.slate];
const PROVINCE_COLORS = [...CATEGORICAL, "#0e7490", "#b45309"];
const TICK_COLOR = "#71717a";
const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "none",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#fafafa",
};
const tooltipItemStyle = { color: "#fafafa" };
const tooltipLabelStyle = { color: "#a1a1aa", fontWeight: 600 };
const barCursor = { fill: "#f4f4f5" };

const DATE_RANGE_STORAGE_KEY = "lmis-date-range:v2";
const OCC_GROUPS_STORAGE_KEY = "lmis-occupation-groups";

type OccupationLevel =
  | "major-group"
  | "sub-major-group"
  | "minor-group"
  | "unit-group"
  | "occupation-group";
const LEVELS: OccupationLevel[] = [
  "major-group",
  "sub-major-group",
  "minor-group",
  "unit-group",
  "occupation-group",
];
const LEVEL_LABELS: Record<OccupationLevel, string> = {
  "major-group": "Major Group",
  "sub-major-group": "Sub Major Group",
  "minor-group": "Minor Group",
  "unit-group": "Unit Group",
  "occupation-group": "Occupation Group",
};
const MAX_LEVELS = LEVELS.length;

interface PathNode extends HierarchyNode {
  level: OccupationLevel;
}

interface StoredOccGroup {
  id: number;
  name: string;
  open_job_count: number;
}

function readStoredMajorGroups(): StoredOccGroup[] {
  try {
    const raw = sessionStorage.getItem(OCC_GROUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.groups ?? [];
  } catch {
    return [];
  }
}

const toISO = (dt: Date) => dt.toISOString().slice(0, 10);
const DATA_START = new Date(new Date().getFullYear() - 3, 0, 1);
const DATA_END = new Date();

function DataTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; value: number }[];
}) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return (
    <div className="border border-zinc-100 p-5 rounded-xl flex flex-col">
      <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
        {title}
      </h4>
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-100">
        <table className="w-full text-left">
          <thead className="bg-zinc-50">
            <tr className="border-b border-zinc-200">
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 w-10">
                #
              </th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Name
              </th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right">
                Job Count
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-6 text-center text-xs text-zinc-400"
                >
                  No data available.
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={row.name}
                  className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-3 py-2 text-xs font-bold text-zinc-400">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-zinc-800">
                    {row.name}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono font-bold text-zinc-800 text-right">
                    {row.value.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OccupationAnalysis() {
  const searchParams = useSearchParams();

  const defaultFrom = `${DATA_END.getFullYear()}-01-01`;
  const defaultTo = toISO(DATA_END);
  const urlFrom = searchParams.get("from");
  const urlTo = searchParams.get("to");

  const [fromDate, setFromDate] = useState<string>(urlFrom ?? defaultFrom);
  const [toDate, setToDate] = useState<string>(urlTo ?? defaultTo);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!urlFrom && !urlTo) {
      try {
        const saved = sessionStorage.getItem(DATE_RANGE_STORAGE_KEY);
        if (saved) {
          const { from, to } = JSON.parse(saved);
          if (from) setFromDate(from);
          if (to) setToDate(to);
        }
      } catch {}
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(
        DATE_RANGE_STORAGE_KEY,
        JSON.stringify({ from: fromDate, to: toDate }),
      );
    } catch {}
  }, [restored, fromDate, toDate]);

  const [path, setPath] = useState<PathNode[]>([]);
  const [activeTab, setActiveTab] = useState<"analytics" | "skills">(
    "analytics",
  );
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const [majorGroups, setMajorGroups] = useState<StoredOccGroup[]>([]);

  useEffect(() => {
    setMajorGroups(readStoredMajorGroups());
  }, []);

  useEffect(() => {
    if (path.length === 0 && majorGroups.length > 0) {
      const first = majorGroups[0];
      setPath([
        { id: first.id, name: first.name, code: "", level: "major-group" },
      ]);
    }
  }, [path.length, majorGroups]);

  const subMajorGroupsQuery = useSubMajorGroups(path[0]?.id ?? null);
  const minorGroupsQuery = useMinorGroups(path[1]?.id ?? null);
  const unitGroupsQuery = useUnitGroups(path[2]?.id ?? null);
  const occupationGroupsQuery = useOccupationGroups(path[3]?.id ?? null);

  function optionsForLevel(levelIndex: number): HierarchyNode[] {
    switch (levelIndex) {
      case 0:
        return majorGroups.map((g) => ({ id: g.id, name: g.name, code: "" }));
      case 1:
        return subMajorGroupsQuery.data?.sub_major_groups ?? [];
      case 2:
        return minorGroupsQuery.data?.minor_groups ?? [];
      case 3:
        return unitGroupsQuery.data?.unit_groups ?? [];
      case 4:
        return occupationGroupsQuery.data?.occupation_groups ?? [];
      default:
        return [];
    }
  }

  function isLevelLoading(levelIndex: number): boolean {
    switch (levelIndex) {
      case 0:
        return false;
      case 1:
        return subMajorGroupsQuery.isLoading;
      case 2:
        return minorGroupsQuery.isLoading;
      case 3:
        return unitGroupsQuery.isLoading;
      case 4:
        return occupationGroupsQuery.isLoading;
      default:
        return false;
    }
  }

  const handleSelect = (levelIndex: number, idStr: string) => {
    const options = optionsForLevel(levelIndex);
    const node = options.find((o) => String(o.id) === idStr);
    if (!node) return;
    setPath([
      ...path.slice(0, levelIndex),
      { ...node, level: LEVELS[levelIndex] },
    ]);
  };

  const handleAddLevel = () => {
    if (path.length >= MAX_LEVELS) return;
    const children = optionsForLevel(path.length);
    if (children.length === 0) return;
    setPath([...path, { ...children[0], level: LEVELS[path.length] }]);
  };

  const handleRemoveLevel = () => {
    if (path.length <= 1) return;
    setPath(path.slice(0, -1));
  };

  const deepest = path[path.length - 1] ?? null;
  const deepestLevelIndex = path.length - 1;
  const rangeInvalid = fromDate > toDate;
  const isInitializing = path.length === 0 && majorGroups.length === 0;

  const {
    data: analysis,
    isLoading: analysisLoading,
    isError: analysisError,
    error: analysisErrorObj,
  } = useOccupationAnalysis(
    deepest?.level ?? null,
    deepest?.id ?? null,
    fromDate,
    toDate,
  );

  const nodeTotal = analysis?.total_job_count.total_job_count ?? 0;

  const childrenBreakdown = useMemo(() => {
    if (!analysis?.children) return [];
    return analysis.children.children
      .map((c) => ({ name: c.name, value: c.open_job_count }))
      .sort((a, b) => b.value - a.value);
  }, [analysis]);

  const sectorData = useMemo(
    () =>
      (analysis?.employment_sector.employment_sectors ?? []).map((s) => ({
        name: s.sector,
        value: s.open_job_count,
      })),
    [analysis],
  );
  const expData = useMemo(
    () =>
      (analysis?.experience.experiences ?? []).map((e) => ({
        name: e.name,
        value: e.open_job_count,
      })),
    [analysis],
  );
  const eduData = useMemo(
    () =>
      (analysis?.education.education_levels ?? []).map((e) => ({
        name: e.level,
        value: e.open_job_count,
      })),
    [analysis],
  );
  const formalData = useMemo(
    () =>
      (analysis?.formality.formalities ?? []).map((f) => ({
        name: f.formality_type,
        value: f.open_job_count,
      })),
    [analysis],
  );
  const genderData = useMemo(
    () =>
      (analysis?.gender.genders ?? []).map((g) => ({
        name: g.gender_type,
        value: g.open_job_count,
      })),
    [analysis],
  );
  const nvqData = useMemo(
    () =>
      (analysis?.vocational_education.vocational_educations ?? []).map((v) => ({
        name: v.level,
        value: v.open_job_count,
      })),
    [analysis],
  );
  const provinceData = useMemo(
    () =>
      (analysis?.province.provinces ?? []).map((p) => ({
        name: p.province,
        value: p.open_job_count,
      })),
    [analysis],
  );
  const contractData = useMemo(
    () =>
      (analysis?.job_type.job_types ?? []).map((j) => ({
        name: j.type,
        value: j.open_job_count,
      })),
    [analysis],
  );
  const remoteData = useMemo(() => {
    const r = analysis?.remote_onsite.remote_vs_onsite;
    if (!r) return [];
    return [
      { name: "On-Site", value: r.on_site_count },
      { name: "Remote", value: r.remote_count },
    ];
  }, [analysis]);

  function toShareBars(rows: { name: string; value: number }[]) {
    const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;
    return rows.map((r) => ({
      label: r.name,
      share: Math.round((r.value / total) * 100),
    }));
  }
  const remoteShare = useMemo(() => toShareBars(remoteData), [remoteData]);
  const contractShare = useMemo(
    () => toShareBars(contractData),
    [contractData],
  );

  const {
    data: skillsData,
    isLoading: skillsLoading,
    isError: skillsError,
  } = useOccupationSkills(
    deepest?.level ?? null,
    deepest?.id ?? null,
    fromDate,
    toDate,
    activeTab === "skills",
  );

  const topSkills = useMemo(
    () =>
      (skillsData?.top_15_skills.skills ?? []).map((s) => ({
        name: s.skill,
        value: s.open_job_count,
      })),
    [skillsData],
  );
  const allSkills = useMemo(
    () => skillsData?.all_skills.skills ?? [],
    [skillsData],
  );
  const totalSkillMentions = useMemo(
    () => allSkills.reduce((sum, s) => sum + s.open_job_count, 0) || 1,
    [allSkills],
  );
  const topEmployers = useMemo(
    () => skillsData?.top_hiring_employers.employers ?? [],
    [skillsData],
  );

  return (
    <div className="min-h-screen w-full min-w-0 bg-zinc-50 text-zinc-800 font-sans">
      {/* HEADER */}
      <Header
        title="Labour Market Demand Dashboard"
        subtitle="National overview of labour market demand across occupations and industries"
      />

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full max-w-[1400px] mx-auto pb-20">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-2 rounded-xl">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              min={toISO(DATA_START)}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="cursor-pointer bg-transparent text-xs font-bold text-zinc-700 outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
          <span
            className="text-zinc-400 font-black text-sm select-none"
            aria-hidden
          >
            →
          </span>
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-2 rounded-xl">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              To
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={toISO(DATA_END)}
              onChange={(e) => setToDate(e.target.value)}
              className="cursor-pointer bg-transparent text-xs font-bold text-zinc-700 outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>
        </div>

        <div>
          <Link
            href="/"
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Link>
        </div>

        {rangeInvalid && (
          <div className="bg-zinc-100 border border-zinc-300 text-zinc-700 text-xs font-bold px-4 py-3 rounded-xl">
            The start date must be before the end date.
          </div>
        )}

        <div>
          <h2 className="text-base md:text-lg font-black text-zinc-900 tracking-tight">
            Occupation Analysis (SLSO)
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Analyze through the occupation classification hierarchy
          </p>
        </div>

        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 mb-4">
            Classification Hierarchy
          </h4>

          {isInitializing ? (
            <p className="text-xs text-zinc-400">
              Loading occupation groups...
            </p>
          ) : majorGroups.length === 0 ? (
            <p className="text-xs text-amber-600 font-bold">
              No occupation data found — please visit the Dashboard page first
              to load the classification data.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              {path.map((node, levelIndex) => {
                const options = optionsForLevel(levelIndex);
                const loading = isLevelLoading(levelIndex);
                return (
                  <div key={levelIndex} className="flex items-end gap-2">
                    {levelIndex > 0 && (
                      <span
                        className="pb-2.5 text-zinc-300 font-black select-none"
                        aria-hidden
                      >
                        →
                      </span>
                    )}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                        {LEVEL_LABELS[LEVELS[levelIndex]]}
                      </p>
                      <select
                        value={node.id}
                        title={node.name}
                        disabled={loading}
                        onChange={(e) =>
                          handleSelect(levelIndex, e.target.value)
                        }
                        className="cursor-pointer bg-zinc-100 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none border border-transparent focus:border-zinc-300 max-w-[200px] truncate disabled:opacity-50"
                      >
                        {options.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              {path.length < MAX_LEVELS && (
                <button
                  onClick={handleAddLevel}
                  disabled={
                    isLevelLoading(path.length) ||
                    optionsForLevel(path.length).length === 0
                  }
                  aria-label={`Add ${LEVEL_LABELS[LEVELS[path.length]]}`}
                  title={`Add ${LEVEL_LABELS[LEVELS[path.length]]}`}
                  className="cursor-pointer mb-0.5 w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white font-black text-base flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              )}

              {path.length > 1 && (
                <button
                  onClick={handleRemoveLevel}
                  aria-label="Remove last level"
                  title="Remove last level"
                  className="cursor-pointer mb-0.5 w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 font-black text-base flex items-center justify-center transition-colors"
                >
                  −
                </button>
              )}
            </div>
          )}
        </div>

        {deepest && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/70 rounded-t-xl flex flex-wrap justify-between items-end gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                  Analytics for {LEVEL_LABELS[deepest.level]}
                </p>
                <p className="text-base font-black text-zinc-900 truncate">
                  {deepest.name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Vacancies for selection
                </p>
                <p className="text-lg font-black text-zinc-900">
                  {analysisLoading ? "…" : nodeTotal.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="px-5 border-b border-zinc-200 flex gap-6">
              <button
                onClick={() => setActiveTab("analytics")}
                className={`cursor-pointer py-3 text-xs font-bold border-b-2 -mb-px transition-colors ${activeTab === "analytics" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab("skills")}
                className={`cursor-pointer py-3 text-xs font-bold border-b-2 -mb-px transition-colors ${activeTab === "skills" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"}`}
              >
                Skill Analysis
              </button>
            </div>

            {activeTab === "analytics" && (
              <>
                <div className="px-5 py-3 border-b border-zinc-200 flex items-center gap-3">
                  <div className="flex bg-zinc-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode("chart")}
                      className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === "chart" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      Chart View
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === "table" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      Table View
                    </button>
                  </div>
                </div>

                {analysisLoading ? (
                  <div className="p-10 text-center text-xs text-zinc-400">
                    Loading analytics...
                  </div>
                ) : analysisError ? (
                  <div className="p-10 text-center text-xs text-red-500 font-bold">
                    Failed to load analytics
                    {analysisErrorObj instanceof Error
                      ? `: ${analysisErrorObj.message}`
                      : "."}
                  </div>
                ) : viewMode === "chart" ? (
                  <div className="p-4 md:p-5 space-y-6">
                    {childrenBreakdown.length > 0 && (
                      <div className="border border-zinc-100 p-5 rounded-xl flex flex-col">
                        <div className="border-b border-zinc-100 pb-2">
                          <h4 className="text-sm font-bold text-zinc-900">
                            {
                              LEVEL_LABELS[
                                LEVELS[
                                  Math.min(
                                    deepestLevelIndex + 1,
                                    MAX_LEVELS - 1,
                                  )
                                ]
                              ]
                            }{" "}
                            Breakdown
                          </h4>
                          <p className="text-[11px] text-zinc-400">
                            Vacancy count of each{" "}
                            {LEVEL_LABELS[
                              LEVELS[
                                Math.min(deepestLevelIndex + 1, MAX_LEVELS - 1)
                              ]
                            ].toLowerCase()}{" "}
                            under {deepest.name}
                          </p>
                        </div>
                        <div
                          className="mt-4 min-w-0"
                          style={{
                            height: Math.max(
                              childrenBreakdown.length * 44 + 40,
                              160,
                            ),
                          }}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={childrenBreakdown}
                              layout="vertical"
                              margin={{ left: 20, right: 20 }}
                            >
                              <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: TICK_COLOR }}
                              />
                              <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 10, fill: TICK_COLOR }}
                                width={230}
                                tickFormatter={(v: string) =>
                                  v.length > 34 ? `${v.substring(0, 34)}…` : v
                                }
                              />
                              <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={tooltipItemStyle}
                                labelStyle={tooltipLabelStyle}
                                cursor={barCursor}
                              />
                              <Bar
                                dataKey="value"
                                fill={C.indigo}
                                radius={[0, 4, 4, 0]}
                                barSize={18}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                        <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                          Employment Sector
                        </h4>
                        <div className="flex-1 mt-4 min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={sectorData}
                              margin={{
                                top: 10,
                                right: 10,
                                left: -10,
                                bottom: 5,
                              }}
                            >
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: TICK_COLOR }}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: TICK_COLOR }}
                              />
                              <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={tooltipItemStyle}
                                labelStyle={tooltipLabelStyle}
                                cursor={barCursor}
                              />
                              <Bar
                                dataKey="value"
                                radius={[4, 4, 0, 0]}
                                barSize={36}
                              >
                                {sectorData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={
                                      SECTOR_COLORS[i % SECTOR_COLORS.length]
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                        <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                          Experience
                        </h4>
                        <div className="flex-1 mt-4 min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={expData}
                              margin={{
                                top: 10,
                                right: 10,
                                left: -20,
                                bottom: 5,
                              }}
                            >
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: TICK_COLOR }}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: TICK_COLOR }}
                              />
                              <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={tooltipItemStyle}
                                labelStyle={tooltipLabelStyle}
                                cursor={barCursor}
                              />
                              <Bar
                                dataKey="value"
                                fill={C.sky}
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                        <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                          Province
                        </h4>
                        <div className="flex-1 flex items-center justify-center min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={provinceData}
                                cx="50%"
                                cy="45%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {provinceData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={
                                      PROVINCE_COLORS[
                                        i % PROVINCE_COLORS.length
                                      ]
                                    }
                                    stroke="#ffffff"
                                  />
                                ))}
                              </Pie>
                              <Legend
                                verticalAlign="bottom"
                                iconSize={8}
                                iconType="circle"
                                wrapperStyle={{
                                  fontSize: 10,
                                  color: TICK_COLOR,
                                }}
                              />
                              <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={tooltipItemStyle}
                                labelStyle={tooltipLabelStyle}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                        <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                          Education Level
                        </h4>
                        <div className="flex-1 flex items-center justify-center min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={eduData}
                                cx="50%"
                                cy="45%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {eduData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={CATEGORICAL[i % CATEGORICAL.length]}
                                    stroke="#ffffff"
                                  />
                                ))}
                              </Pie>
                              <Legend
                                verticalAlign="bottom"
                                iconSize={8}
                                iconType="circle"
                                wrapperStyle={{
                                  fontSize: 11,
                                  color: TICK_COLOR,
                                }}
                              />
                              <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={tooltipItemStyle}
                                labelStyle={tooltipLabelStyle}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                        <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                          Formal / Informal
                        </h4>
                        <div className="flex-1 flex items-center justify-center min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={formalData}
                                cx="50%"
                                cy="45%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {formalData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={
                                      FORMAL_COLORS[i % FORMAL_COLORS.length]
                                    }
                                    stroke="#ffffff"
                                  />
                                ))}
                              </Pie>
                              <Legend
                                verticalAlign="bottom"
                                iconSize={8}
                                iconType="circle"
                                wrapperStyle={{
                                  fontSize: 11,
                                  color: TICK_COLOR,
                                }}
                              />
                              <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={tooltipItemStyle}
                                labelStyle={tooltipLabelStyle}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                        <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                          Gender
                        </h4>
                        <div className="flex-1 flex items-center justify-center min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={genderData}
                                cx="50%"
                                cy="45%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {genderData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={
                                      GENDER_COLORS[i % GENDER_COLORS.length]
                                    }
                                    stroke="#ffffff"
                                  />
                                ))}
                              </Pie>
                              <Legend
                                verticalAlign="bottom"
                                iconSize={8}
                                iconType="circle"
                                wrapperStyle={{
                                  fontSize: 11,
                                  color: TICK_COLOR,
                                }}
                              />
                              <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={tooltipItemStyle}
                                labelStyle={tooltipLabelStyle}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                      <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                        Vocational Education (NVQ Level)
                      </h4>
                      <div className="flex-1 mt-4 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={nvqData}
                            margin={{
                              top: 10,
                              right: 10,
                              left: -10,
                              bottom: 5,
                            }}
                          >
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: TICK_COLOR }}
                            />
                            <YAxis tick={{ fontSize: 10, fill: TICK_COLOR }} />
                            <Tooltip
                              contentStyle={tooltipStyle}
                              itemStyle={tooltipItemStyle}
                              labelStyle={tooltipLabelStyle}
                              cursor={barCursor}
                            />
                            <Bar
                              dataKey="value"
                              fill={C.violet}
                              radius={[4, 4, 0, 0]}
                              barSize={28}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="border border-zinc-100 p-6 rounded-xl">
                        <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: C.indigo }}
                          />
                          Remote / On-Site
                        </h3>
                        <div className="space-y-4">
                          {remoteShare.map((item, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1 font-medium text-zinc-600">
                                <span>{item.label}</span>
                                <span className="font-mono">{item.share}%</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full transition-all duration-700"
                                  style={{
                                    width: `${item.share}%`,
                                    backgroundColor: C.indigo,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border border-zinc-100 p-6 rounded-xl">
                        <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: C.teal }}
                          />
                          Job Type
                        </h3>
                        <div className="space-y-4">
                          {contractShare.map((jt, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1 font-medium text-zinc-600">
                                <span>{jt.label}</span>
                                <span className="font-mono">{jt.share}%</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full transition-all duration-700"
                                  style={{
                                    width: `${jt.share}%`,
                                    backgroundColor: C.teal,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 md:p-5 grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {childrenBreakdown.length > 0 && (
                      <DataTable
                        title={`${LEVEL_LABELS[LEVELS[Math.min(deepestLevelIndex + 1, MAX_LEVELS - 1)]]} Breakdown`}
                        rows={childrenBreakdown}
                      />
                    )}
                    <DataTable title="Employment Sector" rows={sectorData} />
                    <DataTable title="Experience" rows={expData} />
                    <DataTable
                      title="Province wise Distribution"
                      rows={provinceData}
                    />
                    <DataTable title="Education Level" rows={eduData} />
                    <DataTable
                      title="Formal / Informal Sector"
                      rows={formalData}
                    />
                    <DataTable title="Gender" rows={genderData} />
                    <DataTable
                      title="Vocational Education (NVQ Level)"
                      rows={nvqData}
                    />
                    <DataTable title="Remote / On-Site" rows={remoteData} />
                    <DataTable title="Contract Type" rows={contractData} />
                  </div>
                )}
              </>
            )}

            {activeTab === "skills" && (
              <div className="p-4 md:p-5 space-y-6">
                {skillsLoading ? (
                  <div className="p-10 text-center text-xs text-zinc-400">
                    Loading skills...
                  </div>
                ) : skillsError ? (
                  <div className="p-10 text-center text-xs text-red-500 font-bold">
                    Failed to load skills data.
                  </div>
                ) : (
                  <>
                    <div className="border border-zinc-100 p-5 rounded-xl flex flex-col">
                      <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                        Top 15 Skills in Demand
                      </h4>
                      <div
                        className="mt-4 min-w-0"
                        style={{
                          height: Math.max(topSkills.length * 32 + 40, 200),
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={topSkills}
                            layout="vertical"
                            margin={{ left: 20, right: 20 }}
                          >
                            <XAxis
                              type="number"
                              tick={{ fontSize: 10, fill: TICK_COLOR }}
                            />
                            <YAxis
                              dataKey="name"
                              type="category"
                              tick={{ fontSize: 10, fill: TICK_COLOR }}
                              width={150}
                            />
                            <Tooltip
                              contentStyle={tooltipStyle}
                              itemStyle={tooltipItemStyle}
                              labelStyle={tooltipLabelStyle}
                              cursor={barCursor}
                            />
                            <Bar
                              dataKey="value"
                              fill={C.indigo}
                              radius={[0, 4, 4, 0]}
                              barSize={16}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div className="border border-zinc-100 p-5 rounded-xl">
                        <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 mb-3">
                          All Skills ({allSkills.length} of{" "}
                          {skillsData?.all_skills.total ?? 0})
                        </h4>
                        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-zinc-100">
                          <table className="w-full text-left">
                            <thead className="bg-zinc-50 sticky top-0">
                              <tr className="border-b border-zinc-200">
                                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                                  Skill
                                </th>
                                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right">
                                  Count
                                </th>
                                <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right w-16">
                                  Share
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {allSkills.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={3}
                                    className="px-3 py-6 text-center text-xs text-zinc-400"
                                  >
                                    No skills recorded.
                                  </td>
                                </tr>
                              ) : (
                                allSkills.map((s) => (
                                  <tr
                                    key={s.id}
                                    className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                                  >
                                    <td className="px-3 py-2 text-xs font-bold text-zinc-800">
                                      {s.skill}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-mono font-bold text-zinc-800 text-right">
                                      {s.open_job_count.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-mono text-zinc-400 text-right">
                                      {Math.round(
                                        (s.open_job_count /
                                          totalSkillMentions) *
                                          100,
                                      )}
                                      %
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="border border-zinc-100 p-5 rounded-xl">
                        <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 mb-3">
                          Top Hiring Employers
                        </h4>
                        <div className="space-y-3">
                          {topEmployers.length === 0 ? (
                            <p className="text-xs text-zinc-400 text-center py-6">
                              No employer data available.
                            </p>
                          ) : (
                            topEmployers.map((emp, i) => (
                              <div
                                key={emp.id}
                                className="flex items-center gap-3"
                              >
                                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                  {i + 1}
                                </span>
                                <span className="flex-1 text-xs font-bold text-zinc-800 truncate">
                                  {emp.name}
                                </span>
                                <span className="text-xs font-mono font-bold text-zinc-500 shrink-0">
                                  {emp.open_job_count.toLocaleString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OccupationAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center text-xs text-zinc-400">
          Loading...
        </div>
      }
    >
      <OccupationAnalysis />
    </Suspense>
  );
}
