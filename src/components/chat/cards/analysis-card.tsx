"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Analysis {
  documentName: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  keyMetrics?: Record<string, string>;
}

interface AnalysisCardProps {
  analysis: Analysis;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {analysis.documentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>

        {/* Key Metrics */}
        {analysis.keyMetrics && Object.keys(analysis.keyMetrics).length > 0 && (
          <div>
            <h4 className="mb-2 font-semibold">Key Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(analysis.keyMetrics).map(([key, value]) => (
                <div key={key} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highlights */}
        {analysis.highlights.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Highlights
            </h4>
            <ul className="space-y-1 text-sm">
              {analysis.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {analysis.concerns.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Concerns
            </h4>
            <ul className="space-y-1 text-sm">
              {analysis.concerns.map((concern, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
