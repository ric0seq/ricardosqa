import { NextRequest, NextResponse } from "next/server";
import { fetchUpcomingMeetings } from "@/lib/google/calendar";

export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken, startDate, endDate } = await request.json();

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Missing authentication tokens" },
        { status: 401 }
      );
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const meetings = await fetchUpcomingMeetings(accessToken, refreshToken, start, end);

    return NextResponse.json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
