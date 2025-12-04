// providers/deepgram.js

const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const WebSocket = require('ws');
const { validateApiKey } = require('../utils/apiKeyValidator');

/**
 * Classe Provider Deepgram. Gère la validation des clés API.
 */
class DeepgramProvider {
    /**
     * Valide une clé API Deepgram.
     * REFACTORED: Now uses centralized apiKeyValidator utility
     * @param {string} key - La clé API Deepgram à valider
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    static async validateApiKey(key) {
        return validateApiKey(key, 'deepgram');
    }
}

function createSTT({
    apiKey,
    language = 'en-US',
    sampleRate = 24000,
    callbacks = {},
  }) {
    const qs = new URLSearchParams({
      model: 'nova-3',
      encoding: 'linear16',
      sample_rate: sampleRate.toString(),
      language,
      smart_format: 'true',
      interim_results: 'true',
      channels: '1',
    });
  
    const url = `wss://api.deepgram.com/v1/listen?${qs}`;
  
    const ws = new WebSocket(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    ws.binaryType = 'arraybuffer';
  
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => {
        ws.terminate();
        reject(new Error('DG open timeout (10 s)'));
      }, 10_000);
  
      ws.on('open', () => {
        clearTimeout(to);
        resolve({
          sendRealtimeInput: (buf) => ws.send(buf),
          close: () => ws.close(1000, 'client'),
        });
      });
  
      ws.on('message', raw => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }
        if (msg.channel?.alternatives?.[0]?.transcript !== undefined) {
          callbacks.onmessage?.({ provider: 'deepgram', ...msg });
        }
      });
  
      ws.on('close', (code, reason) =>
        callbacks.onclose?.({ code, reason: reason.toString() })
      );
  
      ws.on('error', err => {
        clearTimeout(to);
        callbacks.onerror?.(err);
        reject(err);
      });
    });
  }

// ... (Les fonctions Placeholder liées au LLM sont conservées telles quelles) ...
function createLLM(opts) {
  console.warn("[Deepgram] LLM not supported.");
  return { generateContent: async () => { throw new Error("Deepgram does not support LLM functionality."); } };
}
function createStreamingLLM(opts) {
  console.warn("[Deepgram] Streaming LLM not supported.");
  return { streamChat: async () => { throw new Error("Deepgram does not support Streaming LLM functionality."); } };
}

module.exports = {
    DeepgramProvider,
    createSTT,
    createLLM,
    createStreamingLLM
};