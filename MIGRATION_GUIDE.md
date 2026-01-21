# Migration Guide: Replit → Production (Claude Code Architecture)

## Overview

This guide walks through migrating from the Replit prototype to the production-ready architecture while preserving the working integrations.

## Phase 1: Foundation (Week 1)

### Day 1-2: Database Migration

#### 1. Set Up PostgreSQL

**Option A: Local Development**
```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or
sudo apt-get install postgresql  # Ubuntu

# Create database
createdb p9_assistant
```

**Option B: Railway (Recommended)**
```bash
# Sign up at railway.app
# Create new PostgreSQL database
# Copy connection string
```

#### 2. Run Migrations

```bash
cd /path/to/claude-code-version

# Install dependencies
npm install

# Configure database
echo "DATABASE_URL=postgresql://..." > .env

# Generate and run migrations
npm run db:generate
npm run db:migrate

# Verify schema
npm run db:studio  # Opens Drizzle Studio
```

#### 3. Migrate Data from In-Memory to Database

Since Replit uses in-memory storage, there's no data to migrate. But here's how to seed initial data:

```typescript
// scripts/seed.ts
import { db } from './src/db';
import { users, contacts, deals } from './src/db/schema';

async function seed() {
  // Add your email as initial user
  await db.insert(users).values({
    email: 'ricardo@pointnine.com',
    name: 'Ricardo Sequeira',
  });

  console.log('Database seeded!');
}

seed();
```

Run with:
```bash
npx tsx scripts/seed.ts
```

---

### Day 3-4: Port Google OAuth

#### 1. Copy OAuth Implementation from Replit

Take the working Google OAuth code from Replit and adapt it to Next.js:

```typescript
// src/app/api/auth/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
);

export async function GET(request: NextRequest) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
    prompt: 'consent',
  });

  return NextResponse.redirect(authUrl);
}
```

```typescript
// src/app/api/auth/callback/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // Encrypt tokens before storing
    const encryptedAccess = encrypt(tokens.access_token!);
    const encryptedRefresh = encrypt(tokens.refresh_token!);

    // Get user info
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    // Update user in database
    await db.insert(users)
      .values({
        email: data.email!,
        name: data.name,
        image: data.picture,
        googleAccessToken: encryptedAccess,
        googleRefreshToken: encryptedRefresh,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          googleAccessToken: encryptedAccess,
          googleRefreshToken: encryptedRefresh,
          updatedAt: new Date(),
        },
      });

    return NextResponse.redirect('/');
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
```

#### 2. Add Token Encryption

```typescript
// src/lib/crypto.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
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

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add to .env as ENCRYPTION_KEY
```

---

### Day 5-6: Port Attio Integration

Copy from Replit's working implementation:

```typescript
// src/lib/attio/client.ts
import { decrypt } from '@/lib/crypto';

const ATTIO_API_URL = 'https://api.attio.com/v2';

export class AttioClient {
  constructor(private apiKey: string) {}

  async get(endpoint: string) {
    const response = await fetch(`${ATTIO_API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Attio API error: ${response.statusText}`);
    }

    return response.json();
  }

  async searchPeople(query: string) {
    return this.get(`/people?filter[email][contains]=${query}`);
  }

  async getRelationship(personId: string) {
    return this.get(`/people/${personId}/relationships`);
  }

  async getGranolaNotes(personId: string) {
    // Attio's native Granola integration
    const notes = await this.get(`/people/${personId}/notes?source=granola`);
    return notes;
  }
}

export function createAttioClient(): AttioClient {
  if (!process.env.ATTIO_API_KEY) {
    throw new Error('ATTIO_API_KEY not configured');
  }
  return new AttioClient(process.env.ATTIO_API_KEY);
}
```

```typescript
// src/app/api/attio/relationship/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAttioClient } from '@/lib/attio/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  try {
    const attio = createAttioClient();
    const people = await attio.searchPeople(email);

    if (people.data.length === 0) {
      return NextResponse.json({ found: false });
    }

    const person = people.data[0];
    const relationship = await attio.getRelationship(person.id);

    return NextResponse.json({
      found: true,
      person,
      relationshipStrength: relationship.strength || 3,
    });
  } catch (error) {
    console.error('Attio API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationship' },
      { status: 500 }
    );
  }
}
```

---

### Day 7: Error Handling & Validation

#### 1. Add Global Error Handler

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  try {
    // Log all requests
    console.log(`${request.method} ${request.url}`);

    // Rate limiting could go here
    // Authentication checks could go here

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: '/api/:path*',
};
```

#### 2. Add Input Validation Schemas

```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(50000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  dealId: z.string().uuid().optional(),
});

export const emailSyncSchema = z.object({
  query: z.string().optional(),
  maxResults: z.number().int().min(1).max(500).default(50),
});

export const documentUploadSchema = z.object({
  dealId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().regex(/^(application\/pdf|image\/(png|jpeg))$/),
  sizeBytes: z.number().int().max(10 * 1024 * 1024), // 10MB max
});
```

#### 3. Use Validation in API Routes

```typescript
// src/app/api/chat/route.ts
import { chatRequestSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validated = chatRequestSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validated.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { messages, dealId } = validated.data;

    // Continue with validated data...
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
```

---

## Phase 2: Testing (Week 2)

### Day 8-9: Unit Tests

#### 1. Set Up Testing Framework

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { beforeAll, afterAll } from 'vitest';
import { db } from './src/db';

beforeAll(async () => {
  // Set up test database
});

afterAll(async () => {
  // Clean up test database
});
```

#### 2. Write Unit Tests

```typescript
// tests/unit/email-classification.test.ts
import { describe, it, expect } from 'vitest';
import { classifyEmail } from '@/lib/google/gmail';

describe('Email Classification', () => {
  it('should detect founder pitch emails', async () => {
    const email = {
      from: 'founder@startup.com',
      subject: 'Introducing StartupX - Fundraising',
      snippet: 'We are raising $5M Series A...',
      body: 'Full email body here...',
    };

    const result = await classifyEmail(email);

    expect(result.isFounderEmail).toBe(true);
    expect(result.type).toBe('pitch');
    expect(result.isPriority).toBe(true);
    expect(result.extractedData.companyName).toBe('StartupX');
    expect(result.extractedData.askAmount).toContain('$5M');
  });

  it('should detect portfolio company emails', async () => {
    const email = {
      from: 'ceo@portfolio-company.com',
      subject: 'Monthly Update - October',
      snippet: 'ARR grew 20% this month...',
      body: 'Full update here...',
    };

    const result = await classifyEmail(email);

    expect(result.isFounderEmail).toBe(false);
    expect(result.type).toBe('update');
    expect(result.classification).toBe('portfolio');
  });

  it('should handle malformed emails', async () => {
    const email = {
      from: '',
      subject: '',
      snippet: '',
      body: '',
    };

    const result = await classifyEmail(email);

    expect(result.isFounderEmail).toBe(false);
    expect(result.type).toBe('other');
  });
});
```

```typescript
// tests/unit/deck-analysis.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeDeck } from '@/lib/deck-analysis';

describe('Deck Analysis', () => {
  it('should extract key metrics from deck text', async () => {
    const deckText = `
      Company: TechCo
      ARR: $2M
      Growth: 300% YoY
      Burn: $200K/month
      Runway: 18 months
    `;

    const analysis = await analyzeDeck('test-doc-id', deckText);

    expect(analysis.keyMetrics).toHaveProperty('ARR');
    expect(analysis.keyMetrics.ARR).toContain('$2M');
    expect(analysis.highlights).toBeInstanceOf(Array);
    expect(analysis.concerns).toBeInstanceOf(Array);
  });
});
```

Run tests:
```bash
npm run test
```

---

### Day 10-11: Integration Tests

```typescript
// tests/integration/gmail-sync.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { fetchAndClassifyEmails } from '@/lib/google/gmail';
import { db } from '@/db';
import { emails } from '@/db/schema';

describe('Gmail Integration', () => {
  const testAccessToken = process.env.TEST_GOOGLE_ACCESS_TOKEN!;
  const testRefreshToken = process.env.TEST_GOOGLE_REFRESH_TOKEN!;

  beforeAll(async () => {
    // Clean test database
    await db.delete(emails);
  });

  it('should fetch and classify emails from Gmail', async () => {
    const result = await fetchAndClassifyEmails(
      testAccessToken,
      testRefreshToken,
      'is:unread'
    );

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);

    const firstEmail = result[0];
    expect(firstEmail).toHaveProperty('id');
    expect(firstEmail).toHaveProperty('classification');
    expect(firstEmail).toHaveProperty('gmailMessageId');
  });

  it('should store classified emails in database', async () => {
    await fetchAndClassifyEmails(
      testAccessToken,
      testRefreshToken,
      'is:unread'
    );

    const storedEmails = await db.select().from(emails);
    expect(storedEmails.length).toBeGreaterThan(0);
  });
});
```

---

### Day 12-13: E2E Tests

```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test('should send message and receive response', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Type message
    await page.fill('input[placeholder="Ask me anything..."]', 'Show me my inbox');

    // Send
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForSelector('.chat-message');

    const messages = await page.locator('.chat-message').all();
    expect(messages.length).toBeGreaterThan(1);
  });

  test('should upload and analyze deck', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Upload file
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/test-deck.pdf');

    // Wait for analysis
    await page.waitForSelector('.analysis-card', { timeout: 30000 });

    // Check analysis content
    const analysis = await page.locator('.analysis-card').textContent();
    expect(analysis).toContain('Key Metrics');
    expect(analysis).toContain('Highlights');
  });
});
```

Run E2E tests:
```bash
npm run test:e2e
```

---

## Phase 3: Deployment (Week 3)

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
vercel env add DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add ENCRYPTION_KEY
vercel env add ATTIO_API_KEY

# Deploy to production
vercel --prod
```

### Set Up Monitoring

```bash
# Add Sentry
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

---

## Phase 4: Merge Slack (Optional - Week 4)

If you want Slack notifications (not full bot):

```typescript
// src/lib/slack/notifications.ts
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function notifySlack(channel: string, message: string) {
  try {
    await slack.chat.postMessage({
      channel,
      text: message,
      username: 'P9 Assistant',
      icon_emoji: ':robot_face:',
    });
  } catch (error) {
    console.error('Slack notification error:', error);
  }
}

// Usage:
// await notifySlack('#deals', 'New high-priority pitch from StartupX');
```

---

## Verification Checklist

After migration, verify:

- [ ] Database is persistent (restart server, data still there)
- [ ] OAuth tokens are encrypted
- [ ] Google OAuth flow works
- [ ] Gmail sync works
- [ ] Calendar sync works
- [ ] Attio integration works
- [ ] Deck upload and analysis works
- [ ] Chat interface works
- [ ] All API endpoints have error handling
- [ ] All inputs are validated
- [ ] Tests pass (unit + integration + E2E)
- [ ] Deployed to staging environment
- [ ] Monitoring is set up
- [ ] Ready for production

---

## Rollback Plan

If migration fails:

1. Keep Replit version running as fallback
2. Database migrations are reversible with Drizzle
3. Environment variables easy to switch
4. Vercel allows instant rollback to previous deployment

---

## Timeline Summary

**Week 1:** Database + OAuth + Attio + Error Handling
**Week 2:** Testing (unit + integration + E2E)
**Week 3:** Deployment + Monitoring
**Week 4:** Slack (optional) + Polish

**Total:** 3-4 weeks to production-ready system
