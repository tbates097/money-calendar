# Deployment Guide

## Vercel Deployment with Authentication

This guide covers deploying Money Calendar with full user authentication and multi-device sync to Vercel.

### Prerequisites

1. GitHub repository with your code
2. Vercel account
3. Your code pushed to GitHub

### Step-by-Step Deployment

#### 1. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

#### 2. Add Vercel Postgres Database

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database**
3. Select **Postgres**
4. Choose a database name (e.g., `money-calendar-db`)
5. Select your region
6. Click **Create**

#### 3. Configure Environment Variables

In your Vercel project settings, add these environment variables:

```bash
# Database (automatically added by Vercel Postgres)
DATABASE_URL="your-vercel-postgres-connection-string"
POSTGRES_URL="your-postgres-url"
POSTGRES_PRISMA_URL="your-prisma-url"
POSTGRES_URL_NON_POOLING="your-non-pooling-url"

# Authentication
NEXTAUTH_SECRET="your-super-secret-key-generate-a-random-string"
NEXTAUTH_URL="https://your-app-name.vercel.app"
```

#### 4. Generate NextAuth Secret

Run this command locally to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output and use it as your `NEXTAUTH_SECRET`.

#### 5. Database Migration

The build process now automatically generates the Prisma client. After your first deployment:

1. Install Vercel CLI locally (optional, for manual database operations):
   ```bash
   npm i -g vercel
   ```

2. If you need to manually push the database schema:
   ```bash
   vercel link
   vercel env pull .env.local
   npx prisma db push
   ```

   **Note**: The database schema will be automatically created when your app first connects to the database.

#### 6. Redeploy

After setting up the database, trigger a new deployment:
- Push a commit to your main branch, or
- Go to Vercel dashboard → Deployments → Redeploy

### Environment Variables Explained

- **DATABASE_URL**: Connection string for your Postgres database
- **NEXTAUTH_SECRET**: Secret key for JWT signing (keep this secure!)
- **NEXTAUTH_URL**: Your app's URL (changes from localhost to your Vercel URL)

### Local Development vs Production

#### Local Development:
- Uses SQLite database (`dev.db` file)
- Environment variables from `.env`
- Runs on `http://localhost:3000`

#### Production (Vercel):
- Uses Vercel Postgres database
- Environment variables from Vercel dashboard
- Runs on `https://your-app.vercel.app`

### Data Migration

**From Local to Production:**
- Users will need to create new accounts on production
- Local SQLite data doesn't automatically migrate
- SimpleFIN connections will need to be re-established

**Cross-Device Sync:**
- Once deployed with authentication, all user data syncs across devices
- SimpleFIN connections persist per user account
- No more data loss when switching devices!

### Troubleshooting

#### Database Connection Issues:
1. Check that `DATABASE_URL` is set correctly in Vercel
2. Ensure Prisma schema matches your database
3. Try running `npx prisma db push` again

#### Authentication Issues:
1. Verify `NEXTAUTH_SECRET` is set and secure
2. Check that `NEXTAUTH_URL` matches your deployment URL
3. Ensure all auth routes are working

#### SimpleFIN Issues:
1. SimpleFIN connections are stored per user
2. Users need to reconnect SimpleFIN after creating accounts
3. Check that SimpleFIN API routes are working in production

### Security Notes

- Never commit `.env` files to git
- Use strong, unique values for `NEXTAUTH_SECRET`
- Vercel Postgres connections are encrypted
- User passwords are hashed with bcrypt

### Scaling

The setup automatically scales with Vercel:
- **Database**: Vercel Postgres scales automatically
- **Authentication**: JWT tokens are stateless
- **API Routes**: Serverless functions scale on demand

### Cost

- **Vercel**: Free tier supports this app
- **Vercel Postgres**: Free tier includes 256MB storage
- **Authentication**: No additional costs (self-hosted)

This setup gives you a production-ready Money Calendar with full multi-device sync!
