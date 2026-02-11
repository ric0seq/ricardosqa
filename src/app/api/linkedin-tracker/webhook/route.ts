import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trackedPeople, roleChanges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEventGroup } from "@/lib/parallel";

// POST: Receive webhook from Parallel.ai when a role change is detected
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Parallel sends monitor.event.detected when changes are found
    if (payload.type !== "monitor.event.detected") {
      return NextResponse.json({ received: true });
    }

    const monitorId = payload.data?.monitor_id;
    const eventGroupId = payload.data?.event?.event_group_id;
    const metadata = payload.data?.metadata || {};

    if (!monitorId || !eventGroupId) {
      console.error("Webhook missing monitor_id or event_group_id:", payload);
      return NextResponse.json({ received: true });
    }

    // Look up the tracked person by monitor ID or metadata
    const trackedPersonId = metadata.tracked_person_id;
    let person;

    if (trackedPersonId) {
      [person] = await db
        .select()
        .from(trackedPeople)
        .where(eq(trackedPeople.id, trackedPersonId))
        .limit(1);
    }

    if (!person) {
      // Fallback: look up by parallel monitor ID
      [person] = await db
        .select()
        .from(trackedPeople)
        .where(eq(trackedPeople.parallelMonitorId, monitorId))
        .limit(1);
    }

    if (!person) {
      console.error(
        "Webhook received for unknown person. monitorId:",
        monitorId
      );
      return NextResponse.json({ received: true });
    }

    // Fetch the full event details from Parallel
    let events;
    try {
      const eventGroup = await getEventGroup(monitorId, eventGroupId);
      events = eventGroup.events || [];
    } catch (err) {
      console.error("Failed to fetch event group from Parallel:", err);
      // Still record a basic change even if we can't fetch details
      events = [
        {
          output: "Role change detected (details unavailable)",
          event_date: new Date().toISOString(),
          source_urls: [],
        },
      ];
    }

    // Process each event and create role change records
    for (const event of events) {
      const summary = event.output || "Change detected";
      const sourceUrls = event.source_urls || [];

      // Parse the summary to extract change details
      const changeDetails = parseChangeDetails(summary, person);

      await db.insert(roleChanges).values({
        trackedPersonId: person.id,
        parallelEventGroupId: eventGroupId,
        changeType: changeDetails.changeType,
        previousRole: changeDetails.previousRole || person.currentRole,
        previousCompany:
          changeDetails.previousCompany || person.currentCompany,
        newRole: changeDetails.newRole,
        newCompany: changeDetails.newCompany,
        summary,
        sourceUrls,
        isRead: false,
        detectedAt: event.event_date
          ? new Date(event.event_date)
          : new Date(),
      });

      // Update the tracked person's current info if we have new data
      if (changeDetails.newRole || changeDetails.newCompany) {
        await db
          .update(trackedPeople)
          .set({
            currentRole: changeDetails.newRole || person.currentRole,
            currentCompany:
              changeDetails.newCompany || person.currentCompany,
            lastCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(trackedPeople.id, person.id));
      }
    }

    // Update last checked timestamp
    await db
      .update(trackedPeople)
      .set({ lastCheckedAt: new Date(), updatedAt: new Date() })
      .where(eq(trackedPeople.id, person.id));

    return NextResponse.json({ received: true, eventsProcessed: events.length });
  } catch (error) {
    console.error("Webhook processing error:", error);
    // Return 200 to avoid Parallel retrying on our application errors
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

/** Attempt to extract structured change details from the Parallel event summary */
function parseChangeDetails(
  summary: string,
  person: { currentRole: string | null; currentCompany: string | null }
) {
  const lower = summary.toLowerCase();

  let changeType: string = "title_change";

  if (
    lower.includes("announced") ||
    lower.includes("launched") ||
    lower.includes("unveiled") ||
    lower.includes("stealth")
  ) {
    changeType = "company_announced";
  } else if (
    lower.includes("left") ||
    lower.includes("departed") ||
    lower.includes("leaving")
  ) {
    changeType = "left_company";
  } else if (
    lower.includes("joined") ||
    lower.includes("new role") ||
    lower.includes("started") ||
    lower.includes("appointed")
  ) {
    changeType = "new_role";
  }

  // Extract company and role names from common patterns
  let newRole: string | undefined;
  let newCompany: string | undefined;
  let previousRole: string | undefined;
  let previousCompany: string | undefined;

  // Pattern: "joined [Company] as [Role]"
  const joinedMatch = summary.match(/joined\s+(.+?)\s+as\s+(.+?)(?:\.|,|$)/i);
  if (joinedMatch) {
    newCompany = joinedMatch[1].trim();
    newRole = joinedMatch[2].trim();
    previousRole = person.currentRole || undefined;
    previousCompany = person.currentCompany || undefined;
  }

  // Pattern: "now [Role] at [Company]"
  const nowMatch = summary.match(/now\s+(.+?)\s+at\s+(.+?)(?:\.|,|$)/i);
  if (nowMatch) {
    newRole = nowMatch[1].trim();
    newCompany = nowMatch[2].trim();
  }

  // Pattern: "left [Company]"
  const leftMatch = summary.match(/left\s+(.+?)(?:\s+to|\.|,|$)/i);
  if (leftMatch) {
    previousCompany = leftMatch[1].trim();
  }

  return {
    changeType,
    newRole,
    newCompany,
    previousRole,
    previousCompany,
  };
}
