"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Link2 } from "lucide-react";

interface CallPrep {
  meeting: {
    title: string;
    startTime: string;
    attendees: string[];
  };
  company: {
    name: string;
    website: string;
    sector: string;
  };
  founders: Array<{
    name: string;
    title: string;
    linkedinUrl?: string;
    background: string;
  }>;
  referrer?: {
    name: string;
    relationship: string;
    note: string;
  };
  previousInteractions: string[];
  suggestedQuestions: string[];
}

interface CallPrepCardProps {
  callPrep: CallPrep;
}

export function CallPrepCard({ callPrep }: CallPrepCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Call Prep: {callPrep.company.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Info */}
        <div>
          <h4 className="mb-2 font-semibold">Company</h4>
          <div className="flex items-center gap-2">
            <Badge>{callPrep.company.sector}</Badge>
            <a
              href={callPrep.company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <Link2 className="h-3 w-3" />
              {callPrep.company.website}
            </a>
          </div>
        </div>

        {/* Founders */}
        <div>
          <h4 className="mb-2 font-semibold">Founders</h4>
          <div className="space-y-2">
            {callPrep.founders.map((founder, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{founder.name}</span>
                    <span className="text-muted-foreground">• {founder.title}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{founder.background}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referrer */}
        {callPrep.referrer && (
          <div>
            <h4 className="mb-2 font-semibold">Referrer</h4>
            <div className="rounded-lg bg-blue-50 p-3 text-sm">
              <p className="font-medium">{callPrep.referrer.name}</p>
              <p className="text-muted-foreground">{callPrep.referrer.note}</p>
            </div>
          </div>
        )}

        {/* Suggested Questions */}
        <div>
          <h4 className="mb-2 font-semibold">Suggested Questions</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {callPrep.suggestedQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
