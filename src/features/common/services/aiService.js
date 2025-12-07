/**
 * AI Service
 * Provides a simplified interface for AI interactions
 * Wraps the AI factory and model state service
 */

const { createLLM } = require('../ai/factory');
const modelStateService = require('./modelStateService');

/**
 * Generate a response using the currently selected LLM
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object} options - Generation options
 * @param {string} options.model - Model to use (optional, defaults to current selection)
 * @param {number} options.maxTokens - Maximum tokens to generate
 * @param {number} options.temperature - Temperature for generation (0-1)
 * @returns {Promise<string>} The AI response
 */
async function generateResponse(prompt, options = {}) {
    try {
        // Get current model info if not specified
        let modelId = options.model;
        if (!modelId) {
            const currentModel = await modelStateService.getSelectedModel('llm');
            modelId = currentModel?.model;
            if (!modelId) {
                throw new Error('No LLM model selected');
            }
        }

        // Get provider for the model
        const provider = modelStateService.getProviderForModel(modelId, 'llm');
        if (!provider) {
            throw new Error(`No provider found for model: ${modelId}`);
        }

        // Get API key for the provider
        const apiKey = await modelStateService.getApiKey(provider);
        if (!apiKey && provider !== 'ollama') {
            throw new Error(`No API key configured for provider: ${provider}`);
        }

        // Create LLM instance
        const llmOptions = {
            model: modelId,
            apiKey: apiKey,
            maxTokens: options.maxTokens || 1000,
            temperature: options.temperature !== undefined ? options.temperature : 0.7
        };

        const llm = createLLM(provider, llmOptions);

        // Generate response
        const messages = [
            { role: 'user', content: prompt }
        ];

        const completion = await llm.chat(messages);
        
        return completion.content || '';
    } catch (error) {
        console.error('[AIService] Error generating response:', error);
        throw error;
    }
}

module.exports = {
    generateResponse
};
