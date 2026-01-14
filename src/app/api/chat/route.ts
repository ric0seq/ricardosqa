import { NextRequest, NextResponse } from "next/server";
import { chat, type ClaudeMessage } from "@/lib/claude";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, dealId, userId = "default-user" } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Convert to Claude message format
    const claudeMessages: ClaudeMessage[] = messages
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

    // Get response from Claude
    const response = await chat(claudeMessages, { dealId });

    // Save the user message to database
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage.role === "user") {
      await db.insert(chatMessages).values({
        userId,
        dealId: dealId || null,
        role: "user",
        content: lastUserMessage.content,
        createdAt: new Date(),
      });
    }

    // Save the assistant response to database
    await db.insert(chatMessages).values({
      userId,
      dealId: dealId || null,
      role: "assistant",
      content: response.message,
      metadata: response.metadata,
      createdAt: new Date(),
    });

    // Return enhanced response with suggested actions
    const suggestedActions = generateSuggestedActions(response.message, response.metadata);

    return NextResponse.json({
      message: response.message,
      metadata: {
        ...response.metadata,
        suggestedActions,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

function generateSuggestedActions(message: string, metadata?: any): string[] {
  // Generate contextual suggested actions based on the conversation
  const suggestions: string[] = [];

  // Check for deal-related keywords
  if (message.toLowerCase().includes("deal") || message.toLowerCase().includes("company")) {
    suggestions.push("Show me more details about this company");
    suggestions.push("Analyze their pitch deck");
  }

  // Check for email-related keywords
  if (message.toLowerCase().includes("email") || message.toLowerCase().includes("inbox")) {
    suggestions.push("Show me my high-priority inbox");
    suggestions.push("Help me draft a response");
  }

  // Check for meeting-related keywords
  if (message.toLowerCase().includes("call") || message.toLowerCase().includes("meeting")) {
    suggestions.push("What calls do I have this week?");
    suggestions.push("Prepare me for my next call");
  }

  // Check for research-related keywords
  if (message.toLowerCase().includes("market") || message.toLowerCase().includes("research")) {
    suggestions.push("Research the market opportunity");
    suggestions.push("Who are the key competitors?");
  }

  // Default suggestions if none match
  if (suggestions.length === 0) {
    suggestions.push(
      "Show me my high-priority inbox",
      "What calls do I have this week?",
      "Show me active deals"
    );
  }

  return suggestions.slice(0, 3); // Return max 3 suggestions
}
