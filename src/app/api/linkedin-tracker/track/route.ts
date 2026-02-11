import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trackedPeople } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMonitor, deleteMonitor } from "@/lib/parallel";

// POST: Start tracking a person
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, linkedinUrl, category, currentRole, currentCompany, contactId, notes } = body;

    if (!name || !linkedinUrl || !category) {
      return NextResponse.json(
        { error: "name, linkedinUrl, and category are required" },
        { status: 400 }
      );
    }

    if (!["founder_in_stealth", "operator_at_company"].includes(category)) {
      return NextResponse.json(
        { error: "category must be 'founder_in_stealth' or 'operator_at_company'" },
        { status: 400 }
      );
    }

    // Create the tracked person record first to get the ID
    const [person] = await db
      .insert(trackedPeople)
      .values({
        name,
        linkedinUrl,
        category,
        currentRole: currentRole || null,
        currentCompany: currentCompany || null,
        contactId: contactId || null,
        notes: notes || null,
        monitoringStatus: "active",
      })
      .returning();

    // Create a Parallel.ai monitor
    try {
      const monitor = await createMonitor({
        personName: name,
        linkedinUrl,
        category,
        metadata: {
          tracked_person_id: person.id,
        },
      });

      // Update the record with the monitor ID
      await db
        .update(trackedPeople)
        .set({ parallelMonitorId: monitor.monitor_id })
        .where(eq(trackedPeople.id, person.id));

      return NextResponse.json({
        success: true,
        person: { ...person, parallelMonitorId: monitor.monitor_id },
      });
    } catch (monitorError) {
      // If monitor creation fails, still keep the person record but mark as paused
      console.error("Failed to create Parallel monitor:", monitorError);
      await db
        .update(trackedPeople)
        .set({ monitoringStatus: "paused" })
        .where(eq(trackedPeople.id, person.id));

      return NextResponse.json({
        success: true,
        person: { ...person, monitoringStatus: "paused" },
        warning: "Person saved but Parallel monitor creation failed. Check your PARALLEL_API_KEY.",
      });
    }
  } catch (error) {
    console.error("Track person error:", error);
    return NextResponse.json(
      { error: "Failed to track person" },
      { status: 500 }
    );
  }
}

// DELETE: Stop tracking a person
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 }
      );
    }

    const [person] = await db
      .select()
      .from(trackedPeople)
      .where(eq(trackedPeople.id, id))
      .limit(1);

    if (!person) {
      return NextResponse.json(
        { error: "Tracked person not found" },
        { status: 404 }
      );
    }

    // Delete the Parallel monitor if it exists
    if (person.parallelMonitorId) {
      try {
        await deleteMonitor(person.parallelMonitorId);
      } catch (err) {
        console.error("Failed to delete Parallel monitor:", err);
      }
    }

    // Mark as stopped
    await db
      .update(trackedPeople)
      .set({
        monitoringStatus: "stopped",
        updatedAt: new Date(),
      })
      .where(eq(trackedPeople.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Untrack person error:", error);
    return NextResponse.json(
      { error: "Failed to stop tracking" },
      { status: 500 }
    );
  }
}
