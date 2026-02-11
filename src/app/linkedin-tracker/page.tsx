"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Bell, Filter } from "lucide-react";
import { AddPersonDialog } from "@/components/linkedin-tracker/add-person-dialog";
import { PersonCard } from "@/components/linkedin-tracker/person-card";
import { ChangeFeed } from "@/components/linkedin-tracker/change-feed";
import type { TrackedPerson, RoleChange } from "@/types";

type ViewMode = "people" | "changes" | "person-changes";

export default function LinkedInTrackerPage() {
  const [people, setPeople] = useState<TrackedPerson[]>([]);
  const [changes, setChanges] = useState<Array<{
    change: RoleChange;
    personName: string;
    linkedinUrl: string;
    category: string;
  }>>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("people");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPeople = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("status", "active");

      const res = await fetch(`/api/linkedin-tracker/people?${params}`);
      const data = await res.json();
      if (data.success) {
        setPeople(data.people);
      }
    } catch (err) {
      console.error("Failed to fetch tracked people:", err);
    }
  }, [categoryFilter]);

  const fetchChanges = useCallback(async (personId?: string) => {
    try {
      const params = new URLSearchParams();
      if (personId) params.set("personId", personId);

      const res = await fetch(`/api/linkedin-tracker/changes?${params}`);
      const data = await res.json();
      if (data.success) {
        setChanges(data.changes);
      }
    } catch (err) {
      console.error("Failed to fetch changes:", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPeople(), fetchChanges()]).finally(() => setLoading(false));
  }, [fetchPeople, fetchChanges]);

  async function handleStopTracking(id: string) {
    if (!confirm("Stop tracking this person? This will delete the Parallel.ai monitor.")) return;

    try {
      const res = await fetch(`/api/linkedin-tracker/track?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPeople();
      }
    } catch (err) {
      console.error("Failed to stop tracking:", err);
    }
  }

  function handleViewChanges(personId: string) {
    setSelectedPersonId(personId);
    setViewMode("person-changes");
    fetchChanges(personId);
  }

  async function handleMarkRead(changeIds: string[]) {
    try {
      await fetch("/api/linkedin-tracker/changes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeIds }),
      });
      // Refresh
      if (selectedPersonId) {
        fetchChanges(selectedPersonId);
      } else {
        fetchChanges();
      }
      fetchPeople();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }

  const totalUnread = people.reduce((sum, p) => sum + (p.unreadChanges || 0), 0);
  const founderCount = people.filter((p) => p.category === "founder_in_stealth").length;
  const operatorCount = people.filter((p) => p.category === "operator_at_company").length;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">LinkedIn Tracker</h1>
            <p className="text-sm text-muted-foreground">
              Monitor role changes for founders and operators
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "changes" ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setViewMode("changes");
                setSelectedPersonId(null);
                fetchChanges();
              }}
            >
              <Bell className="h-4 w-4 mr-1.5" />
              Changes
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-xs h-5 min-w-[20px]">
                  {totalUnread}
                </Badge>
              )}
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Track Person
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{people.length}</span>
          <span className="text-muted-foreground">tracked</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex gap-2">
          <Button
            variant={categoryFilter === null ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCategoryFilter(null)}
          >
            All
          </Button>
          <Button
            variant={categoryFilter === "founder_in_stealth" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCategoryFilter(
              categoryFilter === "founder_in_stealth" ? null : "founder_in_stealth"
            )}
          >
            Founders ({founderCount})
          </Button>
          <Button
            variant={categoryFilter === "operator_at_company" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCategoryFilter(
              categoryFilter === "operator_at_company" ? null : "operator_at_company"
            )}
          >
            Operators ({operatorCount})
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : viewMode === "people" ? (
          <div className="space-y-3 max-w-3xl">
            {people.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">No one tracked yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add people to monitor their LinkedIn role changes weekly via Parallel.ai
                  </p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Track Your First Person
                  </Button>
                </CardContent>
              </Card>
            ) : (
              people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onStop={handleStopTracking}
                  onViewChanges={handleViewChanges}
                />
              ))
            )}
          </div>
        ) : (
          <div className="max-w-3xl">
            <ChangeFeed
              changes={changes}
              personFilter={selectedPersonId || undefined}
              onBack={
                viewMode === "person-changes"
                  ? () => {
                      setViewMode("people");
                      setSelectedPersonId(null);
                    }
                  : undefined
              }
              onMarkRead={handleMarkRead}
            />
          </div>
        )}
      </div>

      {/* Add Person Dialog */}
      <AddPersonDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdded={() => {
          fetchPeople();
          setViewMode("people");
        }}
      />
    </div>
  );
}
