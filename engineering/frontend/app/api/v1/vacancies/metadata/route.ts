import { NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

export async function GET() {
  try {
    const [industries, experiences, provinces, jobTypes] = await Promise.all([
      fetch(`${GO_API}/industry-sectors`).then((r) => r.json()),
      fetch(`${GO_API}/experiences`).then((r) => r.json()),
      fetch(`${GO_API}/provinces`).then((r) => r.json()),
      fetch(`${GO_API}/job-types`).then((r) => r.json()),
    ]);

    return NextResponse.json({
      industries: industries.industry_sectors ?? [],
      experiences: experiences.experiences ?? [],
      provinces: provinces.provinces ?? [],
      job_types: jobTypes.job_types ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch vacancy metadata" },
      { status: 500 }
    );
  }
}