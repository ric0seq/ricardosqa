export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    type?: string;
    deals?: any[];
    emails?: any[];
    callPrep?: any;
    analysis?: any;
    suggestedActions?: string[];
  };
  createdAt: string;
}

export interface Deal {
  id: string;
  companyName: string;
  stage: string;
  sector: string;
  checkSize?: number;
  roundSize?: number;
  priority: number;
  status: string;
}

export interface Contact {
  id: string;
  email: string;
  name: string;
  title?: string;
  relationshipStrength: number;
}

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
  isPriority: boolean;
  classification?: string;
}
