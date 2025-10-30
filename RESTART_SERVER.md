# Restart Server to Fix Gemini Model Error

## Problem
The server is still using the old `gemini-1.5-flash` model. You need to restart the server to load the fix.

## Solution

### Step 1: Stop the Server
In the terminal where the server is running, press:
```
Ctrl + C
```

### Step 2: Restart the Server
```powershell
npm run dev:full
```

Or if you're running server separately:
```powershell
npm run server
```

## Verify the Fix

After restarting, check the server console. You should see:
```
[Gemini] Using model: gemini-pro
```

Instead of the old `gemini-1.5-flash` error.

## Alternative: Kill Node Processes

If Ctrl+C doesn't work, you can kill all node processes:

**PowerShell:**
```powershell
Get-Process node | Stop-Process -Force
```

Then restart:
```powershell
npm run dev:full
```

## What Changed
- Model changed from `gemini-1.5-flash` → `gemini-pro`
- The fix is in `server/lib/gemini_ai.js` line 49
- Server needs restart to load new code

After restart, try asking "what is my srn" again.

