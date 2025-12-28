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
let availableModelsCache = null;
let modelsListAttempted = false;

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
 * List available models from Gemini API
 * This helps us discover which models are actually available
 */
async function listAvailableModels() {
  if (availableModelsCache) {
    return availableModelsCache;
  }

  if (!genAI) {
    return [];
  }

  try {
    // Try to fetch available models using the REST API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    if (response.ok) {
      const data = await response.json();
      const models = (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      
      if (models.length > 0) {
        availableModelsCache = models;
        console.log(`[Gemini] Found ${models.length} available models: ${models.join(', ')}`);
        return models;
      }
    }
  } catch (error) {
    console.log(`[Gemini] Could not list models via API: ${error.message}`);
  }

  // Fallback to known working models
  return [];
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
    
    // Try to discover available models first (only once)
    let availableModels = [];
    if (!modelsListAttempted) {
      modelsListAttempted = true;
      availableModels = await listAvailableModels();
    } else if (availableModelsCache) {
      availableModels = availableModelsCache;
    }

    // Prepare list of models to try (in order of preference)
    // Start with user-specified model, then try discovered models, then fallback to known models
    let modelsToTry = [];
    
    // 1. User-specified model first
    if (process.env.GEMINI_MODEL) {
      modelsToTry.push(process.env.GEMINI_MODEL);
    }
    
    // 2. Cached working model if available
    if (cachedWorkingModel && !modelsToTry.includes(cachedWorkingModel)) {
      modelsToTry.push(cachedWorkingModel);
    }
    
    // 3. Available models from API discovery (prioritize common ones)
    const priorityModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];
    for (const priorityModel of priorityModels) {
      if (availableModels.includes(priorityModel) && !modelsToTry.includes(priorityModel)) {
        modelsToTry.push(priorityModel);
      }
    }
    
    // 4. Other discovered models
    for (const model of availableModels) {
      if (!modelsToTry.includes(model)) {
        modelsToTry.push(model);
      }
    }
    
    // 5. Fallback to known models (in order of reliability)
    const fallbackModels = [
      'gemini-1.5-flash',      // Most common newer model
      'gemini-1.5-pro',        // Pro version
      'gemini-pro',            // Legacy but widely available
      'gemini-1.5-flash-latest', // Latest variant
      'gemini-1.5-pro-latest',  // Latest pro variant
    ];
    
    for (const fallbackModel of fallbackModels) {
      if (!modelsToTry.includes(fallbackModel)) {
        modelsToTry.push(fallbackModel);
      }
    }
    
    // Remove duplicates
    modelsToTry = [...new Set(modelsToTry)];
    
    console.log(`[Gemini] Will try ${modelsToTry.length} models in order: ${modelsToTry.join(', ')}`);
    
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
      try {
        const testModel = genAI.getGenerativeModel({ model: modelName });
        result = await testModel.generateContent(prompt);
        response = await result.response;
        answer = response.text();
        return answer;
      } catch (error) {
        // Re-throw to be handled by retry logic
        throw error;
      }
    };
    
    // Try each model in order until one works
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelName = modelsToTry[i];
      try {
        console.log(`[Gemini] [${i + 1}/${modelsToTry.length}] Attempting model: ${modelName}`);
        
        // Use retry logic for rate limits, but not for model-not-found errors
        answer = await retryWithBackoff(async () => {
          return await tryModel(modelName);
        }, 3, 2000); // 3 retries with 2s initial delay
        
        // Success! Cache this model and break
        cachedWorkingModel = modelName;
        workingModelName = modelName;
        console.log(`[Gemini] ✓ SUCCESS! Using model: ${modelName} (extracted ${answer.length} chars)`);
        break;
      } catch (modelError) {
        const errorMsg = modelError.message || String(modelError);
        const errorStr = errorMsg.substring(0, 200);
        console.log(`[Gemini] ✗ Model ${modelName} failed (${i + 1}/${modelsToTry.length}): ${errorStr}`);
        lastError = modelError;
        
        // Check error type
        const isModelNotFound = errorMsg.includes('not found') || 
                               errorMsg.includes('404') || 
                               errorMsg.includes('not supported') ||
                               errorMsg.includes('is not found for API version');
        
        const isRateLimit = errorMsg.includes('429') || 
                           errorMsg.includes('Too Many Requests') || 
                           errorMsg.includes('Resource exhausted') ||
                           errorMsg.includes('RATE_LIMIT');
        
        const isAuthError = errorMsg.includes('API key') || 
                           errorMsg.includes('401') || 
                           errorMsg.includes('403') ||
                           errorMsg.includes('authentication');
        
        // If it's a model-not-found error, continue to next model
        if (isModelNotFound) {
          if (i < modelsToTry.length - 1) {
            console.log(`[Gemini] → Model not found, trying next model...`);
            continue;
          } else {
            // Last model failed - but don't throw yet, we'll handle it below
            continue;
          }
        }
        
        // If it's a rate limit error, try next model (retries already attempted)
        if (isRateLimit) {
          console.log(`[Gemini] Rate limit for ${modelName}, trying next model...`);
          if (i < modelsToTry.length - 1) {
            // Wait a bit before trying next model
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
        }
        
        // If it's an auth error, don't try other models
        if (isAuthError) {
          throw new Error(`AUTH_ERROR: ${errorMsg}`);
        }
        
        // For other errors, continue to next model (might be temporary)
        if (i < modelsToTry.length - 1) {
          console.log(`[Gemini] → Error with ${modelName}, trying next model...`);
          continue;
        }
      }
    }
    
    // If we tried all models and none worked
    if (!answer) {
      const errorMsg = lastError?.message || 'Unknown error';
      const isModelNotFound = errorMsg.includes('not found') || errorMsg.includes('404');
      
      if (isModelNotFound) {
        throw new Error(`MODEL_NOT_FOUND: None of the ${modelsToTry.length} Gemini models worked with your API key. Tried: ${modelsToTry.slice(0, 5).join(', ')}${modelsToTry.length > 5 ? '...' : ''}. All returned "model not found" errors. Please verify your API key at https://makersuite.google.com/app/apikey and ensure it has access to Gemini models.`);
      }
      
      throw new Error(`Could not find a working Gemini model. Tried ${modelsToTry.length} models: ${modelsToTry.slice(0, 3).join(', ')}${modelsToTry.length > 3 ? '...' : ''}. Last error: ${errorMsg.substring(0, 200)}`);
    }
    
    return answer.trim();
    
  } catch (error) {
    console.error('Gemini API error:', error);
    
    const errorMsg = error.message || String(error);
    
    // Check for rate limit errors - throw so caller can handle with retry logic
    if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests') || errorMsg.includes('Resource exhausted') || errorMsg.includes('RATE_LIMIT')) {
      throw new Error('RATE_LIMIT: 429 Too Many Requests - Resource exhausted. Please wait a moment and try again.');
    }
    
    // Check for auth errors
    if (errorMsg.includes('AUTH_ERROR') || errorMsg.includes('API key') || errorMsg.includes('401') || errorMsg.includes('403')) {
      throw new Error('INVALID_API_KEY: Invalid or missing Gemini API key. Please check your GEMINI_API_KEY in the .env file and verify it at https://makersuite.google.com/app/apikey');
    }
    
    // Check for model not found errors
    if (errorMsg.includes('MODEL_NOT_FOUND') || errorMsg.includes('not found for API version') || errorMsg.includes('not found') || errorMsg.includes('404')) {
      // Re-throw the error message we already created
      throw error;
    }
    
    // Throw generic error with more context
    throw new Error(`Gemini API error: ${errorMsg}`);
  }
}

export default { getAIAnswer };
