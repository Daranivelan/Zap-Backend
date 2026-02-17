# Railway Deployment Guide for Zap Backend

## Prerequisites

- Railway account (sign up at https://railway.app/)
- GitHub repository connected
- PostgreSQL database (Railway provides this)
- **Node.js 20.19+ or higher** (configured automatically via `.nvmrc` and `nixpacks.toml`)

## Important Notes

⚠️ **Node.js Version Requirement**: This project uses Prisma 7.3.0, which requires Node.js 20.19+, 22.12+, or 24.0+. Railway has been configured to use Node.js 20 via:

- `.nvmrc` file
- `.node-version` file
- `nixpacks.toml` file
- `package.json` engines field

## Step-by-Step Deployment

### 1. Create a New Project on Railway

1. Go to https://railway.app/
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `Zap-Backend` repository
5. Railway will automatically detect it's a Node.js project

### 2. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a Postgres instance
4. Click on the Postgres service to see connection details

### 3. Configure Environment Variables

Click on your backend service, go to "Variables" tab, and add:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secret-jwt-key-change-this
FRONTEND_URL=https://zap-frontend-nine.vercel.app
PORT=5001
NODE_ENV=production
```

**Important:**

- `DATABASE_URL` and `DIRECT_URL` should reference your Railway Postgres service
- Change `JWT_SECRET` to a strong random string
- Update `FRONTEND_URL` to your actual frontend URL

### 4. Run Database Migration

After the first deployment, you need to push your Prisma schema:

**Option A: Using Railway CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run migration
railway run npm run db:push
```

**Option B: Using One-off Command in Railway Dashboard**

1. Go to your backend service in Railway
2. Click "Settings" → "One-off Commands"
3. Run: `npm run db:push`

### 5. Get Your Backend URL

Once deployed, Railway will provide a URL like:

```
https://your-app-name.up.railway.app
```

### 6. Update Frontend Environment Variables

Update your frontend's `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` in Vercel:

```
NEXT_PUBLIC_API_URL=https://your-app-name.up.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-app-name.up.railway.app
```

### 7. Update CORS Configuration

The backend is already configured to accept your frontend URL, but if you need to add more:

Edit `src/index.ts` and add to `allowedOrigins` array.

## Testing Your Deployment

1. Visit your Railway URL root: `https://your-app-name.up.railway.app/`
   - Should see API information
2. Check health endpoint: `https://your-app-name.up.railway.app/health`
   - Should return `{"status":"OK","timestamp":"..."}`

## Troubleshooting

### Build Fails

- Check Railway build logs
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### Database Connection Issues

- Verify `DATABASE_URL` is correctly set
- Run `npm run db:push` to sync schema
- Check Postgres service is running

### CORS Errors

- Ensure `FRONTEND_URL` environment variable is set
- Verify frontend URL is in `allowedOrigins` array
- Check browser console for specific CORS error

### WebSocket Issues

- Railway supports WebSockets by default
- Ensure client uses correct WebSocket URL
- Check for connection errors in browser console

## Monitoring

Railway provides:

- Real-time logs
- Metrics (CPU, Memory, Network)
- Deployment history
- Database backups

Access these from your service dashboard.

## Cost

Railway offers:

- $5/month free trial credit
- Pay-as-you-go after trial
- ~$0.000231/GB-hour for compute
- Postgres included in compute costs

## Support

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- GitHub Issues: Create an issue in your repo
