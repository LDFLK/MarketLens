import { NextRequest, NextResponse } from "next/server";
import { Job } from "@/types/job";

const DATA_URL =
  "https://raw.githubusercontent.com/LDFLK/MarketLens/refs/heads/main/research/crawl4ai_research/storage/jobs/jobs.json";

async function getAllJobs(): Promise<Job[]> {
  console.log("Fetching:", DATA_URL);

  const res = await fetch(DATA_URL, {
    cache: "no-store", // bypass cache for debugging
  });

  console.log("Status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("Error body:", text.slice(0, 300));
    throw new Error(`Fetch failed: ${res.status}`);
  }

  const data: Job[] = await res.json();
  console.log("Jobs count:", data.length);
  return data;
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
    console.error("Route error:", err);
    return NextResponse.json(
      { error: String(err) }, // ← now shows real error
      { status: 500 }
    );
  }
}