import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has moved. Start your application at /apply." },
    { status: 410 },
  );
}
