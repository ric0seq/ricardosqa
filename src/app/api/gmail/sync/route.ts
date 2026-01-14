import { NextRequest, NextResponse } from "next/server";
import { fetchAndClassifyEmails } from "@/lib/google/gmail";

export async function POST(request: NextRequest) {
  try {
    // In a real implementation, you'd get these from the user's session
    const { accessToken, refreshToken, query } = await request.json();

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Missing authentication tokens" },
        { status: 401 }
      );
    }

    const emails = await fetchAndClassifyEmails(accessToken, refreshToken, query);

    return NextResponse.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error("Gmail sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync emails" },
      { status: 500 }
    );
  }
}
