"use client";

import { useState, useMemo, useEffect } from "react";
import { useVacancyMetadata, useVacancies } from "@/hooks/use-vacancies";
import { Vacancy } from "@/types/vacancy";
import Header from "@/components/layout/Header";


export default function VacanciesPage() {

  const [search,       setSearch]       = useState("");
  const [industryId,   setIndustryId]   = useState<number | undefined>();
  const [provinceId,   setProvinceId]   = useState<number | undefined>();
  const [jobTypeId,    setJobTypeId]    = useState<number | undefined>();
  const [experienceId, setExperienceId] = useState<number | undefined>();
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: metadata,    isLoading: isMetaLoading, isError: isMetaError } = useVacancyMetadata();
  const { data: vacancyData, isLoading: isListLoading, isError: isListError  } = useVacancies({
    industry_id:   industryId,
    geo_data_id:   provinceId,
    job_type_id:   jobTypeId,
    experience_id: experienceId,
    limit:  PAGE_SIZE + 1,
    offset: (page - 1) * PAGE_SIZE,
  });

  const rawJobs = vacancyData?.jobs ?? [];
  const hasNextPage = rawJobs.length > PAGE_SIZE;
  const pageJobs = hasNextPage ? rawJobs.slice(0, PAGE_SIZE) : rawJobs;

  const filteredVacancies = useMemo(() => {
    const all = pageJobs;
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (v) => v.job_role.toLowerCase().includes(q) || v.employer.name.toLowerCase().includes(q),
    );
  }, [pageJobs, search]);

  useEffect(() => {
    setPage(1);
  }, [industryId, provinceId, jobTypeId, experienceId]);

  const isLoading = isMetaLoading || isListLoading;
  const isError   = isMetaError   || isListError;

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-400 font-medium">Syncing Workspace Data via BFF...</p>
      </div>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-red-500 font-medium">Failed to connect to backend.</p>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 text-gray-800 font-sans flex flex-col overflow-hidden">

      {/* HEADER */}
      <Header
        title="Vacancy Explorer"
        subtitle="vacancies synchronized from job postings web sites"
      />

      {/* ROOT SPLIT LAYOUT */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: MAIN SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-6">

            {/* FILTER BAR */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Search role or employer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
              />
              <select
                value={industryId ?? ""}
                onChange={(e) => setIndustryId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm max-w-[180px]"
              >
                <option value="">All Industries</option>
                {metadata?.industries.map((ind) => (
                  <option key={ind.id} value={ind.id}>{ind.name}</option>
                ))}
              </select>
              <select
                value={provinceId ?? ""}
                onChange={(e) => setProvinceId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">All Provinces</option>
                {metadata?.provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.province}</option>
                ))}
              </select>
              <select
                value={jobTypeId ?? ""}
                onChange={(e) => setJobTypeId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">All Job Types</option>
                {metadata?.job_types.map((jt) => (
                  <option key={jt.id} value={jt.id}>{jt.type}</option>
                ))}
              </select>
              <select
                value={experienceId ?? ""}
                onChange={(e) => setExperienceId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">All Experience Levels</option>
                {metadata?.experiences.map((exp) => (
                  <option key={exp.id} value={exp.id}>{exp.name}</option>
                ))}
              </select>
            </div>

            {/* VACANCIES TABLE */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-gray-50/70">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500">No.</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500">Job Role</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500">Employer</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500">Province</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500">Work Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVacancies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-sm text-gray-400">No active listings found.</td>
                    </tr>
                  ) : (
                    filteredVacancies.map((v, index) => (
                      <tr
                        key={v.id}
                        onClick={() => setSelectedVacancy(v)}
                        className={`border-b cursor-pointer transition-colors ${
                          selectedVacancy?.id === v.id
                            ? "bg-blue-50 border-l-2 border-l-blue-500"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <td className="py-3.5 px-4 text-xs text-gray-400 font-mono">{index + 1}</td>
                        <td className="py-3.5 px-4 text-sm font-semibold text-zinc-900">{v.job_role}</td>
                        <td className="py-3.5 px-4 text-sm text-gray-700">{v.employer.name}</td>
                        <td className="py-3.5 px-4 text-sm text-gray-500">{v.meta_data.geo_data.province}</td>
                        <td className="py-3.5 px-4 text-sm">
                          {v.is_remote
                            ? <span className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded-full">Remote Available</span>
                            : <span className="text-gray-400 text-xs">Office Based</span>
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-400">Page {page}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNextPage}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT: DETAIL PANEL (inline, not overlay) */}
        {selectedVacancy && (
          <div className="w-[420px] min-w-[420px] border-l border-gray-200 bg-white flex flex-col overflow-hidden shadow-lg">

            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start shrink-0">
              <div className="flex-1 pr-3">
                <h2 className="text-sm font-black text-gray-900 leading-snug">{selectedVacancy.job_role}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Posted: {new Date(selectedVacancy.meta_data.posted_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedVacancy(null)}
                className="shrink-0 text-xs font-bold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all"
              >
                Close ✕
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Employer"   value={selectedVacancy.employer.name} />
                <DetailItem label="Work Mode"     value= {selectedVacancy.is_remote ? "Remote Available" : "Office Based"} />
                <DetailItem label="Location"   value={selectedVacancy.location} />
                <DetailItem label="Job Type"    value={selectedVacancy.job_type.type} />
                {/* <DetailItem label="Industry"   value={selectedVacancy.meta_data.industry.name} /> */}
                <DetailItem label="Experience" value={selectedVacancy.meta_data.experience.name} />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Description */}
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Description</p>
                <p className="text-xs text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed">
                  {selectedVacancy.job_description || "N/A"}
                </p>
              </div>

              {/* Skills */}
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-3">Description</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVacancy.skills.length > 0
                    ? selectedVacancy.skills.map((s) => (
                        <span key={s.id} className="px-3 py-1 bg-zinc-100 text-[11px] font-bold rounded-full text-zinc-700">
                          {s.skill}
                        </span>
                      ))
                    : <span className="text-xs text-gray-400">No skills listed</span>
                  }
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 px-3 py-2.5 rounded-lg">
      <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider">{label}</p>
      <p className="text-xs font-bold text-zinc-800 mt-0.5 truncate">{value || "N/A"}</p>
    </div>
  );
}