"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    title: "Labour Market Demand Dashboard",
    subtitle: "Select a date range to view labour market analytics for that period",
    dateFrom: "From",
    dateTo: "To",
    trendTitle: "Vacancy Trend for Selected Period",
    trendSubDaily: "Day-by-day vacancy counts",
    trendSubMonthly: "Monthly vacancy counts",
    totalInRange: "Total vacancies in range",
    invalidRange: "The start date must be before the end date.",
    occChartTitle: "Job Distribution by Occupation (SLSO)",
    occChartSub: "All 10 standard occupation bands for the selected period",
    indChartTitle: "Job Distribution by Industry (SLSIC)",
    indChartSub: "All 21 divisions for the selected period",
    sectorChartTitle: "Job Distribution by Employment Sector",
    sectorChartSub: "Government, Semi-Government, Private and NGO share",
    expChartTitle: "Job Distribution by Experience",
    eduChartTitle: "Job Distribution by Education Level",
    formalChartTitle: "Job Distribution by Formal / Informal Sector",
    genderChartTitle: "Job Distribution by Gender",
    vocationalChartTitle: "Job Distribution by Vocational Education (NVQ Level)",
    remoteTitle: "Remote / On-Site Configuration",
    contractTitle: "Contract Type Share",
    seeMore: "See More →",
  },
  si: {
    title: "ශ්‍රම වෙළඳපල ඉල්ලුම උපකරණ පුවරුව",
    subtitle: "එම කාලය සඳහා ශ්‍රම වෙළඳපල විශ්ලේෂණ බැලීමට දින පරාසයක් තෝරන්න",
    dateFrom: "සිට",
    dateTo: "දක්වා",
    trendTitle: "තෝරාගත් කාලය සඳහා පුරප්පාඩු ප්‍රවණතාව",
    trendSubDaily: "දිනෙන් දින පුරප්පාඩු ගණන",
    trendSubMonthly: "මාසික පුරප්පාඩු ගණන",
    totalInRange: "පරාසය තුළ මුළු පුරප්පාඩු",
    invalidRange: "ආරම්භක දිනය අවසාන දිනයට පෙර විය යුතුය.",
    occChartTitle: "වෘත්තිය අනුව රැකියා ව්‍යාප්තිය (SLSO)",
    occChartSub: "තෝරාගත් කාලය සඳහා ප්‍රමිතිගත වෘත්තීය කාණ්ඩ 10ම",
    indChartTitle: "කර්මාන්තය අනුව රැකියා ව්‍යාප්තිය (SLSIC)",
    indChartSub: "තෝරාගත් කාලය සඳහා අංශ 21ම",
    sectorChartTitle: "රැකියා අංශය අනුව රැකියා ව්‍යාප්තිය",
    sectorChartSub: "රජය, අර්ධ රාජ්‍ය, පුද්ගලික සහ රාජ්‍ය නොවන සංවිධාන කොටස",
    expChartTitle: "අත්දැකීම් අනුව රැකියා ව්‍යාප්තිය",
    eduChartTitle: "අධ්‍යාපන මට්ටම අනුව රැකියා ව්‍යාප්තිය",
    formalChartTitle: "විධිමත් / අවිධිමත් අංශය අනුව රැකියා ව්‍යාප්තිය",
    genderChartTitle: "ස්ත්‍රී පුරුෂ භාවය අනුව රැකියා ව්‍යාප්තිය",
    vocationalChartTitle: "වෘත්තීය අධ්‍යාපනය අනුව රැකියා ව්‍යාප්තිය (NVQ මට්ටම)",
    remoteTitle: "දුරස්ථ / සේවා ස්ථානගත වින්‍යාසය",
    contractTitle: "කොන්ත්‍රාත්තු වර්ගයේ කොටස",
    seeMore: "තව බලන්න →",
  },
  ta: {
    title: "தொழில் சந்தை தேவை தகவல் பலகை",
    subtitle: "அந்தக் காலத்திற்கான தொழில் சந்தை பகுப்பாய்வுகளைக் காண ஒரு தேதி வரம்பைத் தேர்ந்தெடுக்கவும்",
    dateFrom: "தொடக்கம்",
    dateTo: "முடிவு",
    trendTitle: "தேர்ந்தெடுக்கப்பட்ட காலத்திற்கான காலியிடப் போக்கு",
    trendSubDaily: "நாள்தோறும் காலியிட எண்ணிக்கை",
    trendSubMonthly: "மாதாந்திர காலியிட எண்ணிக்கை",
    totalInRange: "வரம்பில் மொத்த காலியிடங்கள்",
    invalidRange: "தொடக்க தேதி முடிவு தேதிக்கு முன் இருக்க வேண்டும்.",
    occChartTitle: "தொழில் வாரியான வேலை விநியோகம் (SLSO)",
    occChartSub: "தேர்ந்தெடுக்கப்பட்ட காலத்திற்கான 10 நிலையான தொழில் குழுக்கள்",
    indChartTitle: "தொழில்துறை வாரியான வேலை விநியோகம் (SLSIC)",
    indChartSub: "தேர்ந்தெடுக்கப்பட்ட காலத்திற்கான 21 பிரிவுகள்",
    sectorChartTitle: "வேலைவாய்ப்பு துறை வாரியான வேலை விநியோகம்",
    sectorChartSub: "அரசு, அரை அரசு, தனியார் மற்றும் அரசு சாரா பங்கு",
    expChartTitle: "அனுபவ வாரியான வேலை விநியோகம்",
    eduChartTitle: "கல்வித் தகுதி வாரியான வேலை விநியோகம்",
    formalChartTitle: "முறைசார் / முறைசாரா துறை வாரியான வேலை விநியோகம்",
    genderChartTitle: "பாலினம் வாரியான வேலை விநியோகம்",
    vocationalChartTitle: "தொழில் சார் கல்வி வாரியான வேலை விநியோகம் (NVQ நிலை)",
    remoteTitle: "தொலைதூர / தள வேலை கட்டமைப்பு",
    contractTitle: "ஒப்பந்த வகை பங்கீடு",
  },
};

// ─────────────────────────────────────────────────────────────
// COLOR SYSTEM
// Chrome (cards, borders, text) stays neutral zinc to match the
// sidebar. Data gets a muted, desaturated palette — enough hue
// to distinguish series, low enough saturation to stay calm.
// ─────────────────────────────────────────────────────────────
const C = {
  indigo: "#6366f1", // primary — trend, occupation
  teal: "#0d9488", // industry
  sky: "#0284c7", // experience
  violet: "#8b5cf6", // NVQ
  amber: "#d97706", // muted amber accent
  rose: "#f472b6", // soft rose
  slate: "#94a3b8", // neutral fallback
};

// Categorical palette for pies / multi-color bars (ordered for
// adjacent-contrast, all muted tones)
const CATEGORICAL = [C.indigo, C.teal, C.sky, C.violet, C.amber, C.rose, C.slate];

// Fixed semantic assignments where categories have meaning
const SECTOR_COLORS = [C.sky, C.teal, C.indigo, C.amber]; // Gov, Semi-Gov, Private, NGO
const FORMAL_COLORS = [C.indigo, C.slate]; // Formal, Informal
const GENDER_COLORS = [C.sky, C.rose, C.slate]; // Male, Female, Not Specified

const GRID_STROKE = "#e4e4e7"; // zinc-200
const TICK_COLOR = "#71717a"; // zinc-500

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

// Shared session key: the analysis pages write to the same key so
// the selected range stays consistent across all pages.
const DATE_RANGE_STORAGE_KEY = "lmis-date-range";

// ─────────────────────────────────────────────────────────────
// MOCK DATA ENGINE
// A seeded daily dataset spanning ~3.5 years. Every chart is an
// aggregation over the filtered days, so the whole page reacts
// to the selected date range.
// ─────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const toISO = (dt: Date) => dt.toISOString().slice(0, 10);

interface DayRecord {
  iso: string;
  date: Date;
  total: number;
  t: number;
}

const DATA_START = new Date(new Date().getFullYear() - 3, 0, 1);
const DATA_END = new Date();

const ALL_DAYS: DayRecord[] = (() => {
  const rand = mulberry32(20260810);
  const days: DayRecord[] = [];
  const cursor = new Date(DATA_START);
  let i = 0;
  while (cursor <= DATA_END) {
    const t = i / 365;
    const growth = 1 + t * 0.18;
    const weekday = cursor.getDay();
    const weekly = weekday === 0 || weekday === 6 ? 0.55 : 1;
    const seasonal = 1 + 0.12 * Math.sin((2 * Math.PI * (cursor.getMonth() + 1)) / 12);
    const noise = 0.85 + rand() * 0.3;
    const total = Math.round(320 * growth * weekly * seasonal * noise);
    days.push({ iso: toISO(cursor), date: new Date(cursor), total, t });
    cursor.setDate(cursor.getDate() + 1);
    i++;
  }
  return days;
})();

interface Dim {
  name: string;
  base: number;
  drift: number;
}

const DIM_OCCUPATION: Dim[] = [
  { name: "1. Managers", base: 10, drift: 0.02 },
  { name: "2. Professionals", base: 27, drift: 0.06 },
  { name: "3. Technicians & Associate Professionals", base: 17, drift: 0.03 },
  { name: "4. Clerical Support Workers", base: 8, drift: -0.04 },
  { name: "5. Service and Sales Workers", base: 15, drift: 0.01 },
  { name: "6. Skilled Agricultural, Forestry & Fishery Workers", base: 3.5, drift: -0.02 },
  { name: "7. Craft and Related Trades Workers", base: 9, drift: -0.01 },
  { name: "8. Plant & Machine Operators & Assemblers", base: 5.5, drift: -0.02 },
  { name: "9. Elementary Occupations", base: 3.5, drift: -0.03 },
  { name: "10. Armed Forces Occupations", base: 1.5, drift: 0 },
];

const DIM_INDUSTRY: Dim[] = [
  { name: "A - Agriculture", base: 3.4, drift: -0.02 },
  { name: "B - Mining & Quarrying", base: 0.9, drift: 0 },
  { name: "C - Manufacturing", base: 19.5, drift: -0.01 },
  { name: "D - Electricity & Gas", base: 1.5, drift: 0 },
  { name: "E - Water & Waste Mgmt", base: 1.1, drift: 0 },
  { name: "F - Construction", base: 5.4, drift: 0.02 },
  { name: "G - Wholesale & Retail", base: 9.2, drift: 0.01 },
  { name: "H - Transport & Storage", base: 4.3, drift: 0.01 },
  { name: "I - Accommodation & Food", base: 7.8, drift: 0.05 },
  { name: "J - Info & Tech Comms", base: 24.8, drift: 0.07 },
  { name: "K - Finance & Insurance", base: 11.3, drift: 0.02 },
  { name: "L - Real Estate", base: 1.4, drift: 0 },
  { name: "M - Professional & Sci", base: 3.9, drift: 0.02 },
  { name: "N - Admin & Support", base: 2.5, drift: 0 },
  { name: "O - Public Admin", base: 1.8, drift: -0.01 },
  { name: "P - Education", base: 3.0, drift: 0.01 },
  { name: "Q - Health & Social Work", base: 2.3, drift: 0.02 },
  { name: "R - Arts, Ent & Rec", base: 1.2, drift: 0 },
  { name: "S - Other Services", base: 1.0, drift: 0 },
  { name: "T - Private Households", base: 0.6, drift: -0.01 },
  { name: "U - Extraterritorial Org", base: 0.4, drift: 0 },
];

const DIM_SECTOR: Dim[] = [
  { name: "Government", base: 19.7, drift: -0.02 },
  { name: "Semi Government", base: 9.5, drift: -0.01 },
  { name: "Private", base: 65.2, drift: 0.03 },
  { name: "NGO", base: 5.6, drift: 0.01 },
];

const DIM_EXPERIENCE: Dim[] = [
  { name: "Entry Level", base: 21, drift: 0.02 },
  { name: "Junior", base: 40.5, drift: 0.01 },
  { name: "Mid-Level", base: 26.2, drift: 0 },
  { name: "Senior", base: 12.3, drift: 0.01 },
];

const DIM_EDUCATION: Dim[] = [
  { name: "Degree", base: 41.8, drift: 0.04 },
  { name: "A/L", base: 24.9, drift: -0.01 },
  { name: "O/L", base: 14.5, drift: -0.02 },
  { name: "Below O/L", base: 5.2, drift: -0.02 },
  { name: "Not Specified", base: 13.6, drift: 0 },
];

const DIM_FORMAL: Dim[] = [
  { name: "Formal", base: 78.7, drift: 0.02 },
  { name: "Informal", base: 21.3, drift: -0.02 },
];

const DIM_GENDER: Dim[] = [
  { name: "Male", base: 57, drift: -0.02 },
  { name: "Female", base: 39.8, drift: 0.02 },
  { name: "Not Specified", base: 3.2, drift: 0 },
];

const DIM_NVQ: Dim[] = [
  { name: "NVQ 1", base: 9.8, drift: -0.02 },
  { name: "NVQ 2", base: 14.3, drift: -0.01 },
  { name: "NVQ 3", base: 20.9, drift: 0.01 },
  { name: "NVQ 4", base: 26.3, drift: 0.03 },
  { name: "NVQ 5", base: 17.8, drift: 0.02 },
  { name: "NVQ 6", base: 7.3, drift: 0.01 },
  { name: "NVQ 7", base: 3.6, drift: 0.01 },
];

const DIM_REMOTE: Dim[] = [
  { name: "On-Site", base: 81, drift: -0.03 },
  { name: "Remote", base: 19, drift: 0.03 },
];

const DIM_CONTRACT: Dim[] = [
  { name: "Full-Time", base: 72, drift: 0.01 },
  { name: "Part-Time", base: 14, drift: 0.01 },
  { name: "Contract", base: 9, drift: 0.02 },
  { name: "Internship", base: 5, drift: 0 },
];

function splitByDim(days: DayRecord[], dims: Dim[]): { name: string; value: number }[] {
  const totals = dims.map(() => 0);
  for (const day of days) {
    const weights = dims.map((dm) => Math.max(dm.base * (1 + dm.drift * day.t), 0.1));
    const wSum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < dims.length; i++) {
      totals[i] += (day.total * weights[i]) / wSum;
    }
  }
  return dims.map((dm, i) => ({ name: dm.name, value: Math.round(totals[i]) }));
}

// ─────────────────────────────────────────────────────────────
// TIME SERIES BUCKETING (adaptive granularity: daily / monthly)
// ─────────────────────────────────────────────────────────────
type Granularity = "daily" | "monthly";

const DAILY_MAX_DAYS = 62; // up to ~2 months → daily, beyond → monthly

function pickGranularity(diffDays: number): Granularity {
  return diffDays <= DAILY_MAX_DAYS ? "daily" : "monthly";
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bucketize(days: DayRecord[], granularity: Granularity): { label: string; vacancies: number }[] {
  const buckets = new Map<string, { label: string; vacancies: number; order: number }>();
  for (const day of days) {
    let key: string;
    let label: string;
    let order: number;
    if (granularity === "daily") {
      key = day.iso;
      label = `${MONTHS_SHORT[day.date.getMonth()]} ${day.date.getDate()}`;
      order = day.date.getTime();
    } else {
      key = `${day.date.getFullYear()}-${day.date.getMonth()}`;
      label = `${MONTHS_SHORT[day.date.getMonth()]} ${day.date.getFullYear()}`;
      order = day.date.getFullYear() * 12 + day.date.getMonth();
    }
    const existing = buckets.get(key);
    if (existing) existing.vacancies += day.total;
    else buckets.set(key, { label, vacancies: day.total, order });
  }
  return Array.from(buckets.values())
    .sort((a, b) => a.order - b.order)
    .map(({ label, vacancies }) => ({ label, vacancies }));
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [currentLang] = useState<"en" | "si" | "ta">("en");
  const d = TRANSLATIONS[currentLang];

  // Default range: January 1st of the current year → today.
  // Used only on the first visit of the session — after that the
  // user's selection is restored from sessionStorage.
  const defaultTo = toISO(DATA_END);
  const defaultFrom = `${DATA_END.getFullYear()}-01-01`;
  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(defaultTo);

  // Gate: persist must not run until the restore attempt finishes,
  // otherwise the mount-time persist overwrites the saved range
  // with the defaults before the restored state lands.
  const [restored, setRestored] = useState(false);

  // Restore the previously selected range once on mount. Done in
  // an effect (not the useState initializer) to avoid a Next.js
  // hydration mismatch between server and client renders.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DATE_RANGE_STORAGE_KEY);
      if (saved) {
        const { from, to } = JSON.parse(saved);
        if (from) setFromDate(from);
        if (to) setToDate(to);
      }
    } catch {
      // ignore corrupt storage — defaults stay in place
    }
    setRestored(true);
  }, []);

  // Persist the range whenever it changes so it survives
  // navigation to the analysis pages and back — but only after
  // the restore attempt has completed.
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

  const filteredDays = useMemo(() => {
    if (rangeInvalid) return [];
    return ALL_DAYS.filter((day) => day.iso >= fromDate && day.iso <= toDate);
  }, [fromDate, toDate, rangeInvalid]);

  const diffDays = useMemo(() => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return Math.max(Math.round((to.getTime() - from.getTime()) / 86400000) + 1, 0);
  }, [fromDate, toDate]);

  const granularity = pickGranularity(diffDays);
  const trendData = useMemo(() => bucketize(filteredDays, granularity), [filteredDays, granularity]);
  const totalInRange = useMemo(() => filteredDays.reduce((sum, day) => sum + day.total, 0), [filteredDays]);

  const occData = useMemo(() => splitByDim(filteredDays, DIM_OCCUPATION), [filteredDays]);
  const indData = useMemo(() => splitByDim(filteredDays, DIM_INDUSTRY), [filteredDays]);
  const sectorData = useMemo(() => splitByDim(filteredDays, DIM_SECTOR), [filteredDays]);
  const expData = useMemo(() => splitByDim(filteredDays, DIM_EXPERIENCE), [filteredDays]);
  const eduData = useMemo(() => splitByDim(filteredDays, DIM_EDUCATION), [filteredDays]);
  const formalData = useMemo(() => splitByDim(filteredDays, DIM_FORMAL), [filteredDays]);
  const genderData = useMemo(() => splitByDim(filteredDays, DIM_GENDER), [filteredDays]);
  const nvqData = useMemo(() => splitByDim(filteredDays, DIM_NVQ), [filteredDays]);

  const remoteShare = useMemo(() => {
    const split = splitByDim(filteredDays, DIM_REMOTE);
    const total = split.reduce((a, b) => a + b.value, 0) || 1;
    return split.map((s) => ({ label: s.name, share: Math.round((s.value / total) * 100) }));
  }, [filteredDays]);

  const contractShare = useMemo(() => {
    const split = splitByDim(filteredDays, DIM_CONTRACT);
    const total = split.reduce((a, b) => a + b.value, 0) || 1;
    return split.map((s) => ({ label: s.name, share: Math.round((s.value / total) * 100) }));
  }, [filteredDays]);

  const trendSub = granularity === "daily" ? d.trendSubDaily : d.trendSubMonthly;

  return (
    <div className="min-h-screen w-full min-w-0 bg-zinc-50 text-zinc-800 font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-zinc-200 px-4 md:px-8 py-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 z-40">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-black text-zinc-900 tracking-tight truncate">{d.title}</h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">{d.subtitle}</p>
        </div>

        {/* DATE RANGE FILTER */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end shrink-0">
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-2 rounded-xl">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              {d.dateFrom}
            </label>
            <input
              type="date"
              value={fromDate}
              min={toISO(DATA_START)}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-700 outline-none"
            />
          </div>

          {/* arrow between the two date filters */}
          <span className="text-zinc-400 font-black text-sm select-none" aria-hidden>
            →
          </span>

          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-2 rounded-xl">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              {d.dateTo}
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={toISO(DATA_END)}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-700 outline-none"
            />
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full max-w-[1400px] mx-auto pb-20">
        {rangeInvalid && (
          <div className="bg-zinc-100 border border-zinc-300 text-zinc-700 text-xs font-bold px-4 py-3 rounded-xl">
            {d.invalidRange}
          </div>
        )}

        {/* ADAPTIVE VACANCY TREND */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[420px] flex flex-col">
          <div className="flex flex-wrap justify-between items-start border-b border-zinc-100 pb-2 gap-2">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">{d.trendTitle}</h4>
              <p className="text-[11px] text-zinc-400">{trendSub}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{d.totalInRange}</p>
              <p className="text-lg font-black text-zinc-900">{totalInRange.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex-1 mt-4 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.indigo} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={C.indigo} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: TICK_COLOR }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 10, fill: TICK_COLOR }} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                <Area
                  type="monotone"
                  dataKey="vacancies"
                  stroke={C.indigo}
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  dot={trendData.length <= 40 ? { r: 3, fill: C.indigo, strokeWidth: 0 } : false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OCCUPATION CHART */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[520px] flex flex-col">
          <div className="flex justify-between items-start border-b border-zinc-100 pb-2">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">{d.occChartTitle}</h4>
              <p className="text-[11px] text-zinc-400">{d.occChartSub}</p>
            </div>
            <Link
              href={`/occupations?from=${fromDate}&to=${toDate}`}
              className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {d.seeMore ?? "See More →"}
            </Link>
          </div>
          <div className="flex-1 mt-4 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: TICK_COLOR }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: TICK_COLOR }} width={160} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={barCursor} />
                <Bar dataKey="value" fill={C.indigo} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* INDUSTRY CHART */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[620px] flex flex-col">
          <div className="flex justify-between items-start border-b border-zinc-100 pb-2">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">{d.indChartTitle}</h4>
              <p className="text-[11px] text-zinc-400">{d.indChartSub}</p>
            </div>
            <Link
              href={`/industries?from=${fromDate}&to=${toDate}`}
              className="shrink-0 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {d.seeMore ?? "See More →"}
            </Link>
          </div>
          <div className="flex-1 mt-4 pb-16 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={indData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: TICK_COLOR }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tickFormatter={(v: string) => (v.length > 20 ? `${v.substring(0, 20)}...` : v)}
                />
                <YAxis type="number" tick={{ fontSize: 10, fill: TICK_COLOR }} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={barCursor} />
                <Bar dataKey="value" fill={C.teal} radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* EMPLOYMENT SECTOR CHART
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[440px] flex flex-col">
          <div className="border-b border-zinc-100 pb-2">
            <h4 className="text-sm font-bold text-zinc-900">{d.sectorChartTitle}</h4>
            <p className="text-[11px] text-zinc-400">{d.sectorChartSub}</p>
          </div>
          <div className="flex-1 mt-4 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: TICK_COLOR }} />
                <YAxis tick={{ fontSize: 10, fill: TICK_COLOR }} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={barCursor} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
                  {sectorData.map((_, i) => (
                    <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div> */}

        {/* EXPERIENCE & EDUCATION */}
        {/* <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[400px] flex flex-col">
            <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">{d.expChartTitle}</h4>
            <div className="flex-1 mt-4 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: TICK_COLOR }} />
                  <YAxis tick={{ fontSize: 10, fill: TICK_COLOR }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={barCursor} />
                  <Bar dataKey="value" fill={C.sky} radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[400px] flex flex-col">
            <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">{d.eduChartTitle}</h4>
            <div className="flex-1 flex items-center justify-center min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eduData} cx="50%" cy="45%" innerRadius={65} outerRadius={90} paddingAngle={3} dataKey="value">
                    {eduData.map((_, i) => (
                      <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="#ffffff" />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: TICK_COLOR }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div> */}

        {/* FORMAL/INFORMAL & GENDER */}
        {/* <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[380px] flex flex-col">
            <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">{d.formalChartTitle}</h4>
            <div className="flex-1 flex items-center justify-center min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={formalData} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                    {formalData.map((_, i) => (
                      <Cell key={i} fill={FORMAL_COLORS[i % FORMAL_COLORS.length]} stroke="#ffffff" />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: TICK_COLOR }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[380px] flex flex-col">
            <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">{d.genderChartTitle}</h4>
            <div className="flex-1 flex items-center justify-center min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="45%" innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value">
                    {genderData.map((_, i) => (
                      <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} stroke="#ffffff" />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, color: TICK_COLOR }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div> */}

        {/* VOCATIONAL EDUCATION (NVQ) */}
        {/* <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm h-[380px] flex flex-col">
          <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">{d.vocationalChartTitle}</h4>
          <div className="flex-1 mt-4 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nvqData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: TICK_COLOR }} />
                <YAxis tick={{ fontSize: 10, fill: TICK_COLOR }} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={barCursor} />
                <Bar dataKey="value" fill={C.violet} radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div> */}

        {/* REMOTE & CONTRACT TYPE */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-8">
          <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.indigo }} />
              {d.remoteTitle}
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
                      style={{ width: `${item.share}%`, backgroundColor: C.indigo }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.teal }} />
              {d.contractTitle}
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
                      style={{ width: `${jt.share}%`, backgroundColor: C.teal }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}