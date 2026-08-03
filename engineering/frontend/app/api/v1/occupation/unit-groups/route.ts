import { NextRequest, NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

// Get all unit groups 
export async function GET() {
  const goUrl = `${GO_API}/unit-groups`;

  console.log("[unit-groups] fetching from Go:", goUrl);

  try {
    const response = await fetch(goUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[unit-groups] Go error body:", errorText);
      return NextResponse.json(
        { error: "Go backend returned an error", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[unit-groups] fetch failed:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch unit groups",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Create new unit group
export async function POST(request: NextRequest) {
  const goUrl = `${GO_API}/unit-groups`;

  try {
    const body = await request.json();

    const response = await fetch(goUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[unit-groups] Go error body:", data);
      return NextResponse.json(
        { error: "Go backend returned an error", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[unit-groups] create failed:", error);
    return NextResponse.json(
      {
        error: "Failed to create unit group",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}