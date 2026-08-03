"use client";

import { useState, useMemo } from "react";
import { useCrawlerOverview } from "@/hooks/use-crawler";
import Header from "@/components/layout/Header";

export default function CrawlingDetailsPage() {
  const { data, isLoading, isError } = useCrawlerOverview();

  const getStatusStyle = (status: string) => {
    if (status === "RUNNING")
      return "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
    if (status === "FAILED") return "bg-red-50 text-red-700 border-red-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  if (isLoading) return <div className="p-10 text-center">Loading...</div>;
  if (isError || !data)
    return (
      <div className="p-10 text-center text-red-500">Error loading data.</div>
    );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      {/* HEADER */}
      <Header
        title="Crawling Operations & Details"
        subtitle="Real-time visibility into engine scraping nodes, live pipelines, and database integration."
      />

      <div className="p-8 space-y-8 max-w-[1650px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400">
              Latest Total Crawled
            </p>
            <h3 className="text-3xl font-black text-blue-600">
              {data.kpis.last_crawl_job_count.toLocaleString()}
            </h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400">
              Active Sources
            </p>
            <h3 className="text-3xl font-black text-zinc-900">
              {data.sources.length}
            </h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400">
              Engine Last Run
            </p>
            <h3 className="text-lg font-black text-zinc-800">
              {data.kpis.gap_human}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 lg:col-span-2">
            <h3 className="text-sm font-bold mb-4">Sources Breakdown</h3>
            <table className="w-full text-left">
              <tbody>
                {data.sources.map((src) => (
                  <tr key={src.id} className="border-b border-gray-50">
                    <td className="py-3 text-xs text-gray-400 font-mono">
                      #{src.id}
                    </td>
                    <td className="py-3 text-sm font-bold">{src.source}</td>
                    <td className="py-3 text-sm text-right font-black">
                      {src.open_job_count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 lg:col-span-3">
            <h3 className="text-sm font-bold mb-4">Crawling Activity Log</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b border-gray-100">
                  <th className="pb-3">Run ID</th>
                  <th className="pb-3">Start Time</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.crawler_runs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50">
                    <td className="py-3 text-xs font-mono">{log.id}</td>
                    <td className="py-3 text-xs text-gray-500">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusStyle(log.status)}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
