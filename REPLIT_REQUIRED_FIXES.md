# Critical Issues: Replit Implementation Must Fix

**To:** Replit Development Team
**From:** Point Nine Capital / Claude Code
**Date:** January 2026
**Subject:** Required Changes for Production Deployment

---

## Executive Summary

The current Replit implementation has **7 critical issues** that make it unsuitable for production deployment. This document outlines required fixes with specific code examples.

**Timeline:** These fixes should take 1-2 weeks to implement properly.

---

## 🔴 CRITICAL ISSUE #1: Data Persistence

### Current Implementation (BLOCKING PRODUCTION)

```typescript
// server/storage.ts - CURRENT (BROKEN)
let conversations: Conversation[] = [];
let documents: Document[] = [];
let emails: Email[] = [];
let deals: Deal[] = [];
```

### Problem
- **All data lost on server restart**
- Cannot track deals over time
- Cannot maintain conversation history
- No data recovery or backup

### Required Fix

**Option A: Add PostgreSQL Database (Recommended)**

```typescript
// Install dependencies
npm install drizzle-orm postgres @types/postgres

// Create schema file: server/db/schema.ts
import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  messages: jsonb("messages").$type<Message[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emails = pgTable("emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  gmailMessageId: text("gmail_message_id").unique(),
  from: text("from").notNull(),
  subject: text("subject"),
  body: text("body"),
  classification: text("classification"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Similar tables for: deals, documents, meetings
```

```typescript
// server/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);
```

```typescript
// Replace storage.ts with database calls
// BEFORE:
conversations.push(newConversation);

// AFTER:
await db.insert(conversations).values(newConversation);
```

**Option B: Add Persistent JSON File Storage (Temporary Workaround)**

If database setup takes too long, use file-based persistence as temporary fix:

```typescript
// server/storage.ts - TEMPORARY FIX
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'storage.json');

interface Storage {
  conversations: Conversation[];
  documents: Document[];
  emails: Email[];
  deals: Deal[];
}

// Load data on startup
async function loadStorage(): Promise<Storage> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { conversations: [], documents: [], emails: [], deals: [] };
  }
}

// Save data periodically (every 30 seconds)
async function saveStorage(storage: Storage) {
  await fs.writeFile(DATA_FILE, JSON.stringify(storage, null, 2));
}

let storage = await loadStorage();

// Auto-save every 30 seconds
setInterval(() => saveStorage(storage), 30000);

// Also save on exit
process.on('exit', () => saveStorage(storage));
process.on('SIGINT', () => {
  saveStorage(storage);
  process.exit();
});

export { storage };
```

**DEADLINE:** This must be fixed before any production deployment.

---

## 🔴 CRITICAL ISSUE #2: OAuth Token Security

### Current Implementation (SECURITY RISK)

```typescript
// server/google/oauth.ts - CURRENT (INSECURE)
req.session.tokens = {
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
};
```

### Problems
- Tokens lost on restart (user must re-authenticate)
- Tokens stored unencrypted
- No token refresh persistence

### Required Fix

```typescript
// Install encryption library
npm install crypto

// server/lib/crypto.ts - NEW FILE
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // Must be 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

```typescript
// server/google/oauth.ts - UPDATED
import { encrypt, decrypt } from '../lib/crypto';
import { db } from '../db'; // Assumes database fix is done
import { users } from '../db/schema';

// After getting tokens from Google:
const { tokens } = await oauth2Client.getToken(code);

// Store encrypted tokens in database
await db.insert(users).values({
  email: userEmail,
  googleAccessToken: encrypt(tokens.access_token!),
  googleRefreshToken: encrypt(tokens.refresh_token!),
}).onConflictDoUpdate({
  target: users.email,
  set: {
    googleAccessToken: encrypt(tokens.access_token!),
    googleRefreshToken: encrypt(tokens.refresh_token!),
  },
});

// When retrieving tokens:
const user = await db.query.users.findFirst({
  where: eq(users.email, currentUserEmail),
});

const accessToken = decrypt(user.googleAccessToken);
const refreshToken = decrypt(user.googleRefreshToken);
```

```bash
# Generate encryption key (run once)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_KEY=<generated_key>
```

**DEADLINE:** Must be fixed before production deployment.

---

## 🔴 CRITICAL ISSUE #3: Error Handling

### Current Implementation (CRASHES ON ERRORS)

```typescript
// server/google/gmail.ts - CURRENT (NO ERROR HANDLING)
export async function fetchEmails(accessToken: string) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 50
  });
  // No try-catch, no retry, no fallback
  return response.data.messages;
}
```

### Problems
- Server crashes on API errors
- No retry logic for transient failures
- No token refresh handling
- No rate limit handling

### Required Fix

```typescript
// server/google/gmail.ts - UPDATED
export async function fetchEmails(
  accessToken: string,
  refreshToken: string,
  maxRetries = 3
) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 50
      });

      return response.data.messages || [];

    } catch (error: any) {
      attempts++;

      // Handle token expiration (401)
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        console.log('Token expired, refreshing...');
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          accessToken = credentials.access_token!;

          // Save new token to database
          await saveNewAccessToken(userEmail, accessToken);
          continue;
        } catch (refreshError) {
          throw new Error('Failed to refresh token. User needs to re-authenticate.');
        }
      }

      // Handle rate limiting (429)
      if (error.code === 429) {
        const waitTime = Math.pow(2, attempts) * 1000; // Exponential backoff
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Handle quota exceeded (403)
      if (error.code === 403 && error.message?.includes('quota')) {
        throw new Error('Gmail API quota exceeded. Try again later.');
      }

      // If last attempt, throw error
      if (attempts >= maxRetries) {
        console.error(`Failed after ${maxRetries} attempts:`, error);
        throw new Error(`Gmail API error: ${error.message}`);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }

  return []; // Fallback
}
```

**Apply similar error handling to:**
- `server/google/calendar.ts`
- `server/attio/routes.ts`
- `server/routes.ts` (chat endpoint)

**DEADLINE:** Critical - must be fixed before production.

---

## 🟡 MAJOR ISSUE #4: Input Validation

### Current Implementation (SECURITY RISK)

```typescript
// server/routes.ts - CURRENT (NO VALIDATION)
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body; // Unvalidated!
  // What if messages is undefined? null? wrong type? malicious?
});
```

### Required Fix

```typescript
// Install Zod
npm install zod

// shared/validation.ts - NEW FILE
import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(50000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  conversationId: z.string().uuid().optional(),
});

export const documentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  size: z.number().int().max(10 * 1024 * 1024), // 10MB max
});

export const emailSyncSchema = z.object({
  query: z.string().max(500).optional(),
  maxResults: z.number().int().min(1).max(500).default(50),
});
```

```typescript
// server/routes.ts - UPDATED
import { chatRequestSchema, documentUploadSchema } from '../shared/validation';

app.post('/api/chat', async (req, res) => {
  try {
    // Validate input
    const validated = chatRequestSchema.safeParse(req.body);

    if (!validated.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validated.error.flatten(),
      });
    }

    const { messages, conversationId } = validated.data;

    // Now safe to use validated data
    // ... rest of handler

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Apply validation to all API endpoints.**

**DEADLINE:** Should be fixed within 1 week.

---

## 🟡 MAJOR ISSUE #5: Bugs in Current Code

### Bug #1: PDF Memory Limit

```typescript
// server/routes.ts - CURRENT (CRASHES ON LARGE PDFs)
app.post('/api/upload', async (req, res) => {
  const buffer = await file.arrayBuffer();
  const text = await pdf(Buffer.from(buffer)); // No size check!
});
```

**Fix:**
```typescript
// server/routes.ts - FIXED
app.post('/api/upload', async (req, res) => {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  if (file.size > MAX_SIZE) {
    return res.status(413).json({
      error: 'File too large. Maximum size is 10MB.'
    });
  }

  const buffer = await file.arrayBuffer();
  const text = await pdf(Buffer.from(buffer));
});
```

### Bug #2: Race Condition in Email Classification

```typescript
// server/google/gmail.ts - CURRENT (SLOW)
for (const message of messages) {
  const classification = await classifyEmail(message); // Sequential!
  await saveEmail(classification);
}
```

**Fix:**
```typescript
// server/google/gmail.ts - FIXED
await Promise.all(
  messages.map(async (message) => {
    const classification = await classifyEmail(message);
    await saveEmail(classification);
  })
);
```

### Bug #3: Calendar Event Duplication

```typescript
// server/google/calendar.ts - CURRENT (CREATES DUPLICATES)
await db.insert(meetings).values(event);
```

**Fix:**
```typescript
// server/google/calendar.ts - FIXED
await db.insert(meetings)
  .values(event)
  .onConflictDoUpdate({
    target: meetings.googleEventId,
    set: { updatedAt: new Date() },
  });
```

### Bug #4: Memory Leak in SSE Streams

```typescript
// server/routes.ts - CURRENT (MEMORY LEAK)
app.post('/api/chat', async (req, res) => {
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  // No cleanup on client disconnect
});
```

**Fix:**
```typescript
// server/routes.ts - FIXED
app.post('/api/chat', async (req, res) => {
  // Cleanup on disconnect
  req.on('close', () => {
    if (stream) stream.abort();
    res.end();
  });

  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
});
```

### Bug #5: API Keys in Logs

```typescript
// server/attio/routes.ts - CURRENT (SECURITY RISK)
console.log('Attio request:', { url, apiKey }); // LEAKED!
```

**Fix:**
```typescript
// server/attio/routes.ts - FIXED
console.log('Attio request:', {
  url,
  apiKey: '***' + apiKey.slice(-4) // Only show last 4 chars
});
```

**DEADLINE:** Fix all bugs within 1 week.

---

## 🟢 OPTIONAL IMPROVEMENT: Rate Limiting

### Current Implementation (RISK: API ABUSE)

No rate limiting on any endpoints.

### Recommended Fix

```typescript
// Install rate limiter
npm install express-rate-limit

// server/index.ts - ADD THIS
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all API routes
app.use('/api/', limiter);

// Stricter limit for expensive operations
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
});

app.use('/api/upload', uploadLimiter);
```

**DEADLINE:** Nice to have, but not blocking.

---

## 🟢 OPTIONAL IMPROVEMENT: Switch to Claude API

### Current Implementation

Using OpenAI GPT-4o instead of Claude.

### Recommended Change

```typescript
// Install Anthropic SDK
npm install @anthropic-ai/sdk

// server/lib/ai.ts - NEW FILE
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function chat(messages: Message[]) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  return response.content[0].text;
}
```

**Why:** Claude 3.5 Sonnet is better for long document analysis (200K context window) and investment memo generation.

**DEADLINE:** Optional - can keep GPT-4o for now.

---

## 📋 Implementation Checklist

### Week 1: Critical Fixes (MUST DO)
- [ ] Add database persistence (PostgreSQL or file-based temporary)
- [ ] Encrypt OAuth tokens
- [ ] Add error handling with retry logic
- [ ] Add input validation (Zod)
- [ ] Fix Bug #1: PDF size limit
- [ ] Fix Bug #2: Email classification race condition
- [ ] Fix Bug #3: Calendar event duplication
- [ ] Fix Bug #4: SSE memory leak
- [ ] Fix Bug #5: API keys in logs

### Week 2: Testing & Deployment (RECOMMENDED)
- [ ] Add rate limiting
- [ ] Write basic tests
- [ ] Deploy to staging environment
- [ ] Load testing
- [ ] Security audit

### Optional (Can Do Later)
- [ ] Switch to Claude API
- [ ] Add monitoring (Sentry)
- [ ] Add caching layer
- [ ] Optimize performance

---

## 🚫 What NOT to Change

These parts are working well - **do not modify**:

✅ **Google OAuth flow** - Keep as is
✅ **Attio integration** - Keep as is
✅ **Gmail classification prompts** - Keep as is
✅ **Calendar matching logic** - Keep as is
✅ **PDF processing (pdf-parse v1.1.1)** - Keep as is
✅ **Slack bot** - Keep if needed, or simplify to notifications only

---

## 📊 Priority Matrix

| Issue | Severity | Effort | Timeline |
|-------|----------|--------|----------|
| Data persistence | 🔴 Critical | High | Week 1 |
| Token encryption | 🔴 Critical | Medium | Week 1 |
| Error handling | 🔴 Critical | High | Week 1 |
| Input validation | 🟡 Major | Medium | Week 1 |
| Bug fixes (5 total) | 🟡 Major | Low | Week 1 |
| Rate limiting | 🟢 Nice to have | Low | Week 2 |
| Switch to Claude | 🟢 Optional | Medium | Later |

---

## 💰 Estimated Cost Impact

**Current:** ~$120/month (Replit $20 + OpenAI $100)
**After fixes:** ~$125/month (Replit $20 + Railway DB $5 + OpenAI $100)
**With Claude switch:** ~$75/month (Replit $20 + Railway $5 + Claude $50)

---

## ✅ Testing Before Production

Before deploying to production, test:

1. **Server restart** - Verify data persists
2. **Token expiration** - Verify auto-refresh works
3. **API failures** - Verify error handling and retries
4. **Large file upload** - Verify size limit enforcement
5. **Concurrent requests** - Verify no race conditions
6. **Client disconnect** - Verify no memory leaks
7. **Rate limiting** - Verify limits enforced

---

## 📞 Questions?

If anything is unclear, please contact Point Nine Capital team for clarification.

**Timeline Summary:**
- Week 1: Fix critical issues (required)
- Week 2: Testing and deployment (recommended)
- Later: Optional improvements

**Bottom Line:** The critical fixes (persistence, encryption, error handling, validation) are **required** before any production deployment. The bugs should be fixed ASAP. Everything else is optional but recommended.
