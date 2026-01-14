# Setup Guide for P9 VC Assistant

This guide will walk you through setting up the P9 VC Assistant from scratch.

## Step 1: Google Cloud Setup

### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "P9 VC Assistant"
4. Click "Create"

### Enable Required APIs

1. In the Cloud Console, go to "APIs & Services" → "Library"
2. Search for and enable each of these APIs:
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - Google Cloud Storage API

### Set Up OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "Internal" (if using Google Workspace) or "External"
3. Fill in the required fields:
   - App name: P9 VC Assistant
   - User support email: your-email@pointnine.com
   - Developer contact: your-email@pointnine.com
4. Click "Save and Continue"
5. Add scopes:
   - `.../auth/gmail.readonly`
   - `.../auth/gmail.compose`
   - `.../auth/calendar.readonly`
   - `.../auth/drive.readonly`
6. Click "Save and Continue"
7. Add test users (your email)
8. Click "Save and Continue"

### Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Name it "P9 VC Assistant Web Client"
5. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.vercel.app/api/auth/callback/google` (for production)
6. Click "Create"
7. Copy the Client ID and Client Secret

### Set Up Google Cloud Storage

1. Go to "Cloud Storage" → "Buckets"
2. Click "Create Bucket"
3. Name it "p9-assistant-decks"
4. Choose your region
5. Set access control to "Uniform"
6. Click "Create"

## Step 2: Anthropic API Setup

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Go to "API Keys"
4. Click "Create Key"
5. Name it "P9 VC Assistant"
6. Copy the API key (you won't see it again!)

## Step 3: Database Setup

### Option A: Local PostgreSQL

1. Install PostgreSQL:
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql

   # Ubuntu
   sudo apt-get install postgresql
   sudo service postgresql start
   ```

2. Create database:
   ```bash
   psql postgres
   CREATE DATABASE p9_assistant;
   CREATE USER p9user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE p9_assistant TO p9user;
   \q
   ```

3. Your DATABASE_URL:
   ```
   postgresql://p9user:your_password@localhost:5432/p9_assistant
   ```

### Option B: Railway (Recommended for Production)

1. Go to [Railway.app](https://railway.app/)
2. Sign up with GitHub
3. Click "New Project" → "Provision PostgreSQL"
4. Click on the PostgreSQL service
5. Go to "Connect" tab
6. Copy the "Postgres Connection URL"
7. This is your DATABASE_URL

## Step 4: Optional Integrations

### Attio

1. Go to [Attio](https://attio.com/)
2. Log in to your account
3. Go to Settings → API
4. Create a new API key
5. Copy the key

### Zendesk

1. Go to your Zendesk admin panel
2. Navigate to Admin → Channels → API
3. Enable "Token Access"
4. Click "Add API Token"
5. Copy the token
6. You'll need:
   - Subdomain: `your-company` (from `your-company.zendesk.com`)
   - Email: your Zendesk email
   - API Token: the token you just created

### Granola

1. Contact Granola support for API access
2. Once approved, get your API key from their dashboard

## Step 5: Project Setup

### Clone and Install

```bash
git clone https://github.com/yourusername/ricardosqa.git
cd ricardosqa
npm install
```

### Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# Google Cloud Storage
GCS_BUCKET_NAME="p9-assistant-decks"
GCS_PROJECT_ID="your-project-id"

# Optional: Attio
ATTIO_API_KEY="your-attio-key"

# Optional: Zendesk
ZENDESK_SUBDOMAIN="your-subdomain"
ZENDESK_EMAIL="your-email@company.com"
ZENDESK_API_TOKEN="your-zendesk-token"

# Optional: Granola
GRANOLA_API_KEY="your-granola-key"
```

### Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output to `NEXTAUTH_SECRET` in your `.env` file.

### Set Up Database

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Drizzle Studio to view database
npm run db:studio
```

## Step 6: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 7: Deploy to Production

### Deploy Frontend to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Click "Import Project"
4. Select your GitHub repository
5. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: .next
6. Add all environment variables from your `.env` file
7. Update `NEXTAUTH_URL` to your Vercel domain: `https://your-app.vercel.app`
8. Update Google OAuth redirect URI to: `https://your-app.vercel.app/api/auth/callback/google`
9. Click "Deploy"

### Database (Railway)

If using Railway:
1. Database is already running
2. Run migrations:
   ```bash
   npm run db:migrate
   ```

## Troubleshooting

### OAuth Issues

- Make sure redirect URIs match exactly (including http vs https)
- Check that all required scopes are added
- Verify the OAuth consent screen is published (for external apps)

### Database Connection

- Check that DATABASE_URL is correct
- Ensure database user has proper permissions
- Verify the database exists

### API Errors

- Check that all API keys are valid and not expired
- Verify API quotas haven't been exceeded
- Check API error logs in respective dashboards

## Next Steps

1. Test the chat interface
2. Connect your Gmail account
3. Sync your calendar
4. Upload a test pitch deck
5. Try drafting a pass email
6. Invite your team members

## Support

For issues or questions:
- Check the [README](README.md) for general information
- Review error logs: `npm run dev` shows detailed errors
- Contact: ricardo@pointnine.com
