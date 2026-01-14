"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Building2, TrendingUp } from "lucide-react";

interface Deal {
  id: string;
  companyName: string;
  stage: string;
  sector: string;
  checkSize?: number;
  priority: number;
  referrer?: {
    name: string;
    relationshipStrength: number;
  };
}

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const priorityColor = deal.priority >= 4 ? "text-red-500" : deal.priority >= 3 ? "text-yellow-500" : "text-gray-400";

  return (
    <Card className="cursor-pointer transition-colors hover:bg-accent/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">{deal.companyName}</h3>
              {deal.priority >= 4 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`h-1.5 w-1.5 rounded-full ${priorityColor}`} />
                  ))}
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{deal.sector}</Badge>
              <span>•</span>
              <span>{deal.stage}</span>
              {deal.checkSize && (
                <>
                  <span>•</span>
                  <span>{formatCurrency(deal.checkSize)}</span>
                </>
              )}
            </div>
            {deal.referrer && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Referred by</span>
                <span className="font-medium">{deal.referrer.name}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i < deal.referrer!.relationshipStrength ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
