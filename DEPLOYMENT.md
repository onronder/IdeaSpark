# IdeaSpark Deployment Guide

This guide covers deploying the IdeaSpark backend to production using Supabase and various hosting platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Migration](#database-migration)
5. [Deployment Options](#deployment-options)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- Supabase project created
- Docker installed (for local development)
- Node.js 22+ installed
- Git repository set up

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project reference ID (you'll need this for CLI linking)

### 2. Install and Link Supabase CLI

We use Supabase CLI for database management and migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
npx supabase login

# Link to your project (run from server directory)
cd server
npx supabase link --project-ref your-project-ref

# Start local Supabase (optional for local development)
npx supabase start
```

### 3. Database Configuration

For **local development** with Supabase CLI:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

For **production** (get these from Supabase dashboard):
- **Direct connection** (port 5432) - Use for migrations and long-running processes
- **Pooler connection** (port 6543) - Use for serverless/API connections

```bash
# Migrations (direct connection)
SUPABASE_DB_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres

# API connections (pooler - recommended for production)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Important Notes:**
- Use pooler (port 6543) for serverless/edge functions to avoid connection exhaustion
- Use direct connection (port 5432) for migrations and seeding
- Set `connection_limit=1` for serverless environments (Railway, Vercel, etc.)
- Supabase CLI automatically manages connections when linked

### 4. Enable Required Extensions

In Supabase SQL Editor, run:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for secure random generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file (never commit this):

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (Supabase - use pooler for serverless)
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Redis (Upstash, Redis Labs, or ElastiCache)
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your-redis-password

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-production-refresh-secret-min-32-chars
SESSION_SECRET=your-production-session-secret-min-32-chars

# OpenAI
OPENAI_API_KEY=sk-your-production-openai-key
OPENAI_MODEL=gpt-4o-mini

# IAP (In-App Purchases)
APPLE_SHARED_SECRET=your-apple-shared-secret
APPLE_ENVIRONMENT=production
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
GOOGLE_PACKAGE_NAME=com.ideaspark.app

# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# SendGrid
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Analytics
AMPLITUDE_API_KEY=your-amplitude-api-key

# Security
COOKIE_SECURE=true
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5

# Cost Management
DAILY_AI_COST_LIMIT=100
```

---

## Database Migration

### Initial Setup

```bash
cd server

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npx prisma db seed
```

### Migration Commands

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

---

## Deployment Options

### Option 1: Railway

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Initialize Project**
   ```bash
   railway init
   railway link
   ```

3. **Configure Environment Variables**
   ```bash
   railway variables set DATABASE_URL="postgresql://..."
   railway variables set OPENAI_API_KEY="sk-..."
   # ... set all production variables
   ```

4. **Deploy**
   ```bash
   cd server
   railway up
   ```

5. **Run Migrations**
   ```bash
   railway run npx prisma migrate deploy
   ```

### Option 2: Render

1. **Create New Web Service**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Select `server` directory as root

2. **Configure Build Settings**
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npx prisma migrate deploy && node dist/index.js`
   - Environment: Node

3. **Add Environment Variables**
   - Add all production variables from `.env.production`

4. **Deploy**
   - Click "Create Web Service"
   - Render will auto-deploy on git push

### Option 3: Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Initialize Fly App**
   ```bash
   cd server
   fly launch
   ```

3. **Configure `fly.toml`**
   ```toml
   app = "ideaspark-api"
   primary_region = "iad"

   [build]
     dockerfile = "Dockerfile"

   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 1

   [[services]]
     internal_port = 3000
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]

   [env]
     NODE_ENV = "production"
     PORT = "3000"
   ```

4. **Set Secrets**
   ```bash
   fly secrets set DATABASE_URL="postgresql://..."
   fly secrets set OPENAI_API_KEY="sk-..."
   # ... set all sensitive variables
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

6. **Run Migrations**
   ```bash
   fly ssh console
   npx prisma migrate deploy
   exit
   ```

### Option 4: Docker + Cloud Run (GCP)

1. **Build Docker Image**
   ```bash
   cd server
   docker build -t gcr.io/[PROJECT_ID]/ideaspark-api:latest .
   ```

2. **Push to Google Container Registry**
   ```bash
   docker push gcr.io/[PROJECT_ID]/ideaspark-api:latest
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy ideaspark-api \
     --image gcr.io/[PROJECT_ID]/ideaspark-api:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL="postgresql://..." \
     --set-env-vars OPENAI_API_KEY="sk-..." \
     --min-instances 1 \
     --max-instances 10
   ```

---

## Post-Deployment

### 1. Health Check

```bash
# Check health endpoint
curl https://your-api-domain.com/health

# Expected response:
# {"status":"healthy","timestamp":"2024-11-20T...","uptime":123}
```

### 2. Run Smoke Tests

```bash
# Test authentication
curl -X POST https://your-api-domain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Test database connection
curl https://your-api-domain.com/api/v1/ideas
```

### 3. Configure DNS

1. Point your domain to the deployment platform
2. Enable SSL/TLS certificate
3. Configure CORS origins in environment variables

### 4. Set Up Monitoring

- **Sentry**: Verify error tracking is working
- **Logs**: Configure log aggregation
- **Alerts**: Set up alerts for:
  - High error rates (> 5%)
  - Slow response times (> 1s)
  - High AI costs (> daily limit)
  - Database connection failures

---

## Monitoring & Maintenance

### Health Monitoring

```bash
# Health check endpoint
GET /health

# Response:
{
  "status": "healthy",
  "timestamp": "2024-11-20T10:00:00Z",
  "uptime": 86400,
  "services": {
    "database": "connected",
    "redis": "connected",
    "openai": "reachable"
  }
}
```

### Log Monitoring

```bash
# View logs (Railway)
railway logs

# View logs (Render)
# Available in Render dashboard

# View logs (Fly.io)
fly logs

# View logs (Docker)
docker logs ideaspark-api
```

### Database Maintenance

```bash
# Backup database (Supabase Dashboard)
# Go to: Database → Backups → Create Backup

# Restore from backup
# Use Supabase dashboard

# Monitor database size
SELECT pg_size_pretty(pg_database_size('postgres'));

# Monitor active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres';
```

### Cost Monitoring

1. **OpenAI Usage**
   ```bash
   GET /api/v1/analytics/admin/usage?startDate=2024-11-01&endDate=2024-11-30
   ```

2. **Set Budget Alerts**
   - OpenAI: Set usage alerts in OpenAI dashboard
   - Supabase: Monitor database usage
   - Hosting: Set billing alerts

### Scaling Considerations

1. **Database Connection Pooling**
   - Use Supabase pooler (port 6543)
   - Limit connections with `connection_limit=1`

2. **Redis Caching**
   - Cache frequently accessed data
   - Set appropriate TTLs
   - Monitor cache hit rates

3. **Horizontal Scaling**
   - Most platforms auto-scale
   - Configure min/max instances
   - Monitor response times

---

## Rollback Procedure

### Quick Rollback

```bash
# Railway
railway rollback

# Render
# Use Render dashboard to redeploy previous version

# Fly.io
fly deploy --image gcr.io/[PROJECT_ID]/ideaspark-api:[PREVIOUS_TAG]
```

### Database Rollback

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back [MIGRATION_NAME]

# Restore from backup (use Supabase dashboard)
```

---

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify DATABASE_URL is correct
   - Check if using pooler connection for serverless
   - Ensure Supabase project is not paused

2. **Migration Failures**
   - Check migration files for errors
   - Ensure database user has necessary permissions
   - Run `npx prisma migrate status`

3. **High Memory Usage**
   - Monitor Prisma connection pool
   - Check for memory leaks
   - Increase instance size if needed

4. **Slow Response Times**
   - Enable database query logging
   - Add database indexes
   - Optimize N+1 queries
   - Increase Redis cache usage

---

## Security Checklist

- [ ] All secrets stored in environment variables
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS protection
- [ ] CSRF tokens for state-changing operations
- [ ] Secrets rotation schedule documented
- [ ] Database backups enabled
- [ ] Error messages don't expose sensitive info
- [ ] Logging excludes PII

---

## Support

For issues:
1. Check application logs
2. Review Sentry error reports
3. Monitor database performance
4. Check third-party service status (OpenAI, Supabase, etc.)
