"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Trash2, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { TrackedPerson } from "@/types";

interface PersonCardProps {
  person: TrackedPerson;
  onStop: (id: string) => void;
  onViewChanges: (id: string) => void;
}

const categoryLabels = {
  founder_in_stealth: "Founder in Stealth",
  operator_at_company: "Operator",
};

const statusStyles = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  stopped: "bg-gray-100 text-gray-600",
};

const changeTypeLabels: Record<string, string> = {
  new_role: "New Role",
  left_company: "Left Company",
  company_announced: "Company Announced",
  title_change: "Title Change",
};

export function PersonCard({ person, onStop, onViewChanges }: PersonCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{person.name}</h3>
              <Badge variant="outline" className="text-xs shrink-0">
                {categoryLabels[person.category]}
              </Badge>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[person.monitoringStatus]}`}
              >
                {person.monitoringStatus}
              </span>
            </div>

            {(person.currentRole || person.currentCompany) && (
              <p className="text-sm text-muted-foreground mb-1">
                {person.currentRole}
                {person.currentRole && person.currentCompany && " at "}
                {person.currentCompany}
              </p>
            )}

            {person.notes && (
              <p className="text-xs text-muted-foreground italic mb-2">
                {person.notes}
              </p>
            )}

            {person.latestChange && (
              <div className="mt-2 rounded-md bg-accent/50 p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {changeTypeLabels[person.latestChange.changeType] || person.latestChange.changeType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(person.latestChange.detectedAt)}
                  </span>
                </div>
                <p className="text-xs line-clamp-2">
                  {person.latestChange.summary}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              {person.lastCheckedAt && (
                <span>Last checked: {formatDate(person.lastCheckedAt)}</span>
              )}
              <span>Added: {formatDate(person.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
            {(person.unreadChanges || 0) > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1.5">
                {person.unreadChanges}
              </span>
            )}
            <div className="flex gap-1 mt-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="View on LinkedIn"
                asChild
              >
                <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="View changes"
                onClick={() => onViewChanges(person.id)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              {person.monitoringStatus === "active" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Stop tracking"
                  onClick={() => onStop(person.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
