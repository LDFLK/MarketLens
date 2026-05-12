"use client";

import { Job } from "@/types/job";
import { useEffect } from "react";

interface Props {
  job: Job | null;
  onClose: () => void;
}

export default function JobModal({ job, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (job) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [job]);

  if (!job) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose} // click outside to close
    >
      {/* Modal box — stop click from bubbling to backdrop */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{job.job_role}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{job.employer}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {job.job_type}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
              📍 {job.location}
            </span>
          </div>

          {/* Offers */}
          <Section title="💰 Offers">
            <p className="text-gray-700">{job.offers}</p>
          </Section>

          {/* Key Responsibilities */}
          <Section title="📋 Key Responsibilities">
            <FormattedText text={job.key_responsibilities} />
          </Section>

          {/* Qualifications */}
          <Section title="🎓 Qualifications">
            <FormattedText text={job.qualifications} />
          </Section>

        </div>
      </div>
    </div>
  );
}

// Reusable section wrapper
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}

// Renders text as bullet list if it contains newlines or dashes, otherwise plain text
function FormattedText({ text }: { text: string }) {
  if (!text) return <p className="text-gray-400 italic">Not specified</p>;

  const lines = text
    .split(/\n|•|-(?=\s)/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return <p>{text}</p>;

  return (
    <ul className="space-y-1.5 list-none">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-blue-400 mt-0.5">▸</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}