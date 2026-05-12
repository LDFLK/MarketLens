"use client";

import { useEffect, useState } from "react";
import { Job } from "@/types/job";
import { fetchJobs } from "@/lib/jobs";
import JobsTable from "@/components/JobsTable";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import JobModal from "@/components/JobModal"; // add

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null); // add

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    fetchJobs(page, debouncedQuery)
      .then((res) => {
        if (cancelled) return;
        setJobs(res.data);
        setTotalPages(res.meta.totalPages);
        setTotal(res.meta.total);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page, debouncedQuery]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Job Vacancies</h1>
      <p className="text-gray-500 mb-6">{total} positions available</p>

      <div className="mb-4">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400">Loading...</p>
      ) : (
        <JobsTable jobs={jobs} onRowClick={setSelectedJob} /> // update
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {/* Modal */}
      <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </main>
  );
}