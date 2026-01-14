"use client";

import { Button } from "@/components/ui/button";

interface SuggestedActionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function SuggestedActions({ suggestions, onSelect }: SuggestedActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion)}
          className="h-auto whitespace-normal py-2 text-left"
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
