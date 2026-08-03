import { NextRequest, NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employmentSectorId = searchParams.get("employment_sector_id");

  if (!employmentSectorId) {
    return NextResponse.json(
      { error: "employment_sector_id query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const [
      yearlyTrend
    ] = await Promise.all([
      fetch(`${GO_API}/employment-sectors/yearly-trend?employment_sector_id=${employmentSectorId}`).then((r) => r.json())
    ]);

    return NextResponse.json({
      employment_sector_id: Number(employmentSectorId),
      yearly_trend: yearlyTrend,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch occupation analytics data" },
      { status: 500 }
    );
  }
}