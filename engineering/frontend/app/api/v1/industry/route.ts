import { NextResponse } from "next/server";

const GO_API = process.env.GO_BACKEND_URL;

export async function GET() {
  try {
    const response = await fetch(`${GO_API}/industry-sectors`);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch industries from Go backend", details: await response.text() },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      count:      data.count      ?? 0,
      industries: data.industry_sectors ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:   "Failed to fetch industries",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}