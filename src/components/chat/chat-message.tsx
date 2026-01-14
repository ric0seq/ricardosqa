"use client";

import { cn } from "@/lib/utils";
import { DealCard } from "./cards/deal-card";
import { EmailCard } from "./cards/email-card";
import { CallPrepCard } from "./cards/call-prep-card";
import { AnalysisCard } from "./cards/analysis-card";
import type { Message } from "@/types";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-4", isUser && "justify-end")}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          AI
        </div>
      )}
      <div className={cn("flex-1 space-y-4", isUser && "max-w-2xl")}>
        <div
          className={cn(
            "rounded-lg px-4 py-3",
            isUser ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
          )}
        >
          <ReactMarkdown className="prose prose-sm max-w-none">
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Render inline cards based on metadata */}
        {message.metadata?.type === "deals" && message.metadata.deals && (
          <div className="space-y-3">
            {message.metadata.deals.map((deal: any) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}

        {message.metadata?.type === "emails" && message.metadata.emails && (
          <div className="space-y-3">
            {message.metadata.emails.map((email: any) => (
              <EmailCard key={email.id} email={email} />
            ))}
          </div>
        )}

        {message.metadata?.type === "call_prep" && message.metadata.callPrep && (
          <CallPrepCard callPrep={message.metadata.callPrep} />
        )}

        {message.metadata?.type === "analysis" && message.metadata.analysis && (
          <AnalysisCard analysis={message.metadata.analysis} />
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
          R
        </div>
      )}
    </div>
  );
}
