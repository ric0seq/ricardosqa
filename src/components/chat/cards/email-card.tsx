"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Mail } from "lucide-react";

interface Email {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  isPriority: boolean;
  classification?: string;
}

interface EmailCardProps {
  email: Email;
}

export function EmailCard({ email }: EmailCardProps) {
  return (
    <Card className="cursor-pointer transition-colors hover:bg-accent/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{email.from}</span>
                  {email.isPriority && <Badge variant="destructive">Priority</Badge>}
                </div>
                <p className="mt-1 font-semibold">{email.subject}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(email.receivedAt)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{email.snippet}</p>
            {email.classification && (
              <Badge variant="outline" className="text-xs">
                {email.classification}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
