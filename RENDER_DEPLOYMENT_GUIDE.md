# Render.com Deployment Guide for OctateCode Backend

## Overview
This guide walks you through deploying the OctateCode P2P backend to Render.com using the pre-configured `render.yaml` file.

---

## **Step 1: Create Render Account & Connect GitHub**

### **1a. Sign Up / Login to Render**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended) or create account
3. Authorize Render to access your GitHub repositories

### **1b. Connect GitHub Repository**
1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Select **"Deploy an existing repository from GitHub"**
3. Authorize Render to access your GitHub account if prompted
4. Search for `octatecode-backend` repository
5. Click **"Connect"** to link the repository

---

## **Step 2: Deploy Service from render.yaml**

### **2a. Select Deployment Method**
1. After connecting repo, Render will detect `render.yaml`
2. Click **"Deploy using render.yaml"**
3. ⚠️ **IMPORTANT:** If it asks to override, confirm you want to use the YAML config

### **2b. Verify Service Configuration**
Render should auto-populate from `render.yaml`:

```
Name:              octatecode-p2p-backend
Runtime:           Node
Region:            Oregon (or your preference)
Branch:            main
Build Command:     npm install && npm run build
Start Command:     npm start
Health Check:      /api/health
Auto-Deploy:       Enabled
```

✅ **All these are pre-configured in render.yaml**

---

## **Step 3: Add Environment Variables**

### **3a. Navigate to Environment Variables**
1. In Render dashboard for your service, click **"Environment"** tab
2. Click **"Add Environment Variable"** for each:

### **3b. Add Required Environment Variables**

**Click "Add Environment Variable" for each:**

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Already in render.yaml |
| `PORT` | `3000` | Already in render.yaml |
| `SIGNALING_PORT` | `3001` | Already in render.yaml |
| `SUPABASE_URL` | `https://your-project.supabase.co` | ⚠️ Get from your Supabase project settings |
| `SUPABASE_KEY` | `your_supabase_anon_key` | ⚠️ Get from Supabase → Settings → API |
| `JWT_SECRET` | `your-random-jwt-secret` | Generate: `openssl rand -base64 32` |
| `ADMIN_API_KEY` | `your-admin-api-key` | For /api/admin endpoints |
| `CORS_ORIGINS` | `https://octatecode-frontend.onrender.com,https://localhost:3000` | Frontend URLs |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Already in render.yaml |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Already in render.yaml |
| `LOG_LEVEL` | `info` | info/debug/error |

### **3c. Get Supabase Credentials**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Navigate to **Settings → API** (left sidebar)
4. Copy:
   - **Project URL** → paste as `SUPABASE_URL`
   - **Anon Public** key → paste as `SUPABASE_KEY`

### **3d. Generate JWT Secret**
```bash
# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString())) -replace '=+$'

# macOS/Linux
openssl rand -base64 32
```

---

## **Step 4: Deploy**

### **4a. Click "Create Web Service"**
Render will:
1. ✅ Clone the repository
2. ✅ Install dependencies (`npm install`)
3. ✅ Build the project (`npm run build`)
4. ✅ Start the server (`npm start`)

### **4b. Monitor Deployment**
1. Watch the **"Logs"** tab for deployment progress
2. Expected log output:
   ```
   ═══════════════════════════════════════════════
      🚀 OctateCode P2P Collaboration Server
   ═══════════════════════════════════════════════

      Environment: production
      HTTP Port:   3000
      WebSocket:   3001

   ✅ Ready for connections
   ```

### **4c. Wait for Service to Become "Live" ✅**
- Green status = ✅ Ready
- Yellow status = ⏳ Deploying
- Red status = ❌ Error (check logs)

---

## **Step 5: Verify Deployment**

### **5a. Get Your Production URL**
1. In Render dashboard, find your service
2. URL format: `https://octatecode-p2p-backend-xxxxx.onrender.com`
3. Copy this URL

### **5b. Test Health Endpoint**
```bash
# Test HTTP health check (should return 200)
curl https://octatecode-p2p-backend-xxxxx.onrender.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-03-31T..."}
```

### **5c. Test API Endpoints**
```bash
# List rooms
curl https://octatecode-p2p-backend-xxxxx.onrender.com/api/rooms

# Expected response:
# {"status":"ok","rooms":[]}

# Check metrics (Prometheus format)
curl https://octatecode-p2p-backend-xxxxx.onrender.com/api/metrics
```

---

## **Step 6: Enable Auto-Deploy (Optional)**

### **6a. GitHub Webhook Already Configured**
The `render.yaml` has `autoDeploy: true`, which means:
- ✅ Every push to `main` branch automatically triggers deployment
- ✅ No manual redeploy needed

### **6b. Manual Redeploy if Needed**
1. In Render dashboard, click **"Manual Deploy"** → **"Deploy Latest Commit"**

---

## **Step 7: Cron Job for Keep-Alive (Optional)**

The `render.yaml` includes a keep-alive cron job that:
- Pings `/api/health` every 13 minutes
- Prevents Render from suspending the service on free tier
- ✅ **Already configured** (runs automatically if free tier detected)

---

## **Step 8: Update Frontend Configuration**

Once deployment is complete, update frontend URLs:

### **8a. In your OctateCode frontend, update:**
```
.env.production:
VITE_API_BASE_URL=https://octatecode-p2p-backend-xxxxx.onrender.com
VITE_WS_URL=wss://octatecode-p2p-backend-xxxxx.onrender.com
```

### **8b. Update Onboarding Component**
In `src/vs/workbench/contrib/void/browser/react/src/void-onboarding/api.ts`:
```typescript
const API_BASE_URL = 'https://octatecode-p2p-backend-xxxxx.onrender.com';
const WS_URL = 'wss://octatecode-p2p-backend-xxxxx.onrender.com';
```

---

## **Troubleshooting**

### **❌ Deployment Fails: "npm install failed"**
- **Cause:** Missing dependencies
- **Fix:** Run locally first: `npm install && npm run build`
- **Then push:** `git add -A && git commit -m "fix deps" && git push origin main`

### **❌ Service Not Reaching "Ready" (Red Status)**
- **Check logs:** Click **"Logs"** tab in Render
- **Look for errors** in startup sequence
- **Common issues:**
  - Missing environment variables (JWT_SECRET, SUPABASE_KEY)
  - Port conflict
  - Database connection failure

### **❌ Health Check Failing**
- **Error:** Health check endpoint not responding
- **Fix:** Ensure `/api/health` is implemented in `p2pServer.ts`
- **Verify locally:** `npm run dev` then `curl http://localhost:3000/api/health`

### **❌ WebSocket Connection Failing**
- **Error:** `wss://` connection times out
- **Fix:** Verify WebSocket is running on port 3001 in production
- **Check:** Look for WebSocket initialization logs

### **❌ "Permission denied" on git push**
- **Fix:** Use GitHub personal access token:
```bash
git remote set-url origin https://YOUR_TOKEN@github.com/preetbiswas12/octatecode-backend.git
git push origin main
```

---

## **Post-Deployment Checklist**

- [ ] ✅ Render service shows "Live" (green status)
- [ ] ✅ Health check returns 200 OK
- [ ] ✅ /api/metrics endpoint returns Prometheus format
- [ ] ✅ Environment variables are set (check Settings → Environment)
- [ ] ✅ Auto-deploy enabled (`autoDeploy: true` in render.yaml)
- [ ] ✅ Production URL documented
- [ ] ✅ Frontend updated with production URL
- [ ] ✅ CORS origins configured correctly
- [ ] ✅ SSL/TLS working (automatic with Render)
- [ ] ✅ Rate limiting active (test with rapid requests)

---

## **Production URL Structure**

Once deployed, your service URL will be:
```
https://octatecode-p2p-backend-[random-id].onrender.com
```

**Use this URL for:**
- Frontend API calls: `https://octatecode-p2p-backend-[random-id].onrender.com/api/*`
- WebSocket connections: `wss://octatecode-p2p-backend-[random-id].onrender.com`
- Monitoring: `https://octatecode-p2p-backend-[random-id].onrender.com/api/metrics`

---

## **Next Steps**

After deployment is verified:
1. ✅ Update frontend with production backend URL
2. ✅ Build React components (void-onboarding, settings, etc.)
3. ✅ Test frontend→backend integration
4. ✅ Deploy frontend to Render or Vercel
5. ✅ Set up monitoring (Prometheus + Grafana)
6. ✅ Configure DNS (if using custom domain)

---

## **Support**

**For Render-specific issues:**
- Documentation: https://render.com/docs
- Status page: https://status.render.com
- Support: https://render.com/support

**For OctateCode issues:**
- Check `/api/health` endpoint
- Review server logs in Render dashboard
- Verify environment variables
- Check rate limiting isn't triggered

