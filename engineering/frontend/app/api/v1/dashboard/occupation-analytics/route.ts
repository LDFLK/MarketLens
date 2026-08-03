import { NextRequest, NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const occupationId = searchParams.get("occupation_id");
  const year = searchParams.get("year");

  if (!occupationId) {
    return NextResponse.json(
      { error: "occupation_id query parameter is required" },
      { status: 400 }
    );
  }

  if (!year) {
    return NextResponse.json(
      { error: "year query parameter is required" },
      { status: 400 }
    )
  }

  try {
    const [
      yearlyTrend, 
      byFormality,
      byGender,
      topJobRoles
    ] = await Promise.all([
      fetch(`${GO_API}/occupations/yearly-trend?occupation_id=${occupationId}`).then((r) => r.json()),
      fetch(`${GO_API}/occupations/by-formality?occupation_id=${occupationId}&year=${year}`).then((r) => r.json()),
      fetch(`${GO_API}/occupations/by-gender?occupation_id=${occupationId}&year=${year}`).then((r) => r.json()),
      fetch(`${GO_API}/occupations/top-job-roles?occupation_id=${occupationId}&year=${year}`).then((r) => r.json()),
    ]);

    return NextResponse.json({
      occupation_id: Number(occupationId),
      yearly_trend: yearlyTrend,
      by_formality: byFormality,
      by_gender: byGender,
      top_job_roles: topJobRoles,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch occupation analytics data" },
      { status: 500 }
    );
  }
}