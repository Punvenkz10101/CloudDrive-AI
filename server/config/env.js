// Load environment variables before anything else
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// env.js is in server/config/, so:
// - server/.env is at ../.env (one level up)
// - root .env is at ../../.env (two levels up)
const envPath = path.join(__dirname, '..', '.env');
const parentEnvPath = path.join(__dirname, '..', '..', '.env');
const currentDirEnv = path.join(process.cwd(), '.env');

// Try multiple locations
let envLoaded = false;
const pathsToTry = [envPath, parentEnvPath, currentDirEnv];

for (const envFile of pathsToTry) {
  if (fs.existsSync(envFile)) {
    console.log(`[ENV] Attempting to load: ${envFile}`);
    
    // First try dotenv
    const result = dotenv.config({ path: envFile, override: true });
    
    // ALSO manually read and parse the file as backup
    try {
      const envContent = fs.readFileSync(envFile, 'utf-8');
      const lines = envContent.split(/\r?\n/);
      
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          // Force set in process.env (override dotenv if needed)
          process.env[key] = value;
          
          if (key.startsWith('AWS_')) {
            console.log(`  ✓ Manually set ${key} = ${key.includes('SECRET') ? '[REDACTED]' : value.substring(0, 8) + '...'}`);
          }
        }
      }
    } catch (parseError) {
      console.warn(`[ENV] Error manually parsing .env:`, parseError.message);
    }
    
    if (!result.error) {
      const parsed = result.parsed || {};
      const parsedCount = Object.keys(parsed).length;
      console.log(`✓ Loaded .env from: ${envFile}`);
      console.log(`  Parsed ${parsedCount} variables via dotenv`);
    } else {
      console.warn(`⚠ dotenv error (but manually parsed): ${result.error.message}`);
    }
    
    envLoaded = true;
    break; // Stop after first successful load
  } else {
    console.log(`[ENV] File not found: ${envFile}`);
  }
}

// If still not loaded, try default dotenv.config()
if (!envLoaded) {
  const result = dotenv.config({ override: true });
  if (!result.error && Object.keys(result.parsed || {}).length > 0) {
    console.log(`✓ Loaded .env from default location`);
    console.log(`  Parsed ${Object.keys(result.parsed || {}).length} variables`);
    envLoaded = true;
  } else {
    console.warn('⚠ Failed to load .env from any location');
  }
}

// Verify AWS credentials are loaded
if (envLoaded) {
  console.log(`✓ AWS_REGION: ${process.env.AWS_REGION || 'Not set'}`);
  console.log(`✓ AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set (' + process.env.AWS_ACCESS_KEY_ID.substring(0, 8) + '...)' : 'Missing'}`);
  console.log(`✓ AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Missing'}`);
  console.log(`✓ AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || 'Not set'}`);
  console.log(`✓ GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set (' + process.env.GEMINI_API_KEY.substring(0, 8) + '...)' : 'Missing'}`);
} else {
  console.warn('⚠ .env file not found! AWS credentials may not be loaded.');
  console.warn(`   Checked: ${envPath}`);
  console.warn(`   Checked: ${parentEnvPath}`);
}

export default { envLoaded };

