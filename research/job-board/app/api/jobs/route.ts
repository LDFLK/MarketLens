import { NextRequest, NextResponse } from "next/server";
import { Job } from "@/types/job";

const DATA_URL =
  "https://raw.githubusercontent.com/LDFLK/MarketLens/refs/heads/main/storage/jobs/jobs.json";

let cachedJobs: Job[] | null = null;

async function getAllJobs(): Promise<Job[]> {
  if (cachedJobs) return cachedJobs;

  const res = await fetch(DATA_URL, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error("Failed to fetch jobs");

  const data: Job[] = await res.json();
  cachedJobs = data;
  return cachedJobs;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const query = searchParams.get("q")?.toLowerCase() || "";

  try {
    let jobs: Job[] = await getAllJobs();

    if (query) {
      jobs = jobs.filter(
        (job) =>
          job.job_role?.toLowerCase().includes(query) ||
          job.employer?.toLowerCase().includes(query) ||
          job.location?.toLowerCase().includes(query) ||
          job.job_type?.toLowerCase().includes(query)
      );
    }

    const total = jobs.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = jobs.slice(start, start + limit);

    return NextResponse.json({
      data: paginated,
      meta: { total, page, totalPages, limit },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}