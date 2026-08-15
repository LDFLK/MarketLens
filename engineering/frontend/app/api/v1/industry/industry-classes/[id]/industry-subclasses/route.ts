import { NextRequest, NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

// GET /api/industry/industry-classes/:id/industry-subclasses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const goUrl = `${GO_API}/industry-classes/${id}/industry-subclasses`;

  console.log("[industry-classes-industry-subclasses] fetching from Go:", goUrl);

  try {
    const response = await fetch(goUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("[industry-classes-industry-subclasses] Go error body:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[industry-classes-industry-subclasses] fetch failed:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch industry subclasses",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}