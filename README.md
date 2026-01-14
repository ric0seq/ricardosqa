# P9 VC Assistant 🚀

An AI-powered VC workflow assistant for Point Nine Capital, built with Next.js, Claude AI, and integrated with Gmail, Google Calendar, Google Drive, Zendesk, Attio, and Granola.

## Overview

The P9 VC Assistant helps manage the entire deal flow process:

- **Email Intelligence**: Automatically prioritize founder emails and startup pitches based on referral strength and deal criteria
- **Pipeline Management**: Track deals through stages (Inbox → Initial Call → DD → Decision)
- **Call Preparation**: Generate call prep briefs with company context, founder backgrounds, and suggested questions
- **Deck Analysis**: AI-powered analysis of pitch decks with highlights, concerns, and recommendations
- **Pass Email Drafting**: Generate personalized pass emails matching Ricardo's tone and style
- **Research Engine**: Market analysis, competitive landscapes, and founder backgrounds (Phase 2)
- **Memo Generation**: Auto-generate investment memos in Ricardo's style (Phase 2)

## Architecture

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Database**: PostgreSQL with Drizzle ORM
- **Integrations**: Gmail API, Google Calendar API, Google Drive API, Zendesk API, Attio API, Granola API
- **Deployment**: Vercel (frontend) + Railway (database)

### Key Features (MVP)

✅ Chat-first interface with Claude AI
✅ Gmail integration for email prioritization
✅ Google Calendar integration for meeting management
✅ Deck upload and AI analysis
✅ Pass email drafting
⏳ Attio sync (Phase 2)
⏳ Granola integration (Phase 2)
⏳ Research engine (Phase 2)
⏳ Memo generation (Phase 2)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google Cloud Project with OAuth configured
- Anthropic API key
- (Optional) Attio, Zendesk, Granola API keys

### Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

For detailed setup instructions, see [SETUP.md](SETUP.md).

## Usage

### Chat Interface

The main interface is a conversational chat where you can:

- Ask to see your high-priority inbox
- Request call prep for upcoming meetings
- Upload and analyze pitch decks
- Draft pass emails
- Search for deals and contacts

Example queries:
- "Show me my high-priority inbox"
- "What calls do I have this week?"
- "Prepare me for my call with TechCo"
- "Analyze the deck for StartupX"
- "Help me draft a pass email for CompanyY"

## Project Structure

```
ricardosqa/
├── src/
│   ├── app/                      # Next.js app router
│   ├── components/               # React components
│   ├── db/                       # Database
│   ├── lib/                      # Utilities and services
│   └── types/                    # TypeScript types
├── drizzle/                      # Database migrations
├── .env.example                  # Example environment variables
├── package.json                  # Dependencies
└── README.md                     # This file
```

## Development Roadmap

### Phase 1 (MVP) ✅
- [x] Chat interface
- [x] Gmail integration
- [x] Calendar integration
- [x] Deck analysis
- [x] Pass email drafting

### Phase 2 (Next)
- [ ] Attio sync
- [ ] Granola integration
- [ ] Research engine
- [ ] Memo generation
- [ ] Relationship scoring

## Documentation

- [SETUP.md](SETUP.md) - Detailed setup instructions
- [Architecture](docs/architecture.md) - System architecture (coming soon)
- [API Reference](docs/api.md) - API documentation (coming soon)

## Contributing

This is a private project for Point Nine Capital.

## License

Proprietary - Point Nine Capital

---

Built with ❤️ for Point Nine Capital

**Links:**
- [About Ricardo](www.twitter.com/ric0seq)
- [Tech Blog](https://medium.com/@ric0seq)
