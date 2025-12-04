// factory.js

/**
 * @typedef {object} ModelOption
 * @property {string} id 
 * @property {string} name
 */

/**
 * @typedef {object} Provider
 * @property {string} name
 * @property {() => any} handler
 * @property {ModelOption[]} llmModels
 * @property {ModelOption[]} sttModels
 */

/**
 * @type {Object.<string, Provider>}
 */

/**
 * Sanitize model ID by removing provider-specific suffixes
 * @param {string} model - Model ID to sanitize
 * @returns {string} Sanitized model ID
 */
function sanitizeModelId(model) {
  return (typeof model === 'string') ? model.replace(/-lucide$/, '') : model;
}

/**
 * Models that support vision/image input
 * This list is used to check if a model can process images before sending
 */
const VISION_CAPABLE_MODELS = {
  // OpenAI models with vision
  'gpt-4o': true,
  'gpt-4o-lucide': true,
  'gpt-4-turbo': true,
  'gpt-4-turbo-lucide': true,
  'gpt-4-vision-preview': true,
  // GPT-4 base does NOT support vision
  'gpt-4': false,
  'gpt-4-lucide': false,

  // Anthropic Claude 3+ models support vision
  'claude-3-5-sonnet-20241022': true,
  'claude-3-opus-20240229': true,
  'claude-3-sonnet-20240229': true,
  'claude-3-haiku-20240307': true,

  // Google Gemini models support vision
  'gemini-2.5-flash': true,
  'gemini-1.5-pro': true,
  'gemini-1.5-flash': true,
  'gemini-pro-vision': true,

  // Ollama models with vision (common ones)
  'llava': true,
  'llava:latest': true,
  'llava:13b': true,
  'llava:34b': true,
  'bakllava': true,
  'moondream': true,
  'moondream2': true,
};

/**
 * Check if a model supports vision/image input
 * @param {string} provider - Provider ID (e.g., 'openai', 'anthropic')
 * @param {string} model - Model ID (e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022')
 * @returns {{supported: boolean, reason: string}} Vision support status and reason
 */
function supportsVision(provider, model) {
  if (!model) {
    return { supported: false, reason: 'No model specified' };
  }

  // Sanitize model ID (remove -lucide suffix for lookup if needed)
  const sanitizedModel = sanitizeModelId(model);

  // Check explicit list first
  if (VISION_CAPABLE_MODELS[model] === true || VISION_CAPABLE_MODELS[sanitizedModel] === true) {
    return { supported: true, reason: `${model} supports vision` };
  }

  if (VISION_CAPABLE_MODELS[model] === false || VISION_CAPABLE_MODELS[sanitizedModel] === false) {
    return {
      supported: false,
      reason: `${model} does not support vision. Consider using gpt-4o, gpt-4-turbo, claude-3-5-sonnet, or gemini-2.5-flash instead.`
    };
  }

  // For Ollama, check if model name contains vision-capable indicators
  if (provider === 'ollama') {
    const lowerModel = model.toLowerCase();
    if (lowerModel.includes('llava') || lowerModel.includes('vision') ||
        lowerModel.includes('moondream') || lowerModel.includes('bakllava')) {
      return { supported: true, reason: `${model} appears to support vision (Ollama)` };
    }
    return {
      supported: false,
      reason: `${model} (Ollama) may not support vision. For vision, use models like llava, moondream, or bakllava.`
    };
  }

  // Unknown model - assume no vision support to be safe
  return {
    supported: false,
    reason: `${model} vision support unknown. Contact support if this model should support images.`
  };
}

const PROVIDERS = {
  'openai': {
      name: 'OpenAI',
      handler: () => require("./providers/openai"),
      llmModels: [
          { id: 'gpt-4o', name: 'GPT-4o' },              // Default - Most capable
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
          { id: 'gpt-4', name: 'GPT-4' },
      ],
      sttModels: [
          { id: 'gpt-4o-mini-transcribe', name: 'GPT-4o Mini Transcribe' }
      ],
  },

  'openai-lucide': {
      name: 'OpenAI (Lucide)',
      handler: () => require("./providers/openai"),
      llmModels: [
          { id: 'gpt-4o-lucide', name: 'GPT-4o (Lucide)' },              // Default - Most capable
          { id: 'gpt-4-turbo-lucide', name: 'GPT-4 Turbo (Lucide)' },
          { id: 'gpt-4-lucide', name: 'GPT-4 (Lucide)' },
      ],
      sttModels: [
          { id: 'gpt-4o-mini-transcribe-lucide', name: 'GPT-4o Mini Transcribe (Lucide)' }
      ],
  },
  'gemini': {
      name: 'Gemini',
      handler: () => require("./providers/gemini"),
      llmModels: [
          { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      ],
      sttModels: [
          { id: 'gemini-live-2.5-flash-preview', name: 'Gemini Live 2.5 Flash' }
      ],
  },
  'anthropic': {
      name: 'Anthropic',
      handler: () => require("./providers/anthropic"),
      llmModels: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      ],
      sttModels: [],
  },
  'deepgram': {
    name: 'Deepgram',
    handler: () => require("./providers/deepgram"),
    llmModels: [],
    sttModels: [
        { id: 'nova-3', name: 'Nova-3 (General)' },
        ],
    },
  'ollama': {
      name: 'Ollama (Local)',
      handler: () => require("./providers/ollama"),
      llmModels: [], // Dynamic models populated from installed Ollama models
      sttModels: [], // Ollama doesn't support STT yet
  },
  'whisper': {
      name: 'Whisper (Local)',
      handler: () => {
          // This needs to remain a function due to its conditional logic for renderer/main process
          if (typeof window === 'undefined') {
              const { WhisperProvider } = require("./providers/whisper");
              return new WhisperProvider();
          }
          // Return a dummy object for the renderer process
          return {
              validateApiKey: async () => ({ success: true }), // Mock validate for renderer
              createSTT: () => { throw new Error('Whisper STT is only available in main process'); },
          };
      },
      llmModels: [],
      sttModels: [
          { id: 'whisper-tiny', name: 'Whisper Tiny (39M)' },
          { id: 'whisper-base', name: 'Whisper Base (74M)' },
          { id: 'whisper-small', name: 'Whisper Small (244M)' },
          { id: 'whisper-medium', name: 'Whisper Medium (769M)' },
      ],
  },
};

function createSTT(provider, opts) {
  if (provider === 'openai-lucide') provider = 'openai';
  
  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createSTT) {
      throw new Error(`STT not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createSTT(opts);
}

function createLLM(provider, opts) {
  if (provider === 'openai-lucide') provider = 'openai';

  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createLLM) {
      throw new Error(`LLM not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createLLM(opts);
}

function createStreamingLLM(provider, opts) {
  if (provider === 'openai-lucide') provider = 'openai';
  
  const handler = PROVIDERS[provider]?.handler();
  if (!handler?.createStreamingLLM) {
      throw new Error(`Streaming LLM not supported for provider: ${provider}`);
  }
  if (opts && opts.model) {
    opts = { ...opts, model: sanitizeModelId(opts.model) };
  }
  return handler.createStreamingLLM(opts);
}

function getProviderClass(providerId) {
    const providerConfig = PROVIDERS[providerId];
    if (!providerConfig) return null;
    
    // Handle special cases for lucide providers
    let actualProviderId = providerId;
    if (providerId === 'openai-lucide') {
        actualProviderId = 'openai';
    }
    
    // The handler function returns the module, from which we get the class.
    const module = providerConfig.handler();
    
    // Map provider IDs to their actual exported class names
    const classNameMap = {
        'openai': 'OpenAIProvider',
        'anthropic': 'AnthropicProvider',
        'gemini': 'GeminiProvider',
        'deepgram': 'DeepgramProvider',
        'ollama': 'OllamaProvider',
        'whisper': 'WhisperProvider'
    };
    
    const className = classNameMap[actualProviderId];
    return className ? module[className] : null;
}

function getAvailableProviders() {
  const stt = [];
  const llm = [];
  for (const [id, provider] of Object.entries(PROVIDERS)) {
      if (provider.sttModels.length > 0) stt.push(id);
      if (provider.llmModels.length > 0) llm.push(id);
  }
  return { stt: [...new Set(stt)], llm: [...new Set(llm)] };
}

module.exports = {
  PROVIDERS,
  VISION_CAPABLE_MODELS,
  createSTT,
  createLLM,
  createStreamingLLM,
  getProviderClass,
  getAvailableProviders,
  supportsVision,
};