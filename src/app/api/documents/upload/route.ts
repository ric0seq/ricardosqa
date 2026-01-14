import { NextRequest, NextResponse } from "next/server";
import { uploadDeck, analyzeDeck, extractTextFromPDF } from "@/lib/deck-analysis";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const dealId = formData.get("dealId") as string;
    const autoAnalyze = formData.get("autoAnalyze") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!dealId) {
      return NextResponse.json({ error: "No deal ID provided" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload the file
    const documentId = await uploadDeck(dealId, file.name, buffer, file.type);

    // Optionally analyze immediately
    let analysis = null;
    if (autoAnalyze) {
      const text = await extractTextFromPDF(buffer);
      analysis = await analyzeDeck(documentId, text);
    }

    return NextResponse.json({
      success: true,
      documentId,
      analysis,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
