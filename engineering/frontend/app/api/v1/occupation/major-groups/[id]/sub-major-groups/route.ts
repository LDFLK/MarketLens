import { NextRequest, NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

// GET /api/occupation/major-groups/:id/sub-major-groups
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const goUrl = `${GO_API}/major-groups/${id}/sub-major-groups`;

  console.log("[major-groups-sub-major-groups] fetching from Go:", goUrl);

  try {
    const response = await fetch(goUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("[major-groups-sub-major-groups] Go error body:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[major-groups-sub-major-groups] fetch failed:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sub major groups",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}