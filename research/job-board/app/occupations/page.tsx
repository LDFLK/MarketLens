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
const DATE_RANGE_STORAGE_KEY = "lmis-date-range:v2";

// ─────────────────────────────────────────────────────────────
// OCCUPATION HIERARCHY (SLSO / ISCO-08 aligned)
// Major → Sub Major → Minor → Unit → Occupation Group.
// Levels 1–3 carry the full real ISCO-08 classification. Level 4
// (unit groups) is real for the most common branches, and level 5
// holds curated occupation titles for key unit groups. Branches
// without curated data fall back to generic but natural-looking
// children ("General / Specialized / Other …"). All of this is
// served by the CHILDREN map keyed by parent code — the same
// shape the Go API will return from the major_group → … →
// occupation_group reference tables.
// ─────────────────────────────────────────────────────────────
interface Node {
  code: string;
  name: string;
}

const LEVEL_LABELS = [
  "Major Group",
  "Sub Major Group",
  "Minor Group",
  "Unit Group",
  "Occupation Group",
];
const MAX_LEVELS = 5;

const MAJOR_GROUPS: Node[] = [
  { code: "1", name: "Managers" },
  { code: "2", name: "Professionals" },
  { code: "3", name: "Technicians & Associate Professionals" },
  { code: "4", name: "Clerical Support Workers" },
  { code: "5", name: "Service and Sales Workers" },
  { code: "6", name: "Skilled Agricultural, Forestry & Fishery Workers" },
  { code: "7", name: "Craft and Related Trades Workers" },
  { code: "8", name: "Plant & Machine Operators and Assemblers" },
  { code: "9", name: "Elementary Occupations" },
  { code: "0", name: "Armed Forces Occupations" },
];

// Children keyed by parent code. Levels: 1-digit → sub majors,
// 2-digit → minor groups, 3-digit → unit groups, 4-digit →
// occupation groups.
const CHILDREN: Record<string, Node[]> = {
  // ── Sub Major Groups (real ISCO-08) ─────────────────────────
  "1": [
    { code: "11", name: "Chief Executives, Senior Officials & Legislators" },
    { code: "12", name: "Administrative and Commercial Managers" },
    { code: "13", name: "Production and Specialized Services Managers" },
    { code: "14", name: "Hospitality, Retail and Other Services Managers" },
  ],
  "2": [
    { code: "21", name: "Science and Engineering Professionals" },
    { code: "22", name: "Health Professionals" },
    { code: "23", name: "Teaching Professionals" },
    { code: "24", name: "Business and Administration Professionals" },
    { code: "25", name: "ICT Professionals" },
    { code: "26", name: "Legal, Social and Cultural Professionals" },
  ],
  "3": [
    { code: "31", name: "Science and Engineering Associate Professionals" },
    { code: "32", name: "Health Associate Professionals" },
    { code: "33", name: "Business and Administration Associate Professionals" },
    { code: "34", name: "Legal, Social, Cultural Associate Professionals" },
    { code: "35", name: "Information and Communications Technicians" },
  ],
  "4": [
    { code: "41", name: "General and Keyboard Clerks" },
    { code: "42", name: "Customer Services Clerks" },
    { code: "43", name: "Numerical and Material Recording Clerks" },
    { code: "44", name: "Other Clerical Support Workers" },
  ],
  "5": [
    { code: "51", name: "Personal Service Workers" },
    { code: "52", name: "Sales Workers" },
    { code: "53", name: "Personal Care Workers" },
    { code: "54", name: "Protective Services Workers" },
  ],
  "6": [
    { code: "61", name: "Market-oriented Skilled Agricultural Workers" },
    { code: "62", name: "Skilled Forestry, Fishery and Hunting Workers" },
    { code: "63", name: "Subsistence Farmers, Fishers and Gatherers" },
  ],
  "7": [
    { code: "71", name: "Building and Related Trades Workers" },
    { code: "72", name: "Metal, Machinery and Related Trades Workers" },
    { code: "73", name: "Handicraft and Printing Workers" },
    { code: "74", name: "Electrical and Electronic Trades Workers" },
    { code: "75", name: "Food, Wood, Garment and Other Craft Workers" },
  ],
  "8": [
    { code: "81", name: "Stationary Plant and Machine Operators" },
    { code: "82", name: "Assemblers" },
    { code: "83", name: "Drivers and Mobile Plant Operators" },
  ],
  "9": [
    { code: "91", name: "Cleaners and Helpers" },
    { code: "92", name: "Agricultural, Forestry and Fishery Labourers" },
    { code: "93", name: "Labourers in Mining, Construction & Transport" },
    { code: "94", name: "Food Preparation Assistants" },
    { code: "95", name: "Street and Related Sales and Service Workers" },
    { code: "96", name: "Refuse Workers and Other Elementary Workers" },
  ],
  "0": [
    { code: "01", name: "Commissioned Armed Forces Officers" },
    { code: "02", name: "Non-commissioned Armed Forces Officers" },
    { code: "03", name: "Armed Forces, Other Ranks" },
  ],

  // ── Minor Groups (real ISCO-08, complete) ───────────────────
  "11": [
    { code: "111", name: "Legislators and Senior Officials" },
    { code: "112", name: "Managing Directors and Chief Executives" },
  ],
  "12": [
    { code: "121", name: "Business Services and Administration Managers" },
    { code: "122", name: "Sales, Marketing and Development Managers" },
  ],
  "13": [
    { code: "131", name: "Production Managers in Agriculture, Forestry and Fisheries" },
    { code: "132", name: "Manufacturing, Mining, Construction and Distribution Managers" },
    { code: "133", name: "ICT Service Managers" },
    { code: "134", name: "Professional Services Managers" },
  ],
  "14": [
    { code: "141", name: "Hotel and Restaurant Managers" },
    { code: "142", name: "Retail and Wholesale Trade Managers" },
    { code: "143", name: "Other Services Managers" },
  ],
  "21": [
    { code: "211", name: "Physical and Earth Science Professionals" },
    { code: "212", name: "Mathematicians, Actuaries and Statisticians" },
    { code: "213", name: "Life Science Professionals" },
    { code: "214", name: "Engineering Professionals (excl. Electrotechnology)" },
    { code: "215", name: "Electrotechnology Engineers" },
    { code: "216", name: "Architects, Planners, Surveyors and Designers" },
  ],
  "22": [
    { code: "221", name: "Medical Doctors" },
    { code: "222", name: "Nursing and Midwifery Professionals" },
    { code: "223", name: "Traditional and Complementary Medicine Professionals" },
    { code: "224", name: "Paramedical Practitioners" },
    { code: "225", name: "Veterinarians" },
    { code: "226", name: "Other Health Professionals" },
  ],
  "23": [
    { code: "231", name: "University and Higher Education Teachers" },
    { code: "232", name: "Vocational Education Teachers" },
    { code: "233", name: "Secondary Education Teachers" },
    { code: "234", name: "Primary School and Early Childhood Teachers" },
    { code: "235", name: "Other Teaching Professionals" },
  ],
  "24": [
    { code: "241", name: "Finance Professionals" },
    { code: "242", name: "Administration Professionals" },
    { code: "243", name: "Sales, Marketing and Public Relations Professionals" },
  ],
  "25": [
    { code: "251", name: "Software and Applications Developers and Analysts" },
    { code: "252", name: "Database and Network Professionals" },
  ],
  "26": [
    { code: "261", name: "Legal Professionals" },
    { code: "262", name: "Librarians, Archivists and Curators" },
    { code: "263", name: "Social and Religious Professionals" },
    { code: "264", name: "Authors, Journalists and Linguists" },
    { code: "265", name: "Creative and Performing Artists" },
  ],
  "31": [
    { code: "311", name: "Physical and Engineering Science Technicians" },
    { code: "312", name: "Mining, Manufacturing and Construction Supervisors" },
    { code: "313", name: "Process Control Technicians" },
    { code: "314", name: "Life Science Technicians and Related Associate Professionals" },
    { code: "315", name: "Ship and Aircraft Controllers and Technicians" },
  ],
  "32": [
    { code: "321", name: "Medical and Pharmaceutical Technicians" },
    { code: "322", name: "Nursing and Midwifery Associate Professionals" },
    { code: "323", name: "Traditional and Complementary Medicine Associate Professionals" },
    { code: "324", name: "Veterinary Technicians and Assistants" },
    { code: "325", name: "Other Health Associate Professionals" },
  ],
  "33": [
    { code: "331", name: "Financial and Mathematical Associate Professionals" },
    { code: "332", name: "Sales and Purchasing Agents and Brokers" },
    { code: "333", name: "Business Services Agents" },
    { code: "334", name: "Administrative and Specialized Secretaries" },
    { code: "335", name: "Regulatory Government Associate Professionals" },
  ],
  "34": [
    { code: "341", name: "Legal, Social and Religious Associate Professionals" },
    { code: "342", name: "Sports and Fitness Workers" },
    { code: "343", name: "Artistic, Cultural and Culinary Associate Professionals" },
  ],
  "35": [
    { code: "351", name: "ICT Operations and User Support Technicians" },
    { code: "352", name: "Telecommunications and Broadcasting Technicians" },
  ],
  "41": [
    { code: "411", name: "General Office Clerks" },
    { code: "412", name: "Secretaries (General)" },
    { code: "413", name: "Keyboard Operators" },
  ],
  "42": [
    { code: "421", name: "Tellers, Money Collectors and Related Clerks" },
    { code: "422", name: "Client Information Workers" },
  ],
  "43": [
    { code: "431", name: "Numerical Clerks" },
    { code: "432", name: "Material-recording and Transport Clerks" },
  ],
  "44": [{ code: "441", name: "Other Clerical Support Workers" }],
  "51": [
    { code: "511", name: "Travel Attendants, Conductors and Guides" },
    { code: "512", name: "Cooks" },
    { code: "513", name: "Waiters and Bartenders" },
    { code: "514", name: "Hairdressers, Beauticians and Related Workers" },
    { code: "515", name: "Building and Housekeeping Supervisors" },
    { code: "516", name: "Other Personal Services Workers" },
  ],
  "52": [
    { code: "521", name: "Street and Market Salespersons" },
    { code: "522", name: "Shop Salespersons" },
    { code: "523", name: "Cashiers and Ticket Clerks" },
    { code: "524", name: "Other Sales Workers" },
  ],
  "53": [
    { code: "531", name: "Child Care Workers and Teachers' Aides" },
    { code: "532", name: "Personal Care Workers in Health Services" },
  ],
  "54": [{ code: "541", name: "Protective Services Workers" }],
  "61": [
    { code: "611", name: "Market Gardeners and Crop Growers" },
    { code: "612", name: "Animal Producers" },
    { code: "613", name: "Mixed Crop and Animal Producers" },
  ],
  "62": [
    { code: "621", name: "Forestry and Related Workers" },
    { code: "622", name: "Fishery Workers, Hunters and Trappers" },
  ],
  "63": [
    { code: "631", name: "Subsistence Crop Farmers" },
    { code: "632", name: "Subsistence Livestock Farmers" },
    { code: "633", name: "Subsistence Mixed Crop and Livestock Farmers" },
    { code: "634", name: "Subsistence Fishers, Hunters, Trappers and Gatherers" },
  ],
  "71": [
    { code: "711", name: "Building Frame and Related Trades Workers" },
    { code: "712", name: "Building Finishers and Related Trades Workers" },
    { code: "713", name: "Painters, Building Structure Cleaners and Related Trades Workers" },
  ],
  "72": [
    { code: "721", name: "Sheet and Structural Metal Workers, Moulders and Welders" },
    { code: "722", name: "Blacksmiths, Toolmakers and Related Trades Workers" },
    { code: "723", name: "Machinery Mechanics and Repairers" },
  ],
  "73": [
    { code: "731", name: "Handicraft Workers" },
    { code: "732", name: "Printing Trades Workers" },
  ],
  "74": [
    { code: "741", name: "Electrical Equipment Installers and Repairers" },
    { code: "742", name: "Electronics and Telecommunications Installers and Repairers" },
  ],
  "75": [
    { code: "751", name: "Food Processing and Related Trades Workers" },
    { code: "752", name: "Wood Treaters, Cabinet-makers and Related Trades Workers" },
    { code: "753", name: "Garment and Related Trades Workers" },
    { code: "754", name: "Other Craft and Related Workers" },
  ],
  "81": [
    { code: "811", name: "Mining and Mineral Processing Plant Operators" },
    { code: "812", name: "Metal Processing and Finishing Plant Operators" },
    { code: "813", name: "Chemical and Photographic Products Plant and Machine Operators" },
    { code: "814", name: "Rubber, Plastic and Paper Products Machine Operators" },
    { code: "815", name: "Textile, Fur and Leather Products Machine Operators" },
    { code: "816", name: "Food and Related Products Machine Operators" },
    { code: "817", name: "Wood Processing and Papermaking Plant Operators" },
    { code: "818", name: "Other Stationary Plant and Machine Operators" },
  ],
  "82": [{ code: "821", name: "Assemblers" }],
  "83": [
    { code: "831", name: "Locomotive Engine Drivers and Related Workers" },
    { code: "832", name: "Car, Van and Motorcycle Drivers" },
    { code: "833", name: "Heavy Truck and Bus Drivers" },
    { code: "834", name: "Mobile Plant Operators" },
    { code: "835", name: "Ships' Deck Crews and Related Workers" },
  ],
  "91": [
    { code: "911", name: "Domestic, Hotel and Office Cleaners and Helpers" },
    { code: "912", name: "Vehicle, Window, Laundry and Other Hand Cleaning Workers" },
  ],
  "92": [{ code: "921", name: "Agricultural, Forestry and Fishery Labourers" }],
  "93": [
    { code: "931", name: "Mining and Construction Labourers" },
    { code: "932", name: "Manufacturing Labourers" },
    { code: "933", name: "Transport and Storage Labourers" },
  ],
  "94": [{ code: "941", name: "Food Preparation Assistants" }],
  "95": [
    { code: "951", name: "Street and Related Service Workers" },
    { code: "952", name: "Street Vendors (excluding Food)" },
  ],
  "96": [
    { code: "961", name: "Refuse Workers" },
    { code: "962", name: "Other Elementary Workers" },
  ],
  "01": [{ code: "011", name: "Commissioned Armed Forces Officers" }],
  "02": [{ code: "021", name: "Non-commissioned Armed Forces Officers" }],
  "03": [{ code: "031", name: "Armed Forces Occupations, Other Ranks" }],

  // ── Unit Groups (real ISCO-08, high-demand branches) ────────
  "251": [
    { code: "2511", name: "Systems Analysts" },
    { code: "2512", name: "Software Developers" },
    { code: "2513", name: "Web and Multimedia Developers" },
    { code: "2514", name: "Applications Programmers" },
    { code: "2519", name: "Software and Applications Developers Not Elsewhere Classified" },
  ],
  "252": [
    { code: "2521", name: "Database Designers and Administrators" },
    { code: "2522", name: "Systems Administrators" },
    { code: "2523", name: "Computer Network Professionals" },
    { code: "2529", name: "Database and Network Professionals Not Elsewhere Classified" },
  ],
  "351": [
    { code: "3511", name: "ICT Operations Technicians" },
    { code: "3512", name: "ICT User Support Technicians" },
    { code: "3513", name: "Computer Network and Systems Technicians" },
    { code: "3514", name: "Web Technicians" },
  ],
  "214": [
    { code: "2141", name: "Industrial and Production Engineers" },
    { code: "2142", name: "Civil Engineers" },
    { code: "2143", name: "Environmental Engineers" },
    { code: "2144", name: "Mechanical Engineers" },
    { code: "2145", name: "Chemical Engineers" },
    { code: "2149", name: "Engineering Professionals Not Elsewhere Classified" },
  ],
  "215": [
    { code: "2151", name: "Electrical Engineers" },
    { code: "2152", name: "Electronics Engineers" },
    { code: "2153", name: "Telecommunications Engineers" },
  ],
  "221": [
    { code: "2211", name: "Generalist Medical Practitioners" },
    { code: "2212", name: "Specialist Medical Practitioners" },
  ],
  "222": [
    { code: "2221", name: "Nursing Professionals" },
    { code: "2222", name: "Midwifery Professionals" },
  ],
  "241": [
    { code: "2411", name: "Accountants" },
    { code: "2412", name: "Financial and Investment Advisers" },
    { code: "2413", name: "Financial Analysts" },
  ],
  "243": [
    { code: "2431", name: "Advertising and Marketing Professionals" },
    { code: "2432", name: "Public Relations Professionals" },
    { code: "2433", name: "Technical and Medical Sales Professionals" },
  ],
  "233": [
    { code: "2330", name: "Secondary Education Teachers" },
  ],
  "522": [
    { code: "5221", name: "Shopkeepers" },
    { code: "5222", name: "Shop Supervisors" },
    { code: "5223", name: "Shop Sales Assistants" },
  ],
  "711": [
    { code: "7111", name: "House Builders" },
    { code: "7112", name: "Bricklayers and Related Workers" },
    { code: "7114", name: "Concrete Placers and Finishers" },
    { code: "7115", name: "Carpenters and Joiners" },
  ],
  "741": [
    { code: "7411", name: "Building and Related Electricians" },
    { code: "7412", name: "Electrical Mechanics and Fitters" },
    { code: "7413", name: "Electrical Line Installers and Repairers" },
  ],
  "833": [
    { code: "8331", name: "Bus and Tram Drivers" },
    { code: "8332", name: "Heavy Truck and Lorry Drivers" },
  ],

  // ── Occupation Groups (curated titles for key unit groups) ──
  "2511": [
    { code: "2511-1", name: "Business Systems Analyst" },
    { code: "2511-2", name: "IT Systems Analyst" },
    { code: "2511-3", name: "Solutions Architect" },
  ],
  "2512": [
    { code: "2512-1", name: "Backend Software Developer" },
    { code: "2512-2", name: "Frontend Software Developer" },
    { code: "2512-3", name: "Full Stack Developer" },
    { code: "2512-4", name: "Mobile Application Developer" },
    { code: "2512-5", name: "Embedded Software Engineer" },
  ],
  "2513": [
    { code: "2513-1", name: "Web Developer" },
    { code: "2513-2", name: "UI/UX Developer" },
    { code: "2513-3", name: "Multimedia Developer" },
  ],
  "2514": [
    { code: "2514-1", name: "Applications Programmer" },
    { code: "2514-2", name: "ERP Applications Developer" },
  ],
  "2521": [
    { code: "2521-1", name: "Database Administrator" },
    { code: "2521-2", name: "Data Warehouse Designer" },
  ],
  "2523": [
    { code: "2523-1", name: "Network Engineer" },
    { code: "2523-2", name: "Network Security Engineer" },
  ],
  "3512": [
    { code: "3512-1", name: "IT Help Desk Technician" },
    { code: "3512-2", name: "Desktop Support Technician" },
  ],
  "2221": [
    { code: "2221-1", name: "Registered Nurse" },
    { code: "2221-2", name: "Theatre Nurse" },
    { code: "2221-3", name: "Community Health Nurse" },
  ],
  "2142": [
    { code: "2142-1", name: "Structural Engineer" },
    { code: "2142-2", name: "Highway Engineer" },
    { code: "2142-3", name: "Water Resources Engineer" },
  ],
  "2411": [
    { code: "2411-1", name: "Chartered Accountant" },
    { code: "2411-2", name: "Management Accountant" },
    { code: "2411-3", name: "Audit Associate" },
  ],
  "5223": [
    { code: "5223-1", name: "Retail Sales Assistant" },
    { code: "5223-2", name: "Showroom Sales Assistant" },
  ],
  "7115": [
    { code: "7115-1", name: "Carpenter" },
    { code: "7115-2", name: "Joiner" },
    { code: "7115-3", name: "Formwork Carpenter" },
  ],
  "7411": [
    { code: "7411-1", name: "Building Electrician" },
    { code: "7411-2", name: "Industrial Electrician" },
  ],
  "8332": [
    { code: "8332-1", name: "Container Truck Driver" },
    { code: "8332-2", name: "Long-haul Lorry Driver" },
  ],
};

// Fallback for branches without curated data: three natural-
// looking children. Prefix from any earlier fallback is stripped
// so names don't stack ("Other General …").
const FALLBACK_PREFIXES = ["General", "Specialized", "Other"];

function getChildren(level: number, parent: Node | null): Node[] {
  if (level === 0) return MAJOR_GROUPS;
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
// GET /occupation-groups/:code/stats?from=&to=
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
const DATA_START = new Date(new Date().getFullYear() - 3, 0, 1);
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

// Share of national total captured by a hierarchy path: the major
// group takes its published share; each deeper level narrows it.
const MAJOR_SHARE: Record<string, number> = {
  "1": 0.1,
  "2": 0.27,
  "3": 0.17,
  "4": 0.08,
  "5": 0.15,
  "6": 0.035,
  "7": 0.09,
  "8": 0.055,
  "9": 0.035,
  "0": 0.015,
};

function pathShare(path: Node[]): number {
  if (path.length === 0) return 0;
  let share = MAJOR_SHARE[path[0].code] ?? 0.05;
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

// Skill analysis reference data (mock). The pool covers technical,
// soft, domain and tooling skills so every occupation selection
// surfaces a plausible mix. Replace with real crawler-extracted
// skills from job_post_skills via the API later.
const SKILLS_POOL = [
  "Communication",
  "Teamwork",
  "Leadership",
  "Problem Solving",
  "Time Management",
  "Customer Service",
  "Sales & Negotiation",
  "Project Management",
  "Data Analysis",
  "Microsoft Excel",
  "SQL",
  "Python",
  "JavaScript",
  "React",
  "Cloud Computing (AWS/Azure)",
  "Cybersecurity",
  "Quality Assurance",
  "Digital Marketing",
  "Accounting & Bookkeeping",
  "Supply Chain Management",
  "Machine Operation",
  "Equipment Maintenance",
  "Occupational Health & Safety",
  "English Proficiency",
  "Report Writing",
  "Inventory Management",
  "Negotiation",
  "Attention to Detail",
  "Team Supervision",
  "Vehicle / Forklift Operation",
  "Food Safety & Hygiene",
  "Graphic Design",
];

// Mock employer pool (fictional). Replace with real employer
// aggregation from job_post → company via the API later.
const EMPLOYERS_POOL = [
  "Lanka Tech Solutions (Pvt) Ltd",
  "Ceylon Apparel Group",
  "Island Foods PLC",
  "Serendib Hotels & Resorts",
  "Colombo Financial Services PLC",
  "Global BPO Lanka (Pvt) Ltd",
  "Lak Construction & Engineering",
  "TransLanka Logistics (Pvt) Ltd",
  "Green Valley Plantations PLC",
  "MedCare Hospitals Group",
  "BrightPath Education Network",
  "SoftWave Digital (Pvt) Ltd",
  "Oceanic Trading Company",
  "Metro Retail Holdings",
];

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
function OccupationAnalysis() {
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
  // Starts with the first major group; "+" appends the next level.
  const [path, setPath] = useState<Node[]>([MAJOR_GROUPS[0]]);

  // Active tab of the analytics panel
  const [activeTab, setActiveTab] = useState<"analytics" | "skills">(
    "analytics",
  );

  // View mode of the Analytics tab — chart or table
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
  // powers the breakdown bar chart under the hierarchy card.
  // Major group selected → its sub major groups; sub major
  // selected → its minor groups; and so on. Hidden at level 5
  // (occupation groups have no children).
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

  // ── Skill analysis mock data — all skills with job counts for
  // the selected node + time period. Swap the computation for
  // GET /occupation-*/:code/skills?from=&to= later.
  const skillStats = useMemo(() => {
    return SKILLS_POOL.map((skill) => {
      const h = hash01(deepest.code + "::skill::" + skill);
      return {
        name: skill,
        value: Math.round(nodeTotal * (0.04 + h * 0.3)),
      };
    }).sort((a, b) => b.value - a.value);
  }, [deepest.code, nodeTotal]);

  const topSkills = useMemo(() => skillStats.slice(0, 15), [skillStats]);

  const totalSkillMentions = useMemo(
    () => skillStats.reduce((sum, s) => sum + s.value, 0) || 1,
    [skillStats],
  );

  // Top hiring employers for the selection (mock).
  const topEmployers = useMemo(() => {
    return EMPLOYERS_POOL.map((employer) => {
      const h = hash01(deepest.code + "::employer::" + employer);
      return {
        name: employer,
        value: Math.round(nodeTotal * (0.02 + h * 0.12)),
      };
    })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [deepest.code, nodeTotal]);

  return (
    <div className="min-h-screen w-full min-w-0 bg-zinc-50 text-zinc-800 font-sans">
      {/* Rendered inside the normal layout — sidebar stays visible.
          Back to Dashboard link sits below the header. */}
      {/* HEADER — same as the main dashboard page */}
      <header className="bg-white border-b border-zinc-200 px-4 md:px-8 py-5 sticky top-0 z-40">
        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-black text-zinc-900 tracking-tight truncate">
              Labour Market Demand Dashboard
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              National overview of labour market demand across occupations and
              industries
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-md border border-white shrink-0">
            BJ
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 w-full max-w-[1400px] mx-auto pb-20">
        {/* BACK — plain link, no button styling */}
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

        {/* DATE RANGE FILTER — editable here too; the shared session
            key keeps it in sync with the main dashboard both ways */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="cursor-pointer flex items-center gap-2 bg-zinc-100 px-3 py-2 rounded-xl">
            <label className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-zinc-400">
              From
            </label>
            <input
              type="date"
              value={fromDate}
              min={toISO(DATA_START)}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer bg-transparent text-xs font-bold text-zinc-700 outline-none"
            />
          </div>

          <span
            className="text-zinc-400 font-black text-sm select-none"
            aria-hidden
          >
            →
          </span>

          <div className="cursor-pointer flex items-center gap-2 bg-zinc-100 px-3 py-2 rounded-xl">
            <label className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-zinc-400">
              To
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={toISO(DATA_END)}
              onChange={(e) => setToDate(e.target.value)}
              className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer bg-transparent text-xs font-bold text-zinc-700 outline-none"
            />
          </div>
        </div>

        {/* PAGE TITLE — moved out of the header into the content */}
        <div>
          <h2 className="text-base md:text-lg font-black text-zinc-900 tracking-tight">
            Occupation Analysis (SLSO)
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Analyze through the occupation classification hierarchy
          </p>
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
                      className="cursor-pointer bg-zinc-100 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-700 outline-none border border-transparent focus:border-zinc-300 max-w-[260px] truncate"
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
                className="cursor-pointer mb-0.5 w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white font-black text-base flex items-center justify-center transition-colors"
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
                className="cursor-pointer mb-0.5 w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 font-black text-base flex items-center justify-center transition-colors"
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

          {/* TABS */}
          <div className="px-5 border-b border-zinc-200 flex gap-6">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`cursor-pointer py-3 text-xs font-bold border-b-2 -mb-px transition-colors ${
                activeTab === "analytics"
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("skills")}
              className={`cursor-pointer py-3 text-xs font-bold border-b-2 -mb-px transition-colors ${
                activeTab === "skills"
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Skill Analysis
            </button>
          </div>

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <>
              {/* VIEW TOGGLE — chart or table, applies to the
                  analytics content below */}
              <div className="px-5 py-3 border-b border-zinc-200 flex items-center gap-3">
                <div className="flex bg-zinc-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("chart")}
                    className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      viewMode === "chart"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    Chart View
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
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
                  {/* BREAKDOWN — children of the current selection */}
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
                            <Bar
                              dataKey="value"
                              radius={[4, 4, 0, 0]}
                              barSize={36}
                            >
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
                                  fill={
                                    PROVINCE_COLORS[i % PROVINCE_COLORS.length]
                                  }
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

          {/* SKILL ANALYSIS TAB */}
          {activeTab === "skills" && (
            <div className="p-4 md:p-5 space-y-6">
              {/* 1. TOP 15 IN-DEMAND SKILLS */}
              <div className="border border-zinc-100 p-5 rounded-xl flex flex-col">
                <div className="border-b border-zinc-100 pb-2">
                  <h4 className="text-sm font-bold text-zinc-900">
                    Top 15 In-Demand Skills
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Most requested skills in vacancies under {deepest.name} (
                    {fromDate} → {toDate})
                  </p>
                </div>
                <div className="mt-4 min-w-0" style={{ height: 620 }}>
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
                        width={190}
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

              {/* 2 & 3. ALL SKILLS TABLE + TOP 5 HIRING EMPLOYERS */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="border border-zinc-100 p-5 rounded-xl flex flex-col">
                  <div className="border-b border-zinc-100 pb-2">
                    <h4 className="text-sm font-bold text-zinc-900">
                      All Skills — Job Count
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Every skill extracted from vacancies under {deepest.name}{" "}
                      for the selected period
                    </p>
                  </div>
                  <div className="mt-4 overflow-x-auto max-h-[480px] overflow-y-auto rounded-lg border border-zinc-100">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-zinc-50 z-10">
                        <tr className="border-b border-zinc-200">
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 w-12">
                            #
                          </th>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                            Skill
                          </th>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right">
                            Job Count
                          </th>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 text-right w-24">
                            Share
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {skillStats.map((skill, i) => (
                          <tr
                            key={skill.name}
                            className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-xs font-bold text-zinc-400">
                              {i + 1}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-bold text-zinc-800">
                              {skill.name}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-mono font-bold text-zinc-800 text-right">
                              {skill.value.toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-xs font-mono text-zinc-500 text-right">
                              {(
                                (skill.value / totalSkillMentions) *
                                100
                              ).toFixed(1)}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-zinc-100 p-5 rounded-xl flex flex-col">
                  <div className="border-b border-zinc-100 pb-2">
                    <h4 className="text-sm font-bold text-zinc-900">
                      Top 5 Hiring Employers
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Employers with the most vacancies under {deepest.name}{" "}
                      for the selected period
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {topEmployers.map((employer, i) => (
                      <div
                        key={employer.name}
                        className="flex items-center gap-4 bg-zinc-50 rounded-lg px-4 py-3"
                      >
                        <span className="shrink-0 w-7 h-7 rounded-full bg-zinc-900 text-white text-[11px] font-black flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-3 mb-1.5">
                            <span className="text-xs font-bold text-zinc-800 truncate">
                              {employer.name}
                            </span>
                            <span className="shrink-0 text-xs font-mono font-black text-zinc-900">
                              {employer.value.toLocaleString()} vacancies
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all duration-700"
                              style={{
                                width: `${(employer.value / (topEmployers[0]?.value || 1)) * 100}%`,
                                backgroundColor: C.teal,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// useSearchParams requires a Suspense boundary in the App Router
export default function OccupationAnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <OccupationAnalysis />
    </Suspense>
  );
}