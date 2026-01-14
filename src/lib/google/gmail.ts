import { google } from "googleapis";
import { db } from "@/db";
import { emails, deals, contacts } from "@/db/schema";
import { chat } from "@/lib/claude";
import { eq } from "drizzle-orm";

export async function getGmailClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function fetchAndClassifyEmails(
  accessToken: string,
  refreshToken: string,
  query: string = "is:unread"
) {
  const gmail = await getGmailClient(accessToken, refreshToken);

  try {
    // Search for emails
    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50,
    });

    const messages = response.data.messages || [];
    const classifiedEmails = [];

    for (const message of messages) {
      const email = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });

      const headers = email.data.payload?.headers || [];
      const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
      const toHeader = headers.find((h) => h.name?.toLowerCase() === "to");
      const subjectHeader = headers.find((h) => h.name?.toLowerCase() === "subject");
      const dateHeader = headers.find((h) => h.name?.toLowerCase() === "date");

      const from = fromHeader?.value || "";
      const to = toHeader?.value || "";
      const subject = subjectHeader?.value || "";
      const snippet = email.data.snippet || "";

      // Get full body
      const body = extractEmailBody(email.data);

      // Classify the email using Claude
      const classification = await classifyEmail({
        from,
        subject,
        snippet,
        body,
      });

      // Save to database
      const savedEmail = await db
        .insert(emails)
        .values({
          gmailMessageId: email.data.id!,
          gmailThreadId: email.data.threadId!,
          from,
          to,
          subject,
          snippet,
          body,
          receivedAt: new Date(dateHeader?.value || Date.now()),
          isFounderEmail: classification.isFounderEmail,
          isPriority: classification.isPriority,
          classification: classification.type,
          extractedData: classification.extractedData,
          createdAt: new Date(),
        })
        .returning();

      classifiedEmails.push({
        ...savedEmail[0],
        classification,
      });

      // If it's a founder email, try to match or create a deal
      if (classification.isFounderEmail && classification.extractedData.companyName) {
        await matchOrCreateDeal(
          classification.extractedData.companyName,
          classification.extractedData,
          from,
          savedEmail[0].id
        );
      }
    }

    return classifiedEmails;
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
}

function extractEmailBody(emailData: any): string {
  let body = "";

  function extractParts(parts: any[]) {
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body += Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/html" && part.body?.data && !body) {
        // Fallback to HTML if no plain text
        body += Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        extractParts(part.parts);
      }
    }
  }

  if (emailData.payload?.body?.data) {
    body = Buffer.from(emailData.payload.body.data, "base64").toString("utf-8");
  } else if (emailData.payload?.parts) {
    extractParts(emailData.payload.parts);
  }

  return body;
}

interface EmailClassification {
  isFounderEmail: boolean;
  isPriority: boolean;
  type: "pitch" | "follow_up" | "question" | "update" | "pass" | "other";
  extractedData: {
    companyName?: string;
    stage?: string;
    sector?: string;
    askAmount?: string;
  };
}

async function classifyEmail(email: {
  from: string;
  subject: string;
  snippet: string;
  body: string;
}): Promise<EmailClassification> {
  const prompt = `Classify this email for a VC. Determine:
1. Is this from a founder pitching or following up on a fundraise?
2. Should this be high priority? (check if they mention referral sources, or if the ask is in the $1M-$9M range)
3. What type of email is this? (pitch, follow_up, question, update, pass, other)
4. Extract key data: company name, stage, sector, ask amount

Email:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.snippet}

Respond in JSON format:
{
  "isFounderEmail": boolean,
  "isPriority": boolean,
  "type": "pitch" | "follow_up" | "question" | "update" | "pass" | "other",
  "extractedData": {
    "companyName": string or null,
    "stage": string or null,
    "sector": string or null,
    "askAmount": string or null
  },
  "reasoning": string
}`;

  try {
    const response = await chat([
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Try to extract JSON from the response
    const jsonMatch = response.message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const classification = JSON.parse(jsonMatch[0]);
      return classification;
    }
  } catch (error) {
    console.error("Error classifying email:", error);
  }

  // Fallback classification
  return {
    isFounderEmail: false,
    isPriority: false,
    type: "other",
    extractedData: {},
  };
}

async function matchOrCreateDeal(
  companyName: string,
  extractedData: any,
  founderEmail: string,
  emailId: string
) {
  // Check if deal already exists
  const existingDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.companyName, companyName))
    .limit(1);

  if (existingDeals.length > 0) {
    // Update the email with the deal ID
    await db.update(emails).set({ dealId: existingDeals[0].id }).where(eq(emails.id, emailId));
    return existingDeals[0];
  }

  // Create new deal
  const newDeal = await db
    .insert(deals)
    .values({
      companyName,
      stage: "Inbox",
      sector: extractedData.sector || "Unknown",
      checkSize: extractedData.askAmount ? parseCheckSize(extractedData.askAmount) : undefined,
      priority: 3, // Default priority
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // Update the email with the deal ID
  await db.update(emails).set({ dealId: newDeal[0].id }).where(eq(emails.id, emailId));

  // Create contact for the founder
  const [existingContact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.email, founderEmail))
    .limit(1);

  if (!existingContact) {
    await db.insert(contacts).values({
      email: founderEmail,
      name: extractEmailName(founderEmail),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return newDeal[0];
}

function parseCheckSize(askAmount: string): number {
  // Extract number from string like "$2M", "2 million", etc.
  const match = askAmount.match(/(\d+\.?\d*)\s*(m|million|k|thousand)?/i);
  if (match) {
    const amount = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();

    if (unit === "m" || unit === "million") {
      return amount * 1000000;
    } else if (unit === "k" || unit === "thousand") {
      return amount * 1000;
    }
    return amount;
  }
  return 0;
}

function extractEmailName(email: string): string {
  // Extract name from email like "John Doe <john@example.com>"
  const match = email.match(/^([^<]+)</);
  if (match) {
    return match[1].trim();
  }
  // Or just use the part before @ if no name
  return email.split("@")[0].replace(/[._]/g, " ");
}

export async function draftPassEmail(
  dealId: string,
  reason: string,
  detailLevel: "brief" | "detailed" = "brief"
): Promise<string> {
  // Get deal information
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

  if (!deal) {
    throw new Error("Deal not found");
  }

  const prompt = `Draft a ${detailLevel} pass email for ${deal.companyName}.

Context:
- Company: ${deal.companyName}
- Stage: ${deal.stage}
- Sector: ${deal.sector}
- Pass reason: ${reason}

Ricardo's style:
${
  detailLevel === "detailed"
    ? `
- Start with an apology for the delay if there was one
- Thank them for their time and acknowledge their responsiveness
- Compliment the founders
- Explain the reasoning clearly but kindly
- Offer to share references/intros made during DD
- Offer a call to explain more
- Wish them well and say you hope they prove you wrong
`
    : `
- Brief and kind
- One-line reason: "couldn't get to conviction to lead"
- Offer to stay in touch and be a sparring partner
`
}

Write the email:`;

  const response = await chat([
    {
      role: "user",
      content: prompt,
    },
  ]);

  return response.message;
}
