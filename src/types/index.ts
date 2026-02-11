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

export interface TrackedPerson {
  id: string;
  contactId?: string;
  name: string;
  linkedinUrl: string;
  category: "founder_in_stealth" | "operator_at_company";
  currentRole?: string;
  currentCompany?: string;
  monitoringStatus: "active" | "paused" | "stopped";
  parallelMonitorId?: string;
  notes?: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
  unreadChanges?: number;
  latestChange?: RoleChange | null;
}

export interface RoleChange {
  id: string;
  trackedPersonId: string;
  parallelEventGroupId?: string;
  changeType: "new_role" | "left_company" | "company_announced" | "title_change";
  previousRole?: string;
  previousCompany?: string;
  newRole?: string;
  newCompany?: string;
  summary?: string;
  sourceUrls?: string[];
  isRead: boolean;
  detectedAt: string;
  createdAt: string;
}
