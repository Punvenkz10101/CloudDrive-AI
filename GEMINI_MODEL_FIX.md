# Gemini Model Fix

## Issue Fixed

The error `models/gemini-1.5-flash is not found for API version v1beta` has been resolved by:

1. **Changed default model** from `gemini-1.5-flash` to `gemini-pro` (most widely supported)
2. **Added model configuration** via environment variable
3. **Improved error messages** with specific guidance

## Quick Fix

The code now uses `gemini-pro` by default. If you still get errors, you can configure a different model in your `.env` file.

### Option 1: Use gemini-pro (Default - Recommended)

No changes needed! The system now uses `gemini-pro` by default.

### Option 2: Use a Different Model

If you want to use a different model, add this to your `server/.env` file:

```env
GEMINI_MODEL=gemini-1.5-pro
```

Or try:
```env
GEMINI_MODEL=gemini-pro
```

### Option 3: Check Your API Key

Make sure your `GEMINI_API_KEY` in `server/.env` is valid:

1. Go to https://makersuite.google.com/app/apikey
2. Create or copy your API key
3. Add it to `server/.env`:

```env
GEMINI_API_KEY=your_api_key_here
```

## Available Models

Common model names you can try:
- `gemini-pro` (recommended, widely available)
- `gemini-1.5-pro` (if available for your API key)
- `gemini-1.5-flash-latest` (fast model, if available)
- `gemini-pro-vision` (for image analysis)

## Testing

After updating your `.env` file, restart your server:

```powershell
# Stop the server (Ctrl+C)
# Then restart
npm run dev:full
```

## What Changed

- **Before**: Used `gemini-1.5-flash` which wasn't available
- **After**: Uses `gemini-pro` by default, with option to override via `GEMINI_MODEL`

The system will now work with the standard `gemini-pro` model which is available to all API keys.

