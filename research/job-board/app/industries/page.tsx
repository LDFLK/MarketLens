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

// ─────────────────────────────────────────────────────────────
// COLOR SYSTEM (same as dashboard — zinc chrome, muted data)
// ─────────────────────────────────────────────────────────────
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

// Shared session key: the dashboard writes the selected range to
// the same key, so the period stays consistent across all pages.
const DATE_RANGE_STORAGE_KEY = "lmis-date-range";

// ─────────────────────────────────────────────────────────────
// INDUSTRY HIERARCHY (SLSIC / ISIC Rev.4 aligned)
// Industry Sector → Division → Group → Class → Sub Class.
// Sectors and divisions carry the full real ISIC Rev.4
// classification. Groups are real for high-demand branches,
// classes and sub classes hold curated realistic entries for key
// paths. Branches without curated data fall back to generic but
// natural-looking children. Everything is served by the CHILDREN
// map keyed by parent code — the same shape the Go API will
// return from industry_sector → … → industry_subclass tables.
// ─────────────────────────────────────────────────────────────
interface Node {
  code: string;
  name: string;
}

const LEVEL_LABELS = [
  "Industry Sector",
  "Industry Division",
  "Industry Group",
  "Industry Class",
  "Industry Sub Class",
];
const MAX_LEVELS = 5;

const SECTORS: Node[] = [
  { code: "A", name: "Agriculture, Forestry and Fishing" },
  { code: "B", name: "Mining and Quarrying" },
  { code: "C", name: "Manufacturing" },
  { code: "D", name: "Electricity, Gas, Steam and Air Conditioning Supply" },
  { code: "E", name: "Water Supply; Sewerage and Waste Management" },
  { code: "F", name: "Construction" },
  { code: "G", name: "Wholesale and Retail Trade; Repair of Motor Vehicles" },
  { code: "H", name: "Transportation and Storage" },
  { code: "I", name: "Accommodation and Food Service Activities" },
  { code: "J", name: "Information and Communication" },
  { code: "K", name: "Financial and Insurance Activities" },
  { code: "L", name: "Real Estate Activities" },
  { code: "M", name: "Professional, Scientific and Technical Activities" },
  { code: "N", name: "Administrative and Support Service Activities" },
  { code: "O", name: "Public Administration and Defence" },
  { code: "P", name: "Education" },
  { code: "Q", name: "Human Health and Social Work Activities" },
  { code: "R", name: "Arts, Entertainment and Recreation" },
  { code: "S", name: "Other Service Activities" },
  { code: "T", name: "Activities of Households as Employers" },
  { code: "U", name: "Activities of Extraterritorial Organizations" },
];

// Children keyed by parent code. Letter → divisions, 2-digit →
// groups, 3-digit → classes, 4-digit → sub classes.
const CHILDREN: Record<string, Node[]> = {
  // ── Divisions (real ISIC Rev.4, complete) ───────────────────
  A: [
    { code: "01", name: "Crop and Animal Production, Hunting" },
    { code: "02", name: "Forestry and Logging" },
    { code: "03", name: "Fishing and Aquaculture" },
  ],
  B: [
    { code: "05", name: "Mining of Coal and Lignite" },
    { code: "06", name: "Extraction of Crude Petroleum and Natural Gas" },
    { code: "07", name: "Mining of Metal Ores" },
    { code: "08", name: "Other Mining and Quarrying" },
    { code: "09", name: "Mining Support Service Activities" },
  ],
  C: [
    { code: "10", name: "Manufacture of Food Products" },
    { code: "11", name: "Manufacture of Beverages" },
    { code: "12", name: "Manufacture of Tobacco Products" },
    { code: "13", name: "Manufacture of Textiles" },
    { code: "14", name: "Manufacture of Wearing Apparel" },
    { code: "15", name: "Manufacture of Leather and Related Products" },
    { code: "16", name: "Manufacture of Wood and Wood Products" },
    { code: "17", name: "Manufacture of Paper and Paper Products" },
    { code: "18", name: "Printing and Reproduction of Recorded Media" },
    { code: "19", name: "Manufacture of Coke and Refined Petroleum Products" },
    { code: "20", name: "Manufacture of Chemicals and Chemical Products" },
    { code: "21", name: "Manufacture of Pharmaceuticals" },
    { code: "22", name: "Manufacture of Rubber and Plastics Products" },
    { code: "23", name: "Manufacture of Other Non-metallic Mineral Products" },
    { code: "24", name: "Manufacture of Basic Metals" },
    { code: "25", name: "Manufacture of Fabricated Metal Products" },
    { code: "26", name: "Manufacture of Computer, Electronic and Optical Products" },
    { code: "27", name: "Manufacture of Electrical Equipment" },
    { code: "28", name: "Manufacture of Machinery and Equipment" },
    { code: "29", name: "Manufacture of Motor Vehicles and Trailers" },
    { code: "30", name: "Manufacture of Other Transport Equipment" },
    { code: "31", name: "Manufacture of Furniture" },
    { code: "32", name: "Other Manufacturing" },
    { code: "33", name: "Repair and Installation of Machinery and Equipment" },
  ],
  D: [
    { code: "35", name: "Electricity, Gas, Steam and Air Conditioning Supply" },
  ],
  E: [
    { code: "36", name: "Water Collection, Treatment and Supply" },
    { code: "37", name: "Sewerage" },
    { code: "38", name: "Waste Collection, Treatment and Disposal" },
    { code: "39", name: "Remediation and Other Waste Management Services" },
  ],
  F: [
    { code: "41", name: "Construction of Buildings" },
    { code: "42", name: "Civil Engineering" },
    { code: "43", name: "Specialized Construction Activities" },
  ],
  G: [
    { code: "45", name: "Wholesale and Retail Trade and Repair of Motor Vehicles" },
    { code: "46", name: "Wholesale Trade (except Motor Vehicles)" },
    { code: "47", name: "Retail Trade (except Motor Vehicles)" },
  ],
  H: [
    { code: "49", name: "Land Transport and Transport via Pipelines" },
    { code: "50", name: "Water Transport" },
    { code: "51", name: "Air Transport" },
    { code: "52", name: "Warehousing and Support Activities for Transportation" },
    { code: "53", name: "Postal and Courier Activities" },
  ],
  I: [
    { code: "55", name: "Accommodation" },
    { code: "56", name: "Food and Beverage Service Activities" },
  ],
  J: [
    { code: "58", name: "Publishing Activities" },
    { code: "59", name: "Motion Picture, Video and TV Programme Production" },
    { code: "60", name: "Programming and Broadcasting Activities" },
    { code: "61", name: "Telecommunications" },
    { code: "62", name: "Computer Programming, Consultancy and Related Activities" },
    { code: "63", name: "Information Service Activities" },
  ],
  K: [
    { code: "64", name: "Financial Service Activities (except Insurance)" },
    { code: "65", name: "Insurance, Reinsurance and Pension Funding" },
    { code: "66", name: "Activities Auxiliary to Financial Services" },
  ],
  L: [{ code: "68", name: "Real Estate Activities" }],
  M: [
    { code: "69", name: "Legal and Accounting Activities" },
    { code: "70", name: "Head Offices and Management Consultancy" },
    { code: "71", name: "Architectural and Engineering Activities" },
    { code: "72", name: "Scientific Research and Development" },
    { code: "73", name: "Advertising and Market Research" },
    { code: "74", name: "Other Professional, Scientific and Technical Activities" },
    { code: "75", name: "Veterinary Activities" },
  ],
  N: [
    { code: "77", name: "Rental and Leasing Activities" },
    { code: "78", name: "Employment Activities" },
    { code: "79", name: "Travel Agency and Tour Operator Activities" },
    { code: "80", name: "Security and Investigation Activities" },
    { code: "81", name: "Services to Buildings and Landscape Activities" },
    { code: "82", name: "Office Administrative and Business Support Activities" },
  ],
  O: [{ code: "84", name: "Public Administration and Defence" }],
  P: [{ code: "85", name: "Education" }],
  Q: [
    { code: "86", name: "Human Health Activities" },
    { code: "87", name: "Residential Care Activities" },
    { code: "88", name: "Social Work Activities without Accommodation" },
  ],
  R: [
    { code: "90", name: "Creative, Arts and Entertainment Activities" },
    { code: "91", name: "Libraries, Archives, Museums and Cultural Activities" },
    { code: "92", name: "Gambling and Betting Activities" },
    { code: "93", name: "Sports Activities and Amusement and Recreation" },
  ],
  S: [
    { code: "94", name: "Activities of Membership Organizations" },
    { code: "95", name: "Repair of Computers and Personal and Household Goods" },
    { code: "96", name: "Other Personal Service Activities" },
  ],
  T: [
    { code: "97", name: "Activities of Households as Employers of Domestic Personnel" },
    { code: "98", name: "Undifferentiated Goods and Services Producing Activities of Households" },
  ],
  U: [{ code: "99", name: "Activities of Extraterritorial Organizations and Bodies" }],

  // ── Groups (real ISIC Rev.4, high-demand branches) ──────────
  "62": [
    { code: "620", name: "Computer Programming, Consultancy and Related Activities" },
  ],
  "63": [
    { code: "631", name: "Data Processing, Hosting and Web Portals" },
    { code: "639", name: "Other Information Service Activities" },
  ],
  "61": [
    { code: "611", name: "Wired Telecommunications Activities" },
    { code: "612", name: "Wireless Telecommunications Activities" },
    { code: "613", name: "Satellite Telecommunications Activities" },
    { code: "619", name: "Other Telecommunications Activities" },
  ],
  "10": [
    { code: "101", name: "Processing and Preserving of Meat" },
    { code: "103", name: "Processing and Preserving of Fruit and Vegetables" },
    { code: "105", name: "Manufacture of Dairy Products" },
    { code: "106", name: "Manufacture of Grain Mill Products" },
    { code: "107", name: "Manufacture of Other Food Products" },
  ],
  "14": [
    { code: "141", name: "Manufacture of Wearing Apparel (except Fur)" },
    { code: "143", name: "Manufacture of Knitted and Crocheted Apparel" },
  ],
  "41": [{ code: "410", name: "Construction of Buildings" }],
  "42": [
    { code: "421", name: "Construction of Roads and Railways" },
    { code: "422", name: "Construction of Utility Projects" },
    { code: "429", name: "Construction of Other Civil Engineering Projects" },
  ],
  "43": [
    { code: "431", name: "Demolition and Site Preparation" },
    { code: "432", name: "Electrical, Plumbing and Other Installation" },
    { code: "433", name: "Building Completion and Finishing" },
    { code: "439", name: "Other Specialized Construction Activities" },
  ],
  "47": [
    { code: "471", name: "Retail Sale in Non-specialized Stores" },
    { code: "472", name: "Retail Sale of Food, Beverages and Tobacco" },
    { code: "474", name: "Retail Sale of ICT Equipment" },
    { code: "477", name: "Retail Sale of Other Goods in Specialized Stores" },
  ],
  "55": [
    { code: "551", name: "Short-term Accommodation Activities" },
    { code: "559", name: "Other Accommodation" },
  ],
  "56": [
    { code: "561", name: "Restaurants and Mobile Food Service Activities" },
    { code: "562", name: "Event Catering and Other Food Service" },
    { code: "563", name: "Beverage Serving Activities" },
  ],
  "64": [
    { code: "641", name: "Monetary Intermediation" },
    { code: "642", name: "Activities of Holding Companies" },
    { code: "649", name: "Other Financial Service Activities" },
  ],
  "85": [
    { code: "851", name: "Pre-primary and Primary Education" },
    { code: "852", name: "Secondary Education" },
    { code: "853", name: "Higher Education" },
    { code: "854", name: "Other Education" },
  ],
  "86": [
    { code: "861", name: "Hospital Activities" },
    { code: "862", name: "Medical and Dental Practice Activities" },
    { code: "869", name: "Other Human Health Activities" },
  ],

  // ── Classes (real ISIC Rev.4, key groups) ───────────────────
  "620": [
    { code: "6201", name: "Computer Programming Activities" },
    { code: "6202", name: "Computer Consultancy and Facilities Management" },
    { code: "6209", name: "Other IT and Computer Service Activities" },
  ],
  "631": [
    { code: "6311", name: "Data Processing, Hosting and Related Activities" },
    { code: "6312", name: "Web Portals" },
  ],
  "141": [{ code: "1410", name: "Manufacture of Wearing Apparel (except Fur)" }],
  "410": [{ code: "4100", name: "Construction of Buildings" }],
  "421": [{ code: "4210", name: "Construction of Roads and Railways" }],
  "471": [
    { code: "4711", name: "Non-specialized Stores with Food Predominating" },
    { code: "4719", name: "Other Non-specialized Stores" },
  ],
  "561": [{ code: "5610", name: "Restaurants and Mobile Food Service Activities" }],
  "649": [
    { code: "6491", name: "Financial Leasing" },
    { code: "6492", name: "Other Credit Granting" },
    { code: "6499", name: "Other Financial Services n.e.c." },
  ],
  "853": [{ code: "8530", name: "Higher Education" }],
  "861": [{ code: "8610", name: "Hospital Activities" }],

  // ── Sub Classes (curated, SLSIC-style 5-digit) ──────────────
  "6201": [
    { code: "62011", name: "Custom Software Development" },
    { code: "62012", name: "Web and Mobile Application Development" },
    { code: "62013", name: "Enterprise Software and ERP Development" },
  ],
  "6202": [
    { code: "62021", name: "IT Consultancy Services" },
    { code: "62022", name: "Computer Facilities Management" },
  ],
  "6311": [
    { code: "63111", name: "Data Centre and Hosting Services" },
    { code: "63112", name: "Cloud Infrastructure Services" },
  ],
  "1410": [
    { code: "14101", name: "Garment Manufacture for Export" },
    { code: "14102", name: "Garment Manufacture for Domestic Market" },
  ],
  "4100": [
    { code: "41001", name: "Residential Building Construction" },
    { code: "41002", name: "Non-residential Building Construction" },
  ],
  "5610": [
    { code: "56101", name: "Restaurants" },
    { code: "56102", name: "Fast Food Outlets" },
    { code: "56103", name: "Mobile Food Services" },
  ],
  "8610": [
    { code: "86101", name: "General Hospitals" },
    { code: "86102", name: "Specialized Hospitals" },
    { code: "86103", name: "Private Hospitals" },
  ],
  "8530": [
    { code: "85301", name: "Universities" },
    { code: "85302", name: "Technical and Vocational Higher Education" },
  ],
};

// Fallback for branches without curated data: three natural-
// looking children. Prefix from any earlier fallback is stripped
// so names don't stack ("Other General …").
const FALLBACK_PREFIXES = ["General", "Specialized", "Other"];

function getChildren(level: number, parent: Node | null): Node[] {
  if (level === 0) return SECTORS;
  if (!parent) return [];
  const real = CHILDREN[parent.code];
  if (real && real.length > 0) return real;
  const base = parent.name
    .replace(/^(General|Specialized|Other)\s+/, "")
    .trim();
  return FALLBACK_PREFIXES.map((prefix, i) => ({
    code: `${parent.code}-${i + 1}`,
    name: `${prefix} ${base}`,
  }));
}

// ─────────────────────────────────────────────────────────────
// MOCK DATA ENGINE
// Deterministic totals per (date range × hierarchy path). Each
// node's data is seeded from its code so every selection shows
// stable but distinct distributions. Swap for API calls later:
// GET /industry-subclasses/:code/stats?from=&to=
// ─────────────────────────────────────────────────────────────
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const toISO = (dt: Date) => dt.toISOString().slice(0, 10);
const DATA_END = new Date();

// Approximate daily national vacancy volume (same spirit as the
// dashboard's engine, simplified to a closed-form per-day count).
function dayCount(iso: string): number {
  const dt = new Date(iso);
  const weekday = dt.getDay();
  const weekly = weekday === 0 || weekday === 6 ? 0.55 : 1;
  const seasonal =
    1 + 0.12 * Math.sin((2 * Math.PI * (dt.getMonth() + 1)) / 12);
  const noise = 0.85 + hash01(iso) * 0.3;
  return Math.round(340 * weekly * seasonal * noise);
}

function rangeTotal(fromISO: string, toISO_: string): number {
  let total = 0;
  const cursor = new Date(fromISO);
  const end = new Date(toISO_);
  while (cursor <= end) {
    total += dayCount(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

// Share of national total captured by a hierarchy path: the
// sector takes its published share; each deeper level narrows it.
const SECTOR_SHARE: Record<string, number> = {
  A: 0.034,
  B: 0.009,
  C: 0.195,
  D: 0.015,
  E: 0.011,
  F: 0.054,
  G: 0.092,
  H: 0.043,
  I: 0.078,
  J: 0.248,
  K: 0.113,
  L: 0.014,
  M: 0.039,
  N: 0.025,
  O: 0.018,
  P: 0.03,
  Q: 0.023,
  R: 0.012,
  S: 0.01,
  T: 0.006,
  U: 0.004,
};

function pathShare(path: Node[]): number {
  if (path.length === 0) return 0;
  let share = SECTOR_SHARE[path[0].code] ?? 0.02;
  for (let lvl = 1; lvl < path.length; lvl++) {
    share *= 0.2 + hash01(path[lvl].code) * 0.4; // each level keeps 20–60%
  }
  return share;
}

interface Dim {
  name: string;
  base: number;
}

const DIM_SECTOR: Dim[] = [
  { name: "Government", base: 19.7 },
  { name: "Semi Government", base: 9.5 },
  { name: "Private", base: 65.2 },
  { name: "NGO", base: 5.6 },
];
const DIM_EXPERIENCE: Dim[] = [
  { name: "Entry Level", base: 21 },
  { name: "Junior", base: 40.5 },
  { name: "Mid-Level", base: 26.2 },
  { name: "Senior", base: 12.3 },
];
const DIM_EDUCATION: Dim[] = [
  { name: "Degree", base: 41.8 },
  { name: "A/L", base: 24.9 },
  { name: "O/L", base: 14.5 },
  { name: "Below O/L", base: 5.2 },
  { name: "Not Specified", base: 13.6 },
];
const DIM_FORMAL: Dim[] = [
  { name: "Formal", base: 78.7 },
  { name: "Informal", base: 21.3 },
];
const DIM_GENDER: Dim[] = [
  { name: "Male", base: 57 },
  { name: "Female", base: 39.8 },
  { name: "Not Specified", base: 3.2 },
];
const DIM_NVQ: Dim[] = [
  { name: "NVQ 1", base: 9.8 },
  { name: "NVQ 2", base: 14.3 },
  { name: "NVQ 3", base: 20.9 },
  { name: "NVQ 4", base: 26.3 },
  { name: "NVQ 5", base: 17.8 },
  { name: "NVQ 6", base: 7.3 },
  { name: "NVQ 7", base: 3.6 },
];
const DIM_REMOTE: Dim[] = [
  { name: "On-Site", base: 81 },
  { name: "Remote", base: 19 },
];
const DIM_CONTRACT: Dim[] = [
  { name: "Full-Time", base: 72 },
  { name: "Part-Time", base: 14 },
  { name: "Contract", base: 9 },
  { name: "Internship", base: 5 },
];

// Province dimension — Sri Lanka's 9 provinces with realistic
// base shares of vacancy demand (Western-dominant).
const DIM_PROVINCE: Dim[] = [
  { name: "Western", base: 42 },
  { name: "Central", base: 10.5 },
  { name: "Southern", base: 9.8 },
  { name: "North Western", base: 7.4 },
  { name: "Eastern", base: 6.2 },
  { name: "Sabaragamuwa", base: 5.6 },
  { name: "Northern", base: 5.0 },
  { name: "North Central", base: 4.6 },
  { name: "Uva", base: 4.1 },
];

// 9 provinces need more hues than CATEGORICAL's 7 — extend with
// two extra muted tones so adjacent slices never repeat.
const PROVINCE_COLORS = [...CATEGORICAL, "#0e7490", "#b45309"];

// Split a node's total across a dimension. Base shares are
// modulated by a hash of (node code × category) so different
// hierarchy selections produce different, stable mixes.
function splitForNode(
  code: string,
  dims: Dim[],
  total: number,
): { name: string; value: number }[] {
  const weights = dims.map(
    (dm) => dm.base * (0.55 + hash01(code + "::" + dm.name) * 0.9),
  );
  const wSum = weights.reduce((a, b) => a + b, 0);
  return dims.map((dm, i) => ({
    name: dm.name,
    value: Math.round((total * weights[i]) / wSum),
  }));
}

function shareBars(
  code: string,
  dims: Dim[],
): { label: string; share: number }[] {
  const split = splitForNode(code, dims, 10000);
  const total = split.reduce((a, b) => a + b.value, 0) || 1;
  return split.map((s) => ({
    label: s.name,
    share: Math.round((s.value / total) * 100),
  }));
}

// ─────────────────────────────────────────────────────────────
// TABLE VIEW HELPER — renders a dimension as a compact table
// with rank, name, job count and share of the dimension total.
// ─────────────────────────────────────────────────────────────
function DataTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; value: number }[];
}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;
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
            {sorted.map((row, i) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────
function IndustryAnalysis() {
  const searchParams = useSearchParams();

  const defaultFrom = `${DATA_END.getFullYear()}-01-01`;
  const defaultTo = toISO(DATA_END);
  const urlFrom = searchParams.get("from");
  const urlTo = searchParams.get("to");

  // Priority: URL params (arriving from the dashboard's "See More")
  // → saved range from the session (direct visits) → defaults.
  const [fromDate, setFromDate] = useState<string>(urlFrom ?? defaultFrom);
  const [toDate, setToDate] = useState<string>(urlTo ?? defaultTo);

  // Gate: persist must not run until the restore attempt finishes,
  // otherwise the mount-time persist overwrites the saved range
  // before the restored state lands.
  const [restored, setRestored] = useState(false);

  // On direct visits without URL params, restore the shared range
  // selected earlier in this session. Done in an effect to avoid a
  // hydration mismatch.
  useEffect(() => {
    if (!urlFrom && !urlTo) {
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
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the shared range in sync so returning to the dashboard
  // (or opening the other analysis page) shows the same period —
  // but only after the restore attempt has completed.
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(
        DATE_RANGE_STORAGE_KEY,
        JSON.stringify({ from: fromDate, to: toDate }),
      );
    } catch {}
  }, [restored, fromDate, toDate]);

  // Selection path: one selected node per visible level.
  // Starts with the first sector; "+" appends the next level.
  const [path, setPath] = useState<Node[]>([SECTORS[0]]);

  // View mode of the analytics panel — chart or table
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const handleSelect = (level: number, code: string) => {
    const options = getChildren(level, level === 0 ? null : path[level - 1]);
    const node = options.find((o) => o.code === code);
    if (!node) return;
    // Changing a level invalidates everything deeper — truncate.
    setPath([...path.slice(0, level), node]);
  };

  const handleAddLevel = () => {
    if (path.length >= MAX_LEVELS) return;
    const children = getChildren(path.length, path[path.length - 1]);
    if (children.length === 0) return;
    setPath([...path, children[0]]);
  };

  const handleRemoveLevel = () => {
    if (path.length <= 1) return;
    setPath(path.slice(0, -1));
  };

  const deepest = path[path.length - 1];

  // Totals & distributions for the current selection + date range
  const baseTotal = useMemo(
    () => rangeTotal(fromDate, toDate),
    [fromDate, toDate],
  );
  const nodeTotal = useMemo(
    () => Math.round(baseTotal * pathShare(path)),
    [baseTotal, path],
  );

  const sectorData = useMemo(
    () => splitForNode(deepest.code, DIM_SECTOR, nodeTotal),
    [deepest.code, nodeTotal],
  );
  const expData = useMemo(
    () => splitForNode(deepest.code, DIM_EXPERIENCE, nodeTotal),
    [deepest.code, nodeTotal],
  );
  const eduData = useMemo(
    () => splitForNode(deepest.code, DIM_EDUCATION, nodeTotal),
    [deepest.code, nodeTotal],
  );
  const formalData = useMemo(
    () => splitForNode(deepest.code, DIM_FORMAL, nodeTotal),
    [deepest.code, nodeTotal],
  );
  const genderData = useMemo(
    () => splitForNode(deepest.code, DIM_GENDER, nodeTotal),
    [deepest.code, nodeTotal],
  );
  const nvqData = useMemo(
    () => splitForNode(deepest.code, DIM_NVQ, nodeTotal),
    [deepest.code, nodeTotal],
  );
  const remoteShare = useMemo(
    () => shareBars(deepest.code, DIM_REMOTE),
    [deepest.code],
  );
  const contractShare = useMemo(
    () => shareBars(deepest.code, DIM_CONTRACT),
    [deepest.code],
  );

  // Children of the current selection with their vacancy counts —
  // powers the breakdown bar chart. Sector selected → its
  // divisions; division selected → its groups; and so on. Hidden
  // at level 5 (sub classes have no children).
  const childrenBreakdown = useMemo(() => {
    if (path.length >= MAX_LEVELS) return [];
    const children = getChildren(path.length, deepest);
    return children
      .map((child) => ({
        name: child.name,
        value: Math.round(baseTotal * pathShare([...path, child])),
      }))
      .sort((a, b) => b.value - a.value);
  }, [path, deepest, baseTotal]);

  // Province distribution for the selection.
  const provinceData = useMemo(
    () => splitForNode(deepest.code, DIM_PROVINCE, nodeTotal),
    [deepest.code, nodeTotal],
  );

  // Count versions of remote/contract for the table view (the
  // chart view shows these as percentage progress bars).
  const remoteData = useMemo(
    () => splitForNode(deepest.code, DIM_REMOTE, nodeTotal),
    [deepest.code, nodeTotal],
  );
  const contractData = useMemo(
    () => splitForNode(deepest.code, DIM_CONTRACT, nodeTotal),
    [deepest.code, nodeTotal],
  );

  return (
    <div className="min-h-screen w-full min-w-0 bg-zinc-50 text-zinc-800 font-sans">
      {/* Rendered inside the normal layout — sidebar stays visible.
          Back to Dashboard link sits below the header. */}
      {/* HEADER */}
      <header className="bg-white border-b border-zinc-200 px-4 md:px-8 py-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-0 z-40">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-black text-zinc-900 tracking-tight truncate">
            Industry Analysis (SLSIC)
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Analyze through the industry classification hierarchy
          </p>
        </div>

        {/* 1. SELECTED DATE RANGE */}
        <div className="flex items-center gap-2 shrink-0 bg-zinc-100 px-4 py-2 rounded-xl">
          <svg
            className="w-3.5 h-3.5 text-zinc-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-xs font-bold text-zinc-700">{fromDate}</span>
          <span className="text-zinc-400 text-xs">→</span>
          <span className="text-xs font-bold text-zinc-700">{toDate}</span>
        </div>
      </header>

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full max-w-[1400px] mx-auto pb-20">
        {/* BACK BUTTON — below the header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 px-3 py-2 rounded-lg transition-colors"
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

        {/* 2. HIERARCHY SELECTOR */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 mb-4">
            Classification Hierarchy
          </h4>
          <div className="flex flex-wrap items-end gap-2">
            {path.map((node, level) => {
              const options = getChildren(
                level,
                level === 0 ? null : path[level - 1],
              );
              return (
                <div key={level} className="flex items-end gap-2">
                  {level > 0 && (
                    <span
                      className="pb-2.5 text-zinc-300 font-black select-none"
                      aria-hidden
                    >
                      →
                    </span>
                  )}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                      {LEVEL_LABELS[level]}
                    </p>
                    <select
                      value={node.code}
                      title={node.name}
                      onChange={(e) => handleSelect(level, e.target.value)}
                      className="bg-zinc-100 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none border border-transparent focus:border-zinc-300 max-w-[200px] truncate"
                    >
                      {options.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}

            {/* "+" — add next hierarchy level */}
            {path.length < MAX_LEVELS && (
              <button
                onClick={handleAddLevel}
                aria-label={`Add ${LEVEL_LABELS[path.length]}`}
                title={`Add ${LEVEL_LABELS[path.length]}`}
                className="mb-0.5 w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white font-black text-base flex items-center justify-center transition-colors"
              >
                +
              </button>
            )}

            {/* remove deepest level */}
            {path.length > 1 && (
              <button
                onClick={handleRemoveLevel}
                aria-label="Remove last level"
                title="Remove last level"
                className="mb-0.5 w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 font-black text-base flex items-center justify-center transition-colors"
              >
                −
              </button>
            )}
          </div>
        </div>

        {/* ANALYTICS PANEL — one box for all charts. The header
            names the selected group so every chart below is
            clearly tied to it. */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/70 rounded-t-xl flex flex-wrap justify-between items-end gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                Analytics for {LEVEL_LABELS[path.length - 1]}
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
                {nodeTotal.toLocaleString()}
              </p>
            </div>
          </div>

          {/* VIEW TOGGLE — chart or table, applies to everything below */}
          <div className="px-5 py-3 border-b border-zinc-200 flex items-center gap-3">
            
            <div className="flex bg-zinc-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("chart")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  viewMode === "chart"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Chart View
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Table View
              </button>
            </div>
          </div>

          {/* CHART VIEW */}
          {viewMode === "chart" && (
          <div className="p-4 md:p-5 space-y-6">
            {/* BREAKDOWN — children of the current selection.
                Y axis: child group names · X axis: vacancy count */}
            {childrenBreakdown.length > 0 && (
              <div className="border border-zinc-100 p-5 rounded-xl flex flex-col">
                <div className="border-b border-zinc-100 pb-2">
                  <h4 className="text-sm font-bold text-zinc-900">
                    {LEVEL_LABELS[path.length]} Breakdown
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Vacancy count of each{" "}
                    {LEVEL_LABELS[path.length].toLowerCase()} under{" "}
                    {deepest.name}
                  </p>
                </div>
                <div
                  className="mt-4 min-w-0"
                  style={{
                    height: Math.max(childrenBreakdown.length * 44 + 40, 160),
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
                        fill={C.teal}
                        radius={[0, 4, 4, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* EMPLOYMENT SECTOR + EXPERIENCE (one row) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                  Employment Sector wise Job Distribution
                </h4>
                <div className="flex-1 mt-4 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sectorData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
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
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                        {sectorData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                  Job Distribution by Experience
                </h4>
                <div className="flex-1 mt-4 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={expData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
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
                        fill={C.sky}
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* PROVINCE + EDUCATION (one row) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                  Province wise Distribution
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
                            fill={PROVINCE_COLORS[i % PROVINCE_COLORS.length]}
                            stroke="#ffffff"
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 10, color: TICK_COLOR }}
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
                  Job Distribution by Education Level
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
                        wrapperStyle={{ fontSize: 11, color: TICK_COLOR }}
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

            {/* FORMAL/INFORMAL & GENDER */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
                <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                  Formal / Informal Sector
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
                            fill={FORMAL_COLORS[i % FORMAL_COLORS.length]}
                            stroke="#ffffff"
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 11, color: TICK_COLOR }}
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
                  Job Distribution by Gender
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
                            fill={GENDER_COLORS[i % GENDER_COLORS.length]}
                            stroke="#ffffff"
                          />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconSize={8}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 11, color: TICK_COLOR }}
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

            {/* VOCATIONAL EDUCATION (NVQ) */}
            <div className="border border-zinc-100 p-5 rounded-xl h-[380px] flex flex-col">
              <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
                Vocational Education (NVQ Level)
              </h4>
              <div className="flex-1 mt-4 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={nvqData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
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

            {/* REMOTE & CONTRACT TYPE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="border border-zinc-100 p-6 rounded-xl">
                <h3 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: C.indigo }}
                  />
                  Remote / On-Site Configuration
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
                  Contract Type Share
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
          )}

          {/* TABLE VIEW — same data, tabular */}
          {viewMode === "table" && (
          <div className="p-4 md:p-5 grid grid-cols-1 xl:grid-cols-2 gap-6">
            {childrenBreakdown.length > 0 && (
              <DataTable
                title={`${LEVEL_LABELS[path.length]} Breakdown`}
                rows={childrenBreakdown}
              />
            )}
            <DataTable title="Employment Sector" rows={sectorData} />
            <DataTable title="Experience" rows={expData} />
            <DataTable title="Province wise Distribution" rows={provinceData} />
            <DataTable title="Education Level" rows={eduData} />
            <DataTable title="Formal / Informal Sector" rows={formalData} />
            <DataTable title="Gender" rows={genderData} />
            <DataTable title="Vocational Education (NVQ Level)" rows={nvqData} />
            <DataTable title="Remote / On-Site" rows={remoteData} />
            <DataTable title="Contract Type" rows={contractData} />
          </div>
          )}
        </div>
      </div>
    </div>
  );
}


// useSearchParams requires a Suspense boundary in the App Router
export default function IndustryAnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <IndustryAnalysis />
    </Suspense>
  );
}