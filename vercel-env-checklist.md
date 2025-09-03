# Vercel Environment Variables Checklist

## Required Environment Variables

### 🔐 Authentication Variables
- [ ] `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- [ ] `NEXTAUTH_URL` - Your Vercel app URL (e.g., `https://your-app.vercel.app`)

### 🗄️ Database Variables (from Vercel Postgres)
- [ ] `DATABASE_URL` - Main connection string
- [ ] `POSTGRES_URL` - Postgres connection URL
- [ ] `POSTGRES_PRISMA_URL` - Prisma-specific URL
- [ ] `POSTGRES_URL_NON_POOLING` - Non-pooling connection

## How to Set These Up

### 1. Create Vercel Postgres Database
1. In Vercel dashboard → **Storage** tab
2. **Create Database** → **Postgres**
3. Choose name and region
4. **Create** - this automatically adds the DATABASE_URL variables

### 2. Set Authentication Variables
1. In Vercel dashboard → **Settings** → **Environment Variables**
2. Add `NEXTAUTH_SECRET`:
   ```bash
   # Generate locally:
   openssl rand -base64 32
   # Copy the output and paste as the value
   ```
3. Add `NEXTAUTH_URL`:
   ```
   https://your-app-name.vercel.app
   ```

### 3. Deploy Database Schema
After setting environment variables, you need to create the database tables:

```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Push database schema
npx prisma db push
```

## Common Issues

### Missing NEXTAUTH_SECRET
- **Error**: 500 on auth routes
- **Fix**: Add `NEXTAUTH_SECRET` environment variable

### Wrong NEXTAUTH_URL
- **Error**: Redirect issues, 500 errors
- **Fix**: Set `NEXTAUTH_URL` to your exact Vercel URL (with https://)

### Database Not Created
- **Error**: Database connection errors
- **Fix**: Run `npx prisma db push` after setting up Vercel Postgres

### Environment Variables Not Applied
- **Error**: Still getting 500 after setting variables
- **Fix**: Redeploy your app after adding environment variables

## Quick Debug Steps

1. **Check Vercel Logs**:
   - Go to Vercel dashboard → **Functions** tab
   - Look for error details in the logs

2. **Verify Database Connection**:
   - Ensure Vercel Postgres is created and connected
   - Check that all 4 database environment variables are set

3. **Test Locally**:
   - Pull production env vars: `vercel env pull .env.local`
   - Test locally: `npm run dev`
   - If it works locally, the issue is deployment-specific

4. **Force Redeploy**:
   - After adding environment variables, trigger a new deployment
   - Go to Vercel dashboard → **Deployments** → **Redeploy**
