"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Check, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { RoleChange } from "@/types";

interface ChangeItem {
  change: RoleChange;
  personName: string;
  linkedinUrl: string;
  category: string;
}

interface ChangeFeedProps {
  changes: ChangeItem[];
  personFilter?: string; // If set, we're viewing a specific person's changes
  onBack?: () => void;
  onMarkRead: (changeIds: string[]) => void;
}

const changeTypeStyles: Record<string, string> = {
  new_role: "bg-blue-100 text-blue-800",
  left_company: "bg-orange-100 text-orange-800",
  company_announced: "bg-green-100 text-green-800",
  title_change: "bg-purple-100 text-purple-800",
};

const changeTypeLabels: Record<string, string> = {
  new_role: "New Role",
  left_company: "Left Company",
  company_announced: "Company Announced",
  title_change: "Title Change",
};

export function ChangeFeed({ changes, personFilter, onBack, onMarkRead }: ChangeFeedProps) {
  const unreadIds = changes
    .filter((c) => !c.change.isRead)
    .map((c) => c.change.id);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-base">
            {personFilter ? "Changes" : "Recent Changes"}
          </CardTitle>
          {unreadIds.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadIds.length} unread
            </Badge>
          )}
        </div>
        {unreadIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => onMarkRead(unreadIds)}
          >
            <Check className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No changes detected yet. Parallel.ai checks weekly for updates.
          </p>
        ) : (
          changes.map((item) => (
            <div
              key={item.change.id}
              className={`rounded-lg border p-3 transition-colors ${
                item.change.isRead ? "bg-background" : "bg-accent/30 border-accent"
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {!personFilter && (
                    <span className="font-medium text-sm">{item.personName}</span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      changeTypeStyles[item.change.changeType] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {changeTypeLabels[item.change.changeType] || item.change.changeType}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {formatDate(item.change.detectedAt)}
                </span>
              </div>

              {item.change.summary && (
                <p className="text-sm mb-2">{item.change.summary}</p>
              )}

              {(item.change.previousRole || item.change.newRole) && (
                <div className="text-xs text-muted-foreground mb-2">
                  {item.change.previousRole && (
                    <span>
                      From: {item.change.previousRole}
                      {item.change.previousCompany && ` at ${item.change.previousCompany}`}
                    </span>
                  )}
                  {item.change.previousRole && item.change.newRole && " → "}
                  {item.change.newRole && (
                    <span className="font-medium text-foreground">
                      {item.change.newRole}
                      {item.change.newCompany && ` at ${item.change.newCompany}`}
                    </span>
                  )}
                </div>
              )}

              {item.change.sourceUrls && item.change.sourceUrls.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.change.sourceUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Source {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
