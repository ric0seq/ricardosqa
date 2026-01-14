import { NextRequest, NextResponse } from "next/server";
import { analyzeDeck, extractTextFromPDF } from "@/lib/deck-analysis";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "No document ID provided" },
        { status: 400 }
      );
    }

    // Get document from database
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // In a real implementation, fetch the file from storage
    // For now, use placeholder text
    const text = "Document content would be fetched from storage here";

    const analysis = await analyzeDeck(documentId, text);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Document analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}
