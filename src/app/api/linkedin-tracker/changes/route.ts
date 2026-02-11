import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { roleChanges, trackedPeople } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// GET: List role changes, optionally filtered by person
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const conditions = [];
    if (personId) {
      conditions.push(eq(roleChanges.trackedPersonId, personId));
    }
    if (unreadOnly) {
      conditions.push(eq(roleChanges.isRead, false));
    }

    const changes = conditions.length > 0
      ? await db
          .select({
            change: roleChanges,
            personName: trackedPeople.name,
            linkedinUrl: trackedPeople.linkedinUrl,
            category: trackedPeople.category,
          })
          .from(roleChanges)
          .innerJoin(trackedPeople, eq(roleChanges.trackedPersonId, trackedPeople.id))
          .where(sql`${sql.join(conditions, sql` AND `)}`)
          .orderBy(desc(roleChanges.detectedAt))
          .limit(limit)
      : await db
          .select({
            change: roleChanges,
            personName: trackedPeople.name,
            linkedinUrl: trackedPeople.linkedinUrl,
            category: trackedPeople.category,
          })
          .from(roleChanges)
          .innerJoin(trackedPeople, eq(roleChanges.trackedPersonId, trackedPeople.id))
          .orderBy(desc(roleChanges.detectedAt))
          .limit(limit);

    return NextResponse.json({
      success: true,
      changes,
      total: changes.length,
    });
  } catch (error) {
    console.error("List role changes error:", error);
    return NextResponse.json(
      { error: "Failed to list role changes" },
      { status: 500 }
    );
  }
}

// PATCH: Mark changes as read
export async function PATCH(request: NextRequest) {
  try {
    const { changeIds } = await request.json();

    if (!changeIds || !Array.isArray(changeIds) || changeIds.length === 0) {
      return NextResponse.json(
        { error: "changeIds array is required" },
        { status: 400 }
      );
    }

    await db
      .update(roleChanges)
      .set({ isRead: true })
      .where(sql`${roleChanges.id} IN ${changeIds}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark changes read error:", error);
    return NextResponse.json(
      { error: "Failed to mark changes as read" },
      { status: 500 }
    );
  }
}
