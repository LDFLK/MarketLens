import { NextRequest, NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

// GET /api/industry/industry-groups/:id/industry-classes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const goUrl = `${GO_API}/industry-groups/${id}/industry-classes`;

  console.log("[industry-groups-industry-classes] fetching from Go:", goUrl);

  try {
    const response = await fetch(goUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("[industry-groups-industry-classes] Go error body:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[industry-groups-industry-classes] fetch failed:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch industry classes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}