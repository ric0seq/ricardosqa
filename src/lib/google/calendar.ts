import { google } from "googleapis";
import { db } from "@/db";
import { meetings, deals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCalendarClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function fetchUpcomingMeetings(
  accessToken: string,
  refreshToken: string,
  startDate: Date,
  endDate: Date
) {
  const calendar = await getCalendarClient(accessToken, refreshToken);

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    const savedMeetings = [];

    for (const event of events) {
      if (!event.start?.dateTime || !event.end?.dateTime) continue;

      const attendees = event.attendees?.map((a) => a.email!).filter(Boolean) || [];

      // Try to match to a deal based on attendee emails
      const matchedDeal = await matchMeetingToDeal(attendees, event.summary || "");

      // Check if meeting already exists
      const [existing] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.googleEventId, event.id!))
        .limit(1);

      if (existing) {
        // Update existing meeting
        await db
          .update(meetings)
          .set({
            title: event.summary || "",
            description: event.description || "",
            startTime: new Date(event.start.dateTime),
            endTime: new Date(event.end.dateTime),
            attendees,
            dealId: matchedDeal?.id || existing.dealId,
            updatedAt: new Date(),
          })
          .where(eq(meetings.id, existing.id));

        savedMeetings.push(existing);
      } else {
        // Create new meeting
        const [newMeeting] = await db
          .insert(meetings)
          .values({
            googleEventId: event.id!,
            dealId: matchedDeal?.id || null,
            title: event.summary || "",
            description: event.description || "",
            startTime: new Date(event.start.dateTime),
            endTime: new Date(event.end.dateTime),
            attendees,
            meetingType: inferMeetingType(event.summary || "", matchedDeal),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        savedMeetings.push(newMeeting);
      }
    }

    return savedMeetings;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw error;
  }
}

async function matchMeetingToDeal(attendees: string[], title: string) {
  // First, try to match by attendee email domains
  for (const email of attendees) {
    const domain = email.split("@")[1];
    if (!domain) continue;

    // Look for deals where the website matches the domain
    const matchedDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.website, `https://${domain}`))
      .limit(1);

    if (matchedDeals.length > 0) {
      return matchedDeals[0];
    }
  }

  // Second, try to match by company name in the meeting title
  const allDeals = await db.select().from(deals);
  for (const deal of allDeals) {
    if (title.toLowerCase().includes(deal.companyName.toLowerCase())) {
      return deal;
    }
  }

  return null;
}

function inferMeetingType(
  title: string,
  deal: any
): "intro_call" | "deep_dive" | "partner_meeting" | undefined {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes("intro") || lowerTitle.includes("initial") || deal?.stage === "Inbox") {
    return "intro_call";
  }

  if (lowerTitle.includes("deep dive") || lowerTitle.includes("dd") || deal?.stage === "DD") {
    return "deep_dive";
  }

  if (lowerTitle.includes("partner") || lowerTitle.includes("team") || deal?.stage === "Partner Review") {
    return "partner_meeting";
  }

  return undefined;
}

export async function prepareForCall(meetingId: string) {
  // Get the meeting details
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);

  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // Get deal details if associated
  let deal = null;
  if (meeting.dealId) {
    [deal] = await db.select().from(deals).where(eq(deals.id, meeting.dealId)).limit(1);
  }

  // Return call prep data
  return {
    meeting: {
      title: meeting.title,
      startTime: meeting.startTime,
      attendees: meeting.attendees || [],
    },
    company: deal
      ? {
          name: deal.companyName,
          website: deal.website || "",
          sector: deal.sector || "",
        }
      : null,
    // Additional context would be added here (founders, referrer, previous interactions, etc.)
  };
}
