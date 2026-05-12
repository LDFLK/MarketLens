"use client";

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 justify-end mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
      >
        ← Prev
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
      >
        Next →
      </button>
    </div>
  );
}