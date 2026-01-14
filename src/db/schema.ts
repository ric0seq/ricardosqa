import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, varchar, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table (for authentication)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contacts table (founders, investors, etc.)
export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  title: varchar("title", { length: 255 }),
  linkedinUrl: text("linkedin_url"),
  attioId: varchar("attio_id", { length: 255 }),
  relationshipStrength: integer("relationship_strength").default(1), // 1-5 scale
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Companies/Deals table
export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  website: text("website"),
  stage: varchar("stage", { length: 100 }).notNull(), // Inbox, Initial Call, DD, Partner Review, Decision, Passed
  sector: varchar("sector", { length: 255 }),
  checkSize: decimal("check_size", { precision: 12, scale: 2 }),
  roundSize: decimal("round_size", { precision: 12, scale: 2 }),
  valuation: decimal("valuation", { precision: 15, scale: 2 }),
  zendeskTicketId: varchar("zendesk_ticket_id", { length: 255 }),
  attioRecordId: varchar("attio_record_id", { length: 255 }),
  priority: integer("priority").default(3), // 1-5 scale
  status: varchar("status", { length: 50 }).default("active"), // active, passed, invested
  passReason: text("pass_reason"),
  passedAt: timestamp("passed_at"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Founders table (many-to-many with deals)
export const founders = pgTable("founders", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id),
  dealId: uuid("deal_id").references(() => deals.id),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Referrers table (tracking who referred the deal)
export const referrers = pgTable("referrers", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id").references(() => deals.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  relationshipStrength: integer("relationship_strength").default(3),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Emails table
export const emails = pgTable("emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  gmailMessageId: varchar("gmail_message_id", { length: 255 }).unique(),
  gmailThreadId: varchar("gmail_thread_id", { length: 255 }),
  dealId: uuid("deal_id").references(() => deals.id),
  contactId: uuid("contact_id").references(() => contacts.id),
  subject: text("subject"),
  snippet: text("snippet"),
  body: text("body"),
  from: text("from").notNull(),
  to: text("to").notNull(),
  receivedAt: timestamp("received_at").notNull(),
  isFounderEmail: boolean("is_founder_email").default(false),
  isPriority: boolean("is_priority").default(false),
  classification: varchar("classification", { length: 100 }), // pitch, follow_up, question, update, pass
  extractedData: jsonb("extracted_data").$type<{
    companyName?: string;
    stage?: string;
    sector?: string;
    askAmount?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Meetings table
export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  googleEventId: varchar("google_event_id", { length: 255 }).unique(),
  dealId: uuid("deal_id").references(() => deals.id),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  attendees: jsonb("attendees").$type<string[]>(),
  meetingType: varchar("meeting_type", { length: 100 }), // intro_call, deep_dive, partner_meeting
  granolaRecordingUrl: text("granola_recording_url"),
  granolaTranscript: text("granola_transcript"),
  granolaSummary: text("granola_summary"),
  aiSummary: text("ai_summary"),
  keyPoints: jsonb("key_points").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Documents table (decks, financials, data rooms)
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id").references(() => deals.id),
  name: varchar("name", { length: 500 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // deck, financials, data_room, memo
  url: text("url").notNull(),
  gcsPath: text("gcs_path"),
  driveFileId: varchar("drive_file_id", { length: 255 }),
  sizeBytes: integer("size_bytes"),
  mimeType: varchar("mime_type", { length: 100 }),
  aiAnalysis: text("ai_analysis"),
  analyzedAt: timestamp("analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Research notes table (for Phase 2)
export const researchNotes = pgTable("research_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id").references(() => deals.id),
  type: varchar("type", { length: 100 }).notNull(), // market_analysis, competitive_landscape, founder_background
  title: varchar("title", { length: 500 }),
  content: text("content"),
  sources: jsonb("sources").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Memos table
export const memos = pgTable("memos", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id").references(() => deals.id),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  version: integer("version").default(1),
  status: varchar("status", { length: 50 }).default("draft"), // draft, final
  driveFileId: varchar("drive_file_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat messages table (for the conversational interface)
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  dealId: uuid("deal_id").references(() => deals.id),
  role: varchar("role", { length: 50 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    type?: string;
    actions?: string[];
    entities?: Record<string, any>;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const dealsRelations = relations(deals, ({ many }) => ({
  founders: many(founders),
  referrers: many(referrers),
  emails: many(emails),
  meetings: many(meetings),
  documents: many(documents),
  researchNotes: many(researchNotes),
  memos: many(memos),
  chatMessages: many(chatMessages),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  founderDeals: many(founders),
  referredDeals: many(referrers),
  emails: many(emails),
}));

export const foundersRelations = relations(founders, ({ one }) => ({
  contact: one(contacts, {
    fields: [founders.contactId],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [founders.dealId],
    references: [deals.id],
  }),
}));
