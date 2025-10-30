import { GoogleGenerativeAI } from '@google/generative-ai';

// Get Gemini API key from environment (check multiple possible names)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 
                       process.env.VITE_GEMINI_API_KEY ||
                       process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('⚠ GEMINI_API_KEY not found in environment variables');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Cache for working model to avoid repeated detection
let cachedWorkingModel = null;

/**
 * Retry function with exponential backoff for rate limit errors
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const errorMsg = error.message || String(error);
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('Too Many Requests') || errorMsg.includes('Resource exhausted');
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[Gemini] Rate limit hit. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Generate AI answer using Gemini API based on document content
 * @param {string} query - User's question
 * @param {string} context - Document content from OCR
 * @returns {Promise<string>} AI-generated answer
 */
export async function getAIAnswer(query, context) {
  try {
    if (!genAI) {
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in .env');
    }
    
    // Limit context to avoid token limits (Gemini has generous limits but still good to manage)
    let limitedContext = context;
    if (context.length > 30000) {
      // Split intelligently to keep important parts
      const chunks = context.split('\n\n');
      limitedContext = '';
      let currentLength = 0;
      for (const chunk of chunks) {
        if (currentLength + chunk.length <= 30000) {
          limitedContext += (limitedContext ? '\n\n' : '') + chunk;
          currentLength += chunk.length;
        } else {
          const remaining = 30000 - currentLength;
          if (remaining > 100) {
            limitedContext += '\n\n' + chunk.substring(0, remaining) + '...';
          }
          break;
        }
      }
    }
    
    // Prepare list of models to try (in order of preference)
    // Based on official Gemini API: https://ai.google.dev/models/gemini
    // Latest models: gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro
    let modelsToTry = [
      process.env.GEMINI_MODEL, // User-specified first (if set)
      'gemini-2.0-flash',       // Latest 2.0 model (from official API docs)
      'gemini-2.0',             // 2.0 variant
      'gemini-1.5-flash',       // Fast model (widely available)
      'gemini-1.5-pro',         // Pro model (better quality)
      'gemini-pro',             // Legacy model (fallback)
      // Variants with -latest suffix (try if standard names don't work)
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
    ].filter(Boolean); // Remove undefined values
    
    // Default fallback
    if (modelsToTry.length === 0) {
      modelsToTry.push('gemini-2.0-flash');
    }
    
    console.log(`[Gemini] Will try ${modelsToTry.length} models in order: ${modelsToTry.join(', ')}`);
    
    // Use cached model if available and it's still in our list
    if (cachedWorkingModel && modelsToTry.includes(cachedWorkingModel)) {
      console.log(`[Gemini] Using cached model: ${cachedWorkingModel}`);
      modelsToTry = [cachedWorkingModel, ...modelsToTry.filter(m => m !== cachedWorkingModel)];
    }
    
    const prompt = `You are an expert document analysis assistant. Analyze the OCR-extracted text from user's documents and provide accurate, well-formatted, professional answers.

OCR-EXTRACTED DOCUMENT CONTENT:
${limitedContext}

USER QUESTION: ${query}

CRITICAL INSTRUCTIONS:
1. **EXTRACT ANY RELEVANT INFO**: Even if the exact query doesn't match, look for ANY related information in the documents that could answer the question.
2. **BE CREATIVE WITH MATCHES**: If the user asks for "aptitude topics" look for words like "topics", "subjects", "content", "areas", "chapters", "sections", etc.
3. **USE ALL FILES**: The documents may include multiple files. Check ALL files for relevant information, not just the first one.
4. **CITE SOURCES**: Always mention which file(s) contain the information (use the filename provided).
5. **MARKDOWN FORMATTING**:
   - Use **bold** for headers and important terms
   - Use bullet points (•) for lists
   - Use proper spacing between sections
6. **STRUCTURE**: 
   - Direct answer first
   - Supporting details below
   - Clear sections if applicable
7. **BE HELPFUL**: Even if you find partial information, provide what you can. List whatever topics, keywords, or content you find that might be related.

IMPORTANT: The user may have uploaded multiple files with different content. Make sure to check ALL files for the answer, and be creative in finding related information.

USER QUESTION: ${query}

Provide a well-formatted, professional answer based EXCLUSIVELY on the OCR-extracted content above.`;

    // Try generating content with each model until one works
    let result;
    let response;
    let answer;
    let lastError = null;
    let workingModelName = null;
    
    // Helper function to try a model with retry logic
    const tryModel = async (modelName) => {
      return await retryWithBackoff(async () => {
        const testModel = genAI.getGenerativeModel({ model: modelName });
        result = await testModel.generateContent(prompt);
        response = await result.response;
        answer = response.text();
        return answer;
      }, 3, 2000); // 3 retries with 2s initial delay
    };
    
    // Try each model in order until one works
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelName = modelsToTry[i];
      try {
        console.log(`[Gemini] [${i + 1}/${modelsToTry.length}] Attempting model: ${modelName}`);
        answer = await tryModel(modelName);
        
        // Success! Cache this model and break
        cachedWorkingModel = modelName;
        workingModelName = modelName;
        console.log(`[Gemini] ✓ SUCCESS! Using model: ${modelName} (extracted ${answer.length} chars)`);
        break;
      } catch (modelError) {
        const errorMsg = modelError.message || String(modelError);
        console.log(`[Gemini] ✗ Model ${modelName} failed (${i + 1}/${modelsToTry.length}): ${errorMsg.substring(0, 150)}`);
        lastError = modelError;
        
        // If it's a model-not-found error, continue to next model
        if (errorMsg.includes('not found') || errorMsg.includes('404') || errorMsg.includes('not supported')) {
          if (i < modelsToTry.length - 1) {
            console.log(`[Gemini] → Trying next model...`);
            continue;
          } else {
            // Last model failed
            throw new Error(`All ${modelsToTry.length} models failed. Last error: ${errorMsg}`);
          }
        }
        
        // If it's a rate limit error, try next model instead of failing
        if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests') || errorMsg.includes('Resource exhausted')) {
          console.log(`[Gemini] Rate limit for ${modelName}, trying next model...`);
          if (i < modelsToTry.length - 1) {
            continue;
          }
        }
        
        // For other errors, don't try other models (likely API key issue, etc.)
        throw modelError;
      }
    }
    
    // If we tried all models and none worked
    if (!answer) {
      throw new Error(`Could not find a working Gemini model. Tried: ${modelsToTry.join(', ')}. Last error: ${lastError?.message || 'Unknown'}`);
    }
    
    return answer.trim();
    
  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Check for rate limit errors - throw so caller can handle with retry logic
    if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('Resource exhausted'))) {
      // Throw the error so the search route can handle retries
      throw new Error('RATE_LIMIT: 429 Too Many Requests - Resource exhausted');
    }
    
    // Provide helpful error messages for common issues and throw
    if (error.message && (error.message.includes('not found for API version') || error.message.includes('not found') || error.message.includes('404'))) {
      throw new Error(`MODEL_NOT_FOUND: None of the available Gemini models worked with your API key. The system tried multiple models (gemini-1.5-flash-latest, gemini-1.5-pro-latest, etc.) but all returned "model not found" errors. Please check your API key and model availability.`);
    }
    
    if (error.message && error.message.includes('API key')) {
      throw new Error('INVALID_API_KEY: Invalid or missing Gemini API key. Please check your GEMINI_API_KEY in the .env file.');
    }
    
    // Throw generic error
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

export default { getAIAnswer };
