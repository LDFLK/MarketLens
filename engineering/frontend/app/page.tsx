"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import Header from "@/components/layout/Header";


const C = {
  indigo: "#6366f1",
  teal: "#0d9488",
};

const GRID_STROKE = "#e4e4e7"; 
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
const IND_SECTORS_STORAGE_KEY = "lmis-industry-sectors";

const toISO = (dt: Date) => dt.toISOString().slice(0, 10);

const DATA_START = new Date(new Date().getFullYear() - 3, 0, 1);
const DATA_END = new Date();

export default function DashboardPage() {
  const defaultTo = toISO(DATA_END);
  const defaultFrom = `${DATA_END.getFullYear()}-01-01`;
  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);

  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DATE_RANGE_STORAGE_KEY);
      if (saved) {
        const { from, to } = JSON.parse(saved);
        const isDate = (v: unknown): v is string =>
          typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
        if (
          isDate(from) &&
          isDate(to) &&
          from <= to &&
          from >= toISO(DATA_START) &&
          to <= toISO(DATA_END)
        ) {
          setFromDate(from);
          setToDate(to);
        }
      }
    } catch {
      // ignore corrupt storage — defaults stay in place
    }
    setRestored(true);
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

  const rangeInvalid = fromDate > toDate;

  const {
    data: overview,
    isLoading,
    isError,
    error,
  } = useDashboardOverview(fromDate, toDate);

  const trendData = useMemo(
    () => overview?.vacancy_trend.data ?? [],
    [overview],
  );
  const granularity = overview?.vacancy_trend.granularity ?? "weekly";
  const totalInRange = overview?.vacancy_total.total_vacancies ?? 0;

  const occData = useMemo(
    () =>
      (overview?.by_occupation.occupations ?? []).map((o) => ({
        name: o.name,
        value: o.open_job_count,
      })),
    [overview],
  );

  const indData = useMemo(
    () =>
      (overview?.by_industry.industries ?? []).map((i) => ({
        name: i.name,
        value: i.open_job_count,
      })),
    [overview],
  );

  useEffect(() => {
    if (!restored || !overview) return;
    try {
      sessionStorage.setItem(
        OCC_GROUPS_STORAGE_KEY,
        JSON.stringify({
          from: fromDate,
          to: toDate,
          groups: overview.by_occupation.occupations,
        }),
      );
      sessionStorage.setItem(
        IND_SECTORS_STORAGE_KEY,
        JSON.stringify({
          from: fromDate,
          to: toDate,
          sectors: overview.by_industry.industries,
        }),
      );
    } catch {}
  }, [restored, fromDate, toDate, overview]);

  const trendSub =
    granularity === "weekly"
      ? "Weekly vacancy counts"
      : "Monthly vacancy counts";

  return (
    <div className="min-h-screen w-full min-w-0 bg-zinc-50 text-zinc-800 font-sans">
      {/* HEADER */}
      <Header
        title="Labour Market Demand Dashboard"
        subtitle="National overview of labour market demand across occupations and industries"
      />

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full max-w-[1400px] mx-auto pb-20">
        {/* DATE RANGE SELECTOR */}
        <div>
          <p className="text-xs text-zinc-400 font-medium">
            Select a date range to view labour market analytics for that period
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
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
                className="bg-transparent text-xs font-bold text-zinc-700 outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer"
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
                className="bg-transparent text-xs font-bold text-zinc-700 outline-none [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          </div>
        </div>

        {rangeInvalid && (
          <div className="bg-zinc-100 border border-zinc-300 text-zinc-700 text-xs font-bold px-4 py-3 rounded-xl">
            The start date must be before the end date.
          </div>
        )}

        {isError && !rangeInvalid && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">
            Failed to load dashboard data
            {error instanceof Error ? `: ${error.message}` : "."}
          </div>
        )}

        {/* ADAPTIVE VACANCY TREND */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[420px] flex flex-col">
          <div className="flex flex-wrap justify-between items-start border-b border-zinc-100 pb-2 gap-2">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">Vacancy Trend</h4>
              <p className="text-[11px] text-zinc-400">{trendSub}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Total vacancies
              </p>
              <p className="text-lg font-black text-zinc-900">
                {isLoading ? "…" : totalInRange.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex-1 mt-4 min-w-0">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                Loading trend data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 15 }}
                >
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={C.indigo}
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="100%"
                        stopColor={C.indigo}
                        stopOpacity={0.01}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: TICK_COLOR }}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    label={{
                      value: "Time Period",
                      position: "insideBottom",
                      offset: -10,
                      fontSize: 11,
                      fill: TICK_COLOR,
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: TICK_COLOR }}
                    label={{
                      value: "No. of Vacancies",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 11,
                      fill: TICK_COLOR,
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="open_job_count"
                    stroke={C.indigo}
                    strokeWidth={2}
                    fill="url(#trendFill)"
                    dot={
                      trendData.length <= 40
                        ? { r: 3, fill: C.indigo, strokeWidth: 0 }
                        : false
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* OCCUPATION CHART */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[540px] flex flex-col">
          <div className="border-b border-zinc-100 pb-2">
            <h4 className="text-sm font-bold text-zinc-900">
              Job Distribution by Occupation (SLSO)
            </h4>
            <p className="text-[11px] text-zinc-400">
              All 10 standard occupations
            </p>
          </div>
          <div className="flex-1 mt-4 min-w-0">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                Loading occupation data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={occData}
                  layout="vertical"
                  margin={{ left: 20, right: 20, bottom: 12 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: TICK_COLOR }}
                    label={{
                      value: "No. of Vacancies",
                      position: "insideBottom",
                      offset: -8,
                      fontSize: 11,
                      fill: TICK_COLOR,
                    }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10, fill: TICK_COLOR }}
                    width={170}
                    tickFormatter={(v: string) => (v.length > 22 ? `${v.substring(0, 22)}...` : v)}
                    label={{
                      value: "Occupation",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 11,
                      fill: TICK_COLOR,
                    }}
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
            )}
          </div>
          <div className="pt-8 flex justify-end">
            <Link
              href={`/occupations?from=${fromDate}&to=${toDate}`}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 transition-colors"
            >
              See More →
            </Link>
          </div>
        </div>

        {/* INDUSTRY CHART */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[640px] flex flex-col">
          <div className="border-b border-zinc-100 pb-2">
            <h4 className="text-sm font-bold text-zinc-900">
              Job Distribution by Industry (SLSIC)
            </h4>
            <p className="text-[11px] text-zinc-400">
              All 21 standard industries 
            </p>
          </div>
          <div className="flex-1 mt-4 pb-10 min-w-0">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                Loading industry data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={indData} margin={{ bottom: 14 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: TICK_COLOR }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tickFormatter={(v: string) =>
                      v.length > 20 ? `${v.substring(0, 20)}...` : v
                    }
                    label={{
                      value: "Industry",
                      position: "insideBottom",
                      offset: -10,
                      fontSize: 11,
                      fill: TICK_COLOR,
                    }}
                  />
                  <YAxis
                    type="number"
                    tick={{ fontSize: 10, fill: TICK_COLOR }}
                    label={{
                      value: "No. of Vacancies",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 11,
                      fill: TICK_COLOR,
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                    cursor={barCursor}
                  />
                  <Bar
                    dataKey="value"
                    fill={C.teal}
                    radius={[4, 4, 0, 0]}
                    barSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="pt-2 flex justify-end">
            <Link
              href={`/industries?from=${fromDate}&to=${toDate}`}
              className="text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline inline-flex items-center gap-1 transition-colors"
            >
              See More →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
