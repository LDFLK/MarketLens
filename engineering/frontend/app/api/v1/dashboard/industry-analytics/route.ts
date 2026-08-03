import { NextRequest, NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const industryId = searchParams.get("industry_id");
  const year = searchParams.get("year");

  if (!industryId) {
    return NextResponse.json(
      { error: "industry_id query parameter is required" },
      { status: 400 }
    );
  }

  if (!year) {
    return NextResponse.json(
      { error: "year query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const [
      yearlyTrend,
      byExperience,
      byProvince,
      byEducation,
      byVocationalEducation,
      topEmployers,
    ] = await Promise.all([
      fetch(`${GO_API}/industries/yearly-trend?industry_id=${industryId}`).then((r) => r.json()),
      fetch(`${GO_API}/industries/by-experience?industry_id=${industryId}&year=${year}`).then((r) => r.json()),
      fetch(`${GO_API}/industries/by-province?industry_id=${industryId}&year=${year}`).then((r) => r.json()),
      fetch(`${GO_API}/industries/by-education?industry_id=${industryId}&year=${year}`).then((r) => r.json()),
      fetch(`${GO_API}/industries/by-vocational-education?industry_id=${industryId}&year=${year}`).then((r) => r.json()),
      fetch(`${GO_API}/industries/top-employers?industry_id=${industryId}&year=${year}`).then((r) => r.json()),
    ]);

    return NextResponse.json({
      industry_id: Number(industryId),
      year: Number(year),
      yearly_trend: yearlyTrend,
      by_experience: byExperience,
      by_province: byProvince,
      by_education: byEducation,
      by_vocational_education: byVocationalEducation,
      top_employers: topEmployers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch industry analytics data" },
      { status: 500 }
    );
  }
}