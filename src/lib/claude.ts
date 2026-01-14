import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  message: string;
  metadata?: {
    type?: string;
    [key: string]: any;
  };
}

const SYSTEM_PROMPT = `You are an AI VC assistant for Ricardo at Point Nine Capital, an early-stage VC firm.

Your role is to help Ricardo:
1. Prioritize founder emails and startup pitches (especially those in the $1M-$9M check size range)
2. Track deals through the pipeline (Inbox → Initial Call → DD → Decision)
3. Analyze pitch decks and documents
4. Prepare for investor calls
5. Draft pass emails with appropriate tone
6. Research markets and competitors
7. Generate investment memos in Ricardo's style

Key context about Ricardo's preferences:
- Check size: $1M-$9M (targeting 20-25% ownership in $12M rounds)
- Prioritization: Referral source matters heavily - stronger relationships = higher priority
- Pass emails: Generic tone, brief, one key reason, offer to stay in touch
- Memos: 2-4 pages, heavily bulleted, opinionated with strong point of view, focused on insights not facts

When responding:
- Be concise and actionable
- Surface relevant information proactively
- Use structured data cards when showing deals, emails, or analysis
- Suggest next steps contextually
- Match Ricardo's direct, no-nonsense communication style

You have access to:
- Gmail (emails, threads, drafts)
- Google Calendar (meetings, scheduling)
- Google Drive (documents, decks)
- Zendesk (primary CRM for deals)
- Attio (relationship management)
- Granola (meeting notes)`;

export async function chat(
  messages: ClaudeMessage[],
  context?: {
    dealId?: string;
    emailId?: string;
    documentId?: string;
  }
): Promise<ClaudeResponse> {
  try {
    // Add context to the last user message if provided
    const enhancedMessages = [...messages];
    if (context && Object.keys(context).length > 0) {
      const lastMessage = enhancedMessages[enhancedMessages.length - 1];
      lastMessage.content = `${lastMessage.content}\n\n[Context: ${JSON.stringify(context)}]`;
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: enhancedMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse the response to extract structured data
    const result = parseClaudeResponse(content.text);

    return result;
  } catch (error) {
    console.error("Claude API error:", error);
    throw error;
  }
}

function parseClaudeResponse(text: string): ClaudeResponse {
  // Check if the response contains structured data markers
  // This is a simple implementation - could be enhanced with more sophisticated parsing

  const result: ClaudeResponse = {
    message: text,
    metadata: {},
  };

  // Try to extract JSON blocks if present
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      result.metadata = data;
      // Remove the JSON block from the message
      result.message = text.replace(/```json\n[\s\S]*?\n```/, "").trim();
    } catch (e) {
      // If parsing fails, just return the text as-is
    }
  }

  return result;
}

// Tool/function definitions for Claude to use
export const CLAUDE_TOOLS = [
  {
    name: "search_gmail",
    description: "Search Gmail for emails matching a query",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query (e.g., 'from:founder@startup.com', 'subject:pitch')",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_calendar_events",
    description: "Get upcoming calendar events",
    input_schema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date (ISO format)",
        },
        endDate: {
          type: "string",
          description: "End date (ISO format)",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "search_deals",
    description: "Search for deals in the CRM",
    input_schema: {
      type: "object",
      properties: {
        stage: {
          type: "string",
          description: "Filter by deal stage",
        },
        sector: {
          type: "string",
          description: "Filter by sector",
        },
        priority: {
          type: "number",
          description: "Filter by priority level (1-5)",
        },
      },
    },
  },
  {
    name: "analyze_document",
    description: "Analyze a document (pitch deck, financials, etc.)",
    input_schema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document ID to analyze",
        },
        analysisType: {
          type: "string",
          description: "Type of analysis (deck_analysis, financial_review, market_analysis)",
        },
      },
      required: ["documentId", "analysisType"],
    },
  },
  {
    name: "draft_pass_email",
    description: "Draft a pass email for a startup",
    input_schema: {
      type: "object",
      properties: {
        dealId: {
          type: "string",
          description: "The deal ID",
        },
        reason: {
          type: "string",
          description: "The main reason for passing",
        },
        detailLevel: {
          type: "string",
          enum: ["brief", "detailed"],
          description: "Level of detail in the pass email",
        },
      },
      required: ["dealId", "reason"],
    },
  },
];
