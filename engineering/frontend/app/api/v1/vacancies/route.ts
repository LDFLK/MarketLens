import { NextRequest, NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const industryId   = searchParams.get("industry_id");
  const provinceId   = searchParams.get("geo_data_id");
  const jobTypeId    = searchParams.get("job_type_id");
  const experienceId = searchParams.get("experience_id");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  const goParams = new URLSearchParams();
  if (industryId)    goParams.set("industry_id",   industryId);
  if (provinceId)    goParams.set("geo_data_id",   provinceId);
  if (jobTypeId)     goParams.set("job_type_id",   jobTypeId);
  if (experienceId)  goParams.set("experience_id", experienceId);
  if (limit)         goParams.set("limit", limit);
  if (offset)        goParams.set("offset", offset);    

  const queryString = goParams.toString();
  const goUrl = `${GO_API}/jobs${queryString ? `?${queryString}` : ""}`;

  console.log("[vacancies] fetching from Go:", goUrl);

  try {
    const response = await fetch(goUrl);

    console.log("[vacancies] Go response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[vacancies] Go error body:", errorText);
      return NextResponse.json(
        { error: "Go backend returned an error", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[vacancies] Go response data:", JSON.stringify(data).slice(0, 200));

    return NextResponse.json({
      count: data.count ?? 0,
      jobs:  data.jobs  ?? [],
    });
  } catch (error) {
    // Now we can see the real error
    console.error("[vacancies] fetch failed:", error);
    return NextResponse.json(
      {
        error:   "Failed to fetch vacancies",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}