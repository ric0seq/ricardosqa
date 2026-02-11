import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trackedPeople, roleChanges } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// GET: List all tracked people with their latest change info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // active, paused, stopped
    const category = searchParams.get("category"); // founder_in_stealth, operator_at_company

    let query = db.select().from(trackedPeople);

    const conditions = [];
    if (status) {
      conditions.push(eq(trackedPeople.monitoringStatus, status));
    }
    if (category) {
      conditions.push(eq(trackedPeople.category, category));
    }

    const people = conditions.length > 0
      ? await query.where(sql`${sql.join(conditions, sql` AND `)}`)
          .orderBy(desc(trackedPeople.createdAt))
      : await query.orderBy(desc(trackedPeople.createdAt));

    // Get unread change counts for each person
    const peopleWithCounts = await Promise.all(
      people.map(async (person) => {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(roleChanges)
          .where(
            sql`${roleChanges.trackedPersonId} = ${person.id} AND ${roleChanges.isRead} = false`
          );

        const [latestChange] = await db
          .select()
          .from(roleChanges)
          .where(eq(roleChanges.trackedPersonId, person.id))
          .orderBy(desc(roleChanges.detectedAt))
          .limit(1);

        return {
          ...person,
          unreadChanges: Number(countResult?.count || 0),
          latestChange: latestChange || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      people: peopleWithCounts,
      total: peopleWithCounts.length,
    });
  } catch (error) {
    console.error("List tracked people error:", error);
    return NextResponse.json(
      { error: "Failed to list tracked people" },
      { status: 500 }
    );
  }
}
