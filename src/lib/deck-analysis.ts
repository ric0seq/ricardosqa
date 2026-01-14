import { chat } from "./claude";
import { db } from "@/db";
import { documents, deals } from "@/db/schema";
import { eq } from "drizzle-orm";

interface DeckAnalysis {
  summary: string;
  highlights: string[];
  concerns: string[];
  keyMetrics: Record<string, string>;
  marketOpportunity: string;
  competitiveLandscape: string;
  team: string;
  recommendation: "strong_pass" | "pass" | "maybe" | "interested" | "excited";
}

export async function analyzeDeck(
  documentId: string,
  documentContent: string
): Promise<DeckAnalysis> {
  const prompt = `You are analyzing a startup pitch deck for Point Nine Capital, an early-stage VC firm.

Analyze this deck and provide:
1. A concise summary (2-3 sentences)
2. Key highlights (3-5 bullet points of what's impressive)
3. Concerns or red flags (3-5 bullet points)
4. Key metrics (ARR, growth rate, CAC, LTV, burn, etc.)
5. Market opportunity assessment
6. Competitive landscape
7. Team evaluation
8. Overall recommendation (strong_pass, pass, maybe, interested, excited)

Point Nine's investment criteria:
- Check size: $1M-$9M
- Target ownership: 20-25%
- Stage: Early-stage B2B SaaS primarily
- Focus on strong unit economics, product-market fit signals, and exceptional founders

Deck content:
${documentContent}

Respond in JSON format:
{
  "summary": string,
  "highlights": string[],
  "concerns": string[],
  "keyMetrics": {
    "ARR": string,
    "Growth Rate": string,
    "CAC": string,
    "LTV": string,
    etc.
  },
  "marketOpportunity": string,
  "competitiveLandscape": string,
  "team": string,
  "recommendation": "strong_pass" | "pass" | "maybe" | "interested" | "excited"
}`;

  const response = await chat([
    {
      role: "user",
      content: prompt,
    },
  ]);

  // Extract JSON from response
  const jsonMatch = response.message.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse deck analysis");
  }

  const analysis: DeckAnalysis = JSON.parse(jsonMatch[0]);

  // Save analysis to database
  await db
    .update(documents)
    .set({
      aiAnalysis: JSON.stringify(analysis),
      analyzedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  return analysis;
}

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  // In a real implementation, you'd use a PDF parsing library like pdf-parse
  // For now, return a placeholder
  return "PDF text extraction would go here. Integrate with pdf-parse or similar library.";
}

export async function uploadDeck(
  dealId: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  // In a real implementation, upload to Google Cloud Storage
  // For now, create a database record

  const [document] = await db
    .insert(documents)
    .values({
      dealId,
      name: fileName,
      type: "deck",
      url: `/uploads/${fileName}`, // Placeholder
      sizeBytes: fileBuffer.length,
      mimeType,
      createdAt: new Date(),
    })
    .returning();

  return document.id;
}
