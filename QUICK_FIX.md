# Quick Fix: 404 Error on /api/search/ai

## Problem
Getting `Cannot POST /api/search/ai` error (404 Not Found)

## Solution

### Step 1: Restart the Server
The route was just added - you need to restart your server:

**If running with npm:**
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run server
# Or if using concurrently:
npm run dev:full
```

**If running directly with node:**
```bash
# Stop the server (Ctrl+C)
# Then restart:
node server/index.js
```

### Step 2: Verify Routes Are Loaded
After restarting, check the console output. You should see:
```
[Search Router] Route module loaded
✓ Registered /api/search routes
```

### Step 3: Test the Route
Once the server is running, test it:

```bash
# In browser console or using curl:
curl -X POST http://localhost:8080/api/search/ai \
  -H "Content-Type: application/json" \
  -d '{"query":"test","type":"answer"}'
```

Or test the test endpoint:
```
GET http://localhost:8080/api/search/test
```

### Step 4: Check for Import Errors
If routes still don't load, check for any import errors in the console. Common issues:

1. **Missing package:**
   ```bash
   npm install @google/generative-ai
   ```

2. **Gemini API key warning:**
   - This is fine - just make sure `GEMINI_API_KEY` is in `.env`
   - The route will still work, just won't be able to generate answers

### Step 5: Verify Route Structure
The route structure is:
```
POST /api/search/ai
```

Frontend calls: `apiFetch('/search/ai', { method: 'POST', ... })`
Which becomes: `http://localhost:8080/api/search/ai`

## Still Not Working?

1. Check server logs for errors during startup
2. Verify `server/routes/search.js` exists and exports the router
3. Check that `server/index.js` imports and uses `searchRouter`
4. Verify no syntax errors: `node --check server/routes/search.js`




