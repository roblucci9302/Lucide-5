const { BrowserWindow } = require('electron');
const { createStreamingLLM, supportsVision } = require('../common/ai/factory');
// Lazy require helper to avoid circular dependency issues
const getWindowManager = () => require('../../window/windowManager');
const internalBridge = require('../../bridge/internalBridge');

const getWindowPool = () => {
    try {
        return getWindowManager().windowPool;
    } catch {
        return null;
    }
};

const sessionRepository = require('../common/repositories/session');
const askRepository = require('./repositories');
const { getSystemPrompt } = require('../common/prompts/promptBuilder');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const { desktopCapturer } = require('electron');
const modelStateService = require('../common/services/modelStateService');
const agentProfileService = require('../common/services/agentProfileService');
const agentRouterService = require('../common/services/agentRouterService');
const conversationHistoryService = require('../common/services/conversationHistoryService');
const documentService = require('../common/services/documentService');
const ragService = require('../common/services/ragService');
const promptEngineeringService = require('../common/services/promptEngineeringService'); // Phase WOW 1 - Jour 5
const documentLengthDetector = require('../common/services/documentLengthDetector'); // Dynamic token adaptation
const tokenTrackingService = require('../common/services/tokenTrackingService');
const actionParser = require('../common/services/actionParser'); // Phase 2: AI-triggered actions
const actionExecutor = require('../common/services/actionExecutor'); // Phase 2: Action execution
const dataSourceInjector = require('../common/services/dataSourceInjector'); // Phase 3: External data sources
const autoIndexingService = require('../common/services/autoIndexingService'); // Phase 2: Auto-indexing
const authService = require('../common/services/authService'); // For user ID in auto-indexing

// Try to load sharp, but don't fail if it's not available
let sharp;
try {
    sharp = require('sharp');
    console.log('[AskService] Sharp module loaded successfully');
} catch (error) {
    console.warn('[AskService] Sharp module not available:', error.message);
    console.warn('[AskService] Screenshot functionality will work with reduced image processing capabilities');
    sharp = null;
}
let lastScreenshot = null;

/**
 * Phase 2: Auto-index screenshot for knowledge base (OCR extraction)
 * Called after successful screenshot capture - runs in background
 * @param {Buffer} imageBuffer - The screenshot image buffer
 * @private
 */
async function _autoIndexScreenshot(imageBuffer) {
    try {
        const userId = authService.getCurrentUserId();
        if (!userId) {
            return; // Skip if no user
        }

        // Save temp file for OCR processing
        const tempScreenshotPath = path.join(os.tmpdir(), `lucide-ocr-${Date.now()}.jpg`);

        await fs.promises.writeFile(tempScreenshotPath, imageBuffer);

        // Index in background (non-blocking)
        autoIndexingService.indexScreenshot(tempScreenshotPath, userId, null)
            .then(result => {
                // Clean up temp file with logged error handling
                fs.promises.unlink(tempScreenshotPath).catch(err => {
                    console.warn('[AskService] Failed to clean up temp screenshot:', err.message);
                });

                if (result.indexed) {
                    console.log(`[AskService] ✅ Screenshot auto-indexed: ${result.content_id}`);
                    console.log(`[AskService]    Text extracted: ${result.text_extracted?.substring(0, 50)}...`);
                } else {
                    console.log(`[AskService] Screenshot not indexed: ${result.reason}`);
                }
            })
            .catch(err => {
                fs.promises.unlink(tempScreenshotPath).catch(cleanupErr => {
                    console.warn('[AskService] Failed to clean up temp screenshot after error:', cleanupErr.message);
                });
                console.error('[AskService] Screenshot indexing failed:', err.message);
            });
    } catch (error) {
        console.warn('[AskService] Could not auto-index screenshot:', error.message);
    }
}

async function captureScreenshot(options = {}) {
    if (process.platform === 'darwin') {
        try {
            const tempPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.jpg`);

            await execFile('screencapture', ['-x', '-t', 'jpg', tempPath]);

            const imageBuffer = await fs.promises.readFile(tempPath);
            await fs.promises.unlink(tempPath);

            if (sharp) {
                try {
                    // Try using sharp for optimal image processing
                    const resizedBuffer = await sharp(imageBuffer)
                        .resize({ height: 384 })
                        .jpeg({ quality: 80 })
                        .toBuffer();

                    const base64 = resizedBuffer.toString('base64');
                    const metadata = await sharp(resizedBuffer).metadata();

                    lastScreenshot = {
                        base64,
                        width: metadata.width,
                        height: metadata.height,
                        timestamp: Date.now(),
                    };

                    // Phase 2: Auto-index screenshot for knowledge base (use original for better OCR)
                    _autoIndexScreenshot(imageBuffer);

                    return { success: true, base64, width: metadata.width, height: metadata.height };
                } catch (sharpError) {
                    console.warn('Sharp module failed, falling back to basic image processing:', sharpError.message);
                }
            }
            
            // Fallback: Return the original image without resizing
            console.log('[AskService] Using fallback image processing (no resize/compression)');
            const base64 = imageBuffer.toString('base64');
            
            lastScreenshot = {
                base64,
                width: null, // We don't have metadata without sharp
                height: null,
                timestamp: Date.now(),
            };

            // Phase 2: Auto-index screenshot for knowledge base
            _autoIndexScreenshot(imageBuffer);

            return { success: true, base64, width: null, height: null };
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return { success: false, error: error.message };
        }
    }

    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: 1920,
                height: 1080,
            },
        });

        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }
        const source = sources[0];
        const buffer = source.thumbnail.toJPEG(70);
        const base64 = buffer.toString('base64');
        const size = source.thumbnail.getSize();

        // Phase 2: Auto-index screenshot for knowledge base
        _autoIndexScreenshot(buffer);

        return {
            success: true,
            base64,
            width: size.width,
            height: size.height,
        };
    } catch (error) {
        console.error('Failed to capture screenshot using desktopCapturer:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * @class
 * @description
 */
class AskService {
    constructor() {
        this.abortController = null;
        // Fix MEDIUM BUG-M13: Track abort listeners to prevent accumulation
        this.abortListeners = new Map(); // Map<signal, listener> for cleanup
        this.state = {
            isVisible: false,
            isLoading: false,
            isStreaming: false,
            currentQuestion: '',
            currentResponse: '',
            showTextInput: true,
            sessionId: null, // Phase 4: RAG - Session ID for citations
        };
        // Phase 2: Auto-indexing tracking
        this.lastIndexedSessionId = null; // Prevent double-indexing same session
        this.indexingInProgress = new Set(); // Track sessions being indexed
        console.log('[AskService] Service instance created.');
    }

    /**
     * Fix MEDIUM BUG-M13: Add abort listener safely without accumulation
     * Removes previous listener for the same signal before adding new one
     * @private
     */
    _addAbortListener(signal, reader, reason = 'abort') {
        // Remove existing listener if present
        if (this.abortListeners.has(signal)) {
            const oldListener = this.abortListeners.get(signal);
            signal.removeEventListener('abort', oldListener);
        }

        // Create new listener
        const listener = () => {
            console.log(`[AskService] Aborting stream reader. Reason: ${signal.reason || reason}`);
            reader.cancel(signal.reason || reason).catch(() => { /* Already cancelled */ });
        };

        // Add listener and track it
        signal.addEventListener('abort', listener);
        this.abortListeners.set(signal, listener);
    }

    /**
     * Fix MEDIUM BUG-M13, M15: Clean up abort listeners and controller
     * @private
     */
    _cleanupAbortController() {
        // Remove all tracked abort listeners
        for (const [signal, listener] of this.abortListeners.entries()) {
            signal.removeEventListener('abort', listener);
        }
        this.abortListeners.clear();

        // Clear abort controller reference
        this.abortController = null;
    }

    _broadcastState() {
        const askWindow = getWindowPool()?.get('ask');
        if (askWindow && !askWindow.isDestroyed()) {
            askWindow.webContents.send('ask:stateUpdate', this.state);
        }
    }

    async toggleAskButton(inputScreenOnly = false) {
        console.log('[AskService] ===========================================');
        console.log('[AskService] toggleAskButton() called');
        const askWindow = getWindowPool()?.get('ask');

        let shouldSendScreenOnly = false;
        if (inputScreenOnly && this.state.showTextInput && askWindow && askWindow.isVisible()) {
            shouldSendScreenOnly = true;
            await this.sendMessage('', []);
            console.log('[AskService] ===========================================');
            return;
        }

        // CORRECTION BUG #3b : Toujours afficher la fenêtre et focus l'input
        // Ne plus faire de toggle, toujours activer
        if (!askWindow || !askWindow.isVisible()) {
            console.log('[AskService] Showing hidden Ask window');
            internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
            this.state.isVisible = true;
        } else {
            console.log('[AskService] Ask window already visible');
        }

        // Toujours activer l'input et le focus
        console.log('[AskService] Activating text input and focusing...');
        this.state.showTextInput = true;
        this._broadcastState();

        // Envoyer un signal explicite pour focaliser le champ de texte après un délai plus long
        setTimeout(() => {
            if (askWindow && !askWindow.isDestroyed()) {
                console.log('[AskService] Sending focus signal to Ask window');
                askWindow.webContents.send('ask:showTextInput');
            } else {
                console.warn('[AskService] Ask window not available for focusing');
            }
        }, 200); // Augmentation du délai à 200ms

        console.log('[AskService] ===========================================');
    }

    async openBrowser(url = 'https://www.google.com') {
        console.log('[AskService] ===========================================');
        console.log('[AskService] openBrowser() called with URL:', url);
        const askWindow = getWindowPool()?.get('ask');

        // Afficher la fenêtre Ask si elle n'est pas visible
        if (!askWindow || !askWindow.isVisible()) {
            console.log('[AskService] Showing Ask window for browser mode');
            internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
            this.state.isVisible = true;
            this._broadcastState();

            // Attendre un peu pour que la fenêtre soit complètement chargée
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Envoyer l'URL au renderer pour ouvrir le navigateur
        if (askWindow && !askWindow.isDestroyed()) {
            console.log('[AskService] Sending open-url event to renderer');
            askWindow.webContents.send('ask:open-url', url);
        } else {
            console.error('[AskService] Ask window not available');
        }

        console.log('[AskService] ===========================================');
    }

    async closeAskWindow () {
            if (this.abortController) {
                this.abortController.abort('Window closed by user');
                this.abortController = null;
            }

            this.state = {
                isVisible      : false,
                isLoading      : false,
                isStreaming    : false,
                currentQuestion: '',
                currentResponse: '',
                showTextInput  : true,
            };
            this._broadcastState();

            internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });

            return { success: true };
        }

    async minimizeAskWindow() {
        // Masquer la fenêtre Ask sans effacer le contenu
        this.state.isVisible = false;
        internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });
        return { success: true };
    }

    async showListenWindow() {
        // Afficher la fenêtre Listen (conversation)
        internalBridge.emit('window:requestVisibility', { name: 'listen', visible: true });
        return { success: true };
    }
    

    /**
     * 
     * @param {string[]} conversationTexts
     * @returns {string}
     * @private
     */
    _formatConversationForPrompt(conversationTexts) {
        if (!conversationTexts || conversationTexts.length === 0) {
            return 'No conversation history available.';
        }
        return conversationTexts.slice(-30).join('\n');
    }

    /**
     * 
     * @param {string} userPrompt
     * @returns {Promise<{success: boolean, response?: string, error?: string}>}
     */
    async sendMessage(userPrompt, conversationHistoryRaw=[]) {
        internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
        this.state = {
            ...this.state,
            isLoading: true,
            isStreaming: false,
            currentQuestion: userPrompt,
            currentResponse: '',
            showTextInput: false,
        };
        this._broadcastState();

        if (this.abortController) {
            this.abortController.abort('New request received.');
        }
        this.abortController = new AbortController();
        const { signal } = this.abortController;


        let sessionId;

        try {
            // Fix MEDIUM BUG-M28: Don't log potentially sensitive user input
            // Log only metadata, not actual content which could contain passwords/keys
            console.log(`[AskService] 🤖 Processing message (length: ${userPrompt.length} chars)`);

            sessionId = await sessionRepository.getOrCreateActive('ask');
            await askRepository.addAiMessage({ sessionId, role: 'user', content: userPrompt.trim() });
            console.log(`[AskService] DB: Saved user prompt to session ${sessionId}`);

            // Phase 4: RAG - Update state with sessionId for citations
            this.state.sessionId = sessionId;
            this._broadcastState();

            // PHASE 1: AGENT ROUTER - Intelligent routing to specialized agents
            // Auto-detect and switch to the most appropriate agent based on question
            const userId = sessionRepository.getCurrentUserId ? await sessionRepository.getCurrentUserId() : null;

            if (userId && userPrompt && userPrompt.trim().length > 0) {
                try {
                    const routing = await agentRouterService.routeQuestion(userPrompt, userId);
                    const currentProfile = agentProfileService.getCurrentProfile();

                    // Auto-switch if confidence is high and different from current profile
                    if (routing.confidence > 0.75 && routing.agent !== currentProfile) {
                        console.log(`[AskService] 🔄 Auto-switching agent: ${currentProfile} → ${routing.agent} (confidence: ${routing.confidence.toFixed(2)})`);

                        await agentProfileService.setActiveProfile(userId, routing.agent);

                        // Notify UI of agent switch
                        const askWindow = getWindowPool()?.get('ask');
                        if (askWindow && !askWindow.isDestroyed()) {
                            const profileInfo = agentProfileService.getProfileById(routing.agent);
                            askWindow.webContents.send('agent-switched', {
                                agent: routing.agent,
                                agentName: profileInfo?.name || routing.agent,
                                agentIcon: profileInfo?.icon || '🤖',
                                confidence: routing.confidence,
                                reason: routing.reason,
                                previousAgent: currentProfile
                            });
                        }
                    } else {
                        console.log(`[AskService] ✓ Agent routing confirmed: ${routing.agent} (confidence: ${routing.confidence.toFixed(2)})`);
                    }
                } catch (routingError) {
                    console.warn('[AskService] Agent routing failed, using current profile:', routingError);
                    // Continue with current profile if routing fails
                }
            }

            // Get the current active agent profile (potentially updated by router)
            const activeProfile = agentProfileService.getCurrentProfile();
            console.log(`[AskService] Using agent profile: ${activeProfile}`);

            // Update session metadata with agent profile
            await conversationHistoryService.updateSessionMetadata(sessionId, {
                agent_profile: activeProfile
            });

            // Update message count
            const messageCount = await conversationHistoryService.updateMessageCount(sessionId);

            // Auto-generate title if this is the first message
            if (messageCount === 1) {
                const generatedTitle = await conversationHistoryService.generateTitleFromContent(sessionId);
                await conversationHistoryService.updateSessionMetadata(sessionId, {
                    title: generatedTitle,
                    auto_title: 1
                });
                console.log(`[AskService] Auto-generated title: "${generatedTitle}"`);
            }

            // Phase 4: RAG - Retrieve relevant context from knowledge base
            // userId already declared at line 253
            let ragContext = null;
            let ragSources = [];

            if (userId) {
                try {
                    // Check if user has indexed documents
                    const stats = await documentService.getDocumentStats(userId);
                    console.log(`[AskService] RAG: Document stats for user ${userId}:`, {
                        total: stats?.total_documents || 0,
                        indexed: stats?.indexed_documents || 0,
                        chunks: stats?.total_chunks || 0
                    });

                    if (stats && stats.indexed_documents > 0) {
                        console.log(`[AskService] RAG: User has ${stats.indexed_documents} indexed documents, retrieving context...`);

                        // Retrieve relevant context (lowered minScore for MockEmbedding compatibility)
                        ragContext = await ragService.retrieveContext(userPrompt, {
                            maxChunks: 10,
                            minScore: 0.5  // Lowered from 0.7 to work better with mock embeddings
                        });

                        if (ragContext && ragContext.hasContext) {
                            ragSources = ragContext.sources || [];
                            console.log(`[AskService] RAG: ✅ Retrieved ${ragSources.length} relevant chunks (${ragContext.totalTokens} tokens)`);
                        } else {
                            console.log(`[AskService] RAG: ⚠️ No relevant context found (hasContext: ${ragContext?.hasContext}, chunks: ${ragContext?.chunks?.length || 0})`);
                        }
                    } else {
                        console.log(`[AskService] RAG: ⚠️ No indexed documents found for user. Upload documents via Documents view to enable RAG.`);
                    }
                } catch (ragError) {
                    console.warn('[AskService] RAG: ❌ Error retrieving context, continuing without RAG:', ragError.message);
                    // Continue without RAG if it fails
                }
            } else {
                console.log(`[AskService] RAG: ⚠️ No userId available, RAG disabled`);
            }

            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key not configured.');
            }
            console.log(`[AskService] Using model: ${modelInfo.model} for provider: ${modelInfo.provider}`);

            // Vérifier si les captures d'écran sont activées
            const isScreenshotEnabled = getWindowManager().getScreenshotEnabled();
            console.log(`[AskService] Screenshot capture is ${isScreenshotEnabled ? 'enabled' : 'disabled'}`);

            // Fix: Verify model supports vision BEFORE capturing screenshot
            const visionSupport = supportsVision(modelInfo.provider, modelInfo.model);
            console.log(`[AskService] 👁️ Vision support: ${visionSupport.supported ? 'YES' : 'NO'} - ${visionSupport.reason}`);

            let screenshotBase64 = null;
            let visionWarning = null;

            if (isScreenshotEnabled) {
                if (visionSupport.supported) {
                    // Model supports vision, capture screenshot
                    console.log(`[AskService] 📷 Attempting screenshot capture...`);
                    const screenshotResult = await captureScreenshot({ quality: 'medium' });

                    if (screenshotResult.success) {
                        screenshotBase64 = screenshotResult.base64;
                        console.log(`[AskService] ✅ Screenshot captured successfully (${Math.round(screenshotBase64.length / 1024)}KB base64, ${screenshotResult.width}x${screenshotResult.height})`);
                    } else {
                        console.error(`[AskService] ❌ Screenshot capture FAILED: ${screenshotResult.error}`);
                    }
                } else {
                    // Model does NOT support vision - warn user
                    visionWarning = visionSupport.reason;
                    console.warn(`[AskService] ⚠️ Vision disabled: ${visionWarning}`);

                    // Notify UI about vision limitation
                    const askWin = getWindowPool()?.get('ask');
                    if (askWin && !askWin.isDestroyed()) {
                        askWin.webContents.send('ask:vision-warning', {
                            supported: false,
                            reason: visionWarning,
                            currentModel: modelInfo.model,
                            suggestedModels: ['gpt-4o', 'gpt-4-turbo', 'claude-3-5-sonnet', 'gemini-2.5-flash']
                        });
                    }
                }
            }

            // Récupérer l'historique de la session actuelle depuis la DB
            const previousMessages = await conversationHistoryService.getSessionMessages(sessionId);
            console.log(`[AskService] 📝 Retrieved ${previousMessages.length} previous messages from session ${sessionId}`);

            // Phase WOW 1 - Jour 5: Generate enriched prompt with prompt engineering service
            let systemPrompt;
            try {
                const enrichedPrompt = await promptEngineeringService.generatePrompt({
                    question: userPrompt,
                    profileId: activeProfile,
                    uid: userId || 'default_user',
                    sessionId: sessionId,
                    customContext: {}
                });

                systemPrompt = enrichedPrompt.systemPrompt;
                console.log(`[AskService] 🎯 Prompt Engineering: Generated enriched prompt for ${activeProfile} (temp: ${enrichedPrompt.temperature})`);

                // Log metadata for debugging
                if (enrichedPrompt.metadata) {
                    console.log(`[AskService] 📊 Prompt metadata: type=${enrichedPrompt.metadata.questionType}, complexity=${enrichedPrompt.metadata.complexity}, hasContext=${enrichedPrompt.metadata.hasContext}`);
                }
            } catch (promptError) {
                console.warn('[AskService] Prompt engineering failed, falling back to default:', promptError);
                // Fallback to original system prompt generation
                const conversationHistory = this._formatConversationForPrompt(conversationHistoryRaw);
                systemPrompt = getSystemPrompt(activeProfile, conversationHistory, false);
            }

            // Phase 4: RAG - ALWAYS inform the model about knowledge base
            // This ensures the model knows about KB even when no relevant context is found
            if (userId) {
                try {
                    const stats = await documentService.getDocumentStats(userId);
                    const kbStatus = {
                        hasDocuments: (stats?.total_documents || 0) > 0,
                        indexedCount: stats?.indexed_documents || 0,
                        totalCount: stats?.total_documents || 0
                    };

                    const enriched = await ragService.buildKnowledgeBaseAwarePrompt(
                        userPrompt,
                        systemPrompt,
                        kbStatus,
                        ragContext  // Can be null or have hasContext: false
                    );

                    systemPrompt = enriched.prompt;
                    ragSources = enriched.sources || [];

                    if (enriched.hasContext) {
                        console.log(`[AskService] RAG: ✅ System prompt enriched with ${ragSources.length} sources`);
                    } else if (kbStatus.indexedCount > 0) {
                        console.log(`[AskService] RAG: ℹ️ Model informed about KB (${kbStatus.indexedCount} docs) - no relevant context found`);
                    } else {
                        console.log(`[AskService] RAG: ℹ️ Model informed about empty KB`);
                    }
                } catch (enrichError) {
                    console.warn('[AskService] RAG: Error enriching prompt, using base prompt:', enrichError.message);
                    // Continue with base prompt if enrichment fails
                }
            }

            // Phase 3: Inject external data sources into prompt
            try {
                const dataSourcesPrompt = await dataSourceInjector.getDataSourcesPrompt(userId);
                if (dataSourcesPrompt) {
                    systemPrompt = systemPrompt + '\n\n' + dataSourcesPrompt;
                    console.log('[AskService] Phase 3: External data sources injected into prompt');
                }
            } catch (dsError) {
                console.warn('[AskService] Phase 3: Error injecting data sources:', dsError.message);
            }

            // Construire le tableau de messages avec l'historique pour maintenir le contexte
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // Ajouter les messages précédents de la session (en excluant le tout dernier qui est la question actuelle)
            // Limiter à 10 derniers échanges pour éviter de dépasser les limites de tokens
            // On exclut le dernier message car c'est celui qu'on vient d'ajouter à la ligne 261
            const messagesForContext = previousMessages.slice(0, -1); // Exclure le dernier message
            const recentMessages = messagesForContext.slice(-20); // 20 messages = ~10 échanges user/assistant

            for (const msg of recentMessages) {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }

            // Ajouter le nouveau message utilisateur avec indication de screenshot si disponible
            const userMessageContent = [];

            if (screenshotBase64) {
                // Informer le modèle qu'une capture d'écran est attachée
                userMessageContent.push({
                    type: 'text',
                    text: `[CAPTURE D'ÉCRAN ATTACHÉE: Une capture d'écran de l'écran de l'utilisateur est jointe à ce message. Analyse cette image pour répondre à la demande. Tu as des capacités de vision et peux voir le contenu de l'image.]\n\nUser Request: ${userPrompt.trim()}`
                });

                // Ajouter l'image après le texte d'instruction
                const imageDataUrl = `data:image/jpeg;base64,${screenshotBase64}`;
                userMessageContent.push({
                    type: 'image_url',
                    image_url: { url: imageDataUrl },
                });

                console.log(`[AskService] 📸 Screenshot attached to message:`);
                console.log(`[AskService]    - Model: ${modelInfo.model} (provider: ${modelInfo.provider})`);
                console.log(`[AskService]    - Image size: ${Math.round(screenshotBase64.length / 1024)}KB`);
                console.log(`[AskService]    - Content parts: ${userMessageContent.length} (text + image_url)`);
            } else if (visionWarning && isScreenshotEnabled) {
                // Model doesn't support vision but user has it enabled - inform in the prompt
                userMessageContent.push({
                    type: 'text',
                    text: `[NOTE: L'utilisateur a activé les captures d'écran, mais le modèle actuel (${modelInfo.model}) ne supporte pas la vision. Si l'utilisateur pose une question sur son écran ou demande d'analyser une image, informe-le poliment qu'il doit changer de modèle pour un modèle avec vision comme gpt-4o, gpt-4-turbo, claude-3-5-sonnet, ou gemini-2.5-flash.]\n\nUser Request: ${userPrompt.trim()}`
                });
                console.log('[AskService] ⚠️ Vision warning added to prompt - model informed of limitation');
            } else {
                userMessageContent.push({
                    type: 'text',
                    text: `User Request: ${userPrompt.trim()}`
                });
                // Log why no screenshot was attached
                if (!isScreenshotEnabled) {
                    console.log(`[AskService] ℹ️ No screenshot: Screenshot capture is DISABLED in settings`);
                } else if (!screenshotBase64) {
                    console.log(`[AskService] ℹ️ No screenshot: Capture failed or returned empty`);
                }
            }

            messages.push({
                role: 'user',
                content: userMessageContent,
            });
            
            // Dynamic token adaptation based on document length requirements
            const tokenConfig = documentLengthDetector.calculateMaxTokens(userPrompt, modelInfo.model);
            if (tokenConfig.isLongDocument) {
                console.log(`[AskService] Long document detected: ${tokenConfig.detection.pages} pages, using ${tokenConfig.maxTokens} tokens`);
            }
            if (tokenConfig.warning) {
                console.warn(`[AskService] Token warning: ${tokenConfig.warning}`);
            }

            const streamingLLM = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7,
                maxTokens: tokenConfig.maxTokens,
                usePortkey: modelInfo.provider === 'openai-lucide',
                portkeyVirtualKey: modelInfo.provider === 'openai-lucide' ? modelInfo.apiKey : undefined,
            });

            // Estimate input tokens for tracking (since streaming doesn't provide usage data)
            const inputTokenEstimate = this._estimateMessagesTokens(messages);
            const trackingContext = {
                provider: modelInfo.provider,
                model: modelInfo.model,
                inputTokens: inputTokenEstimate,
                sessionId
            };

            try {
                const response = await streamingLLM.streamChat(messages);
                const askWin = getWindowPool()?.get('ask');

                if (!askWin || askWin.isDestroyed()) {
                    console.error("[AskService] Ask window is not available to send stream to.");
                    response.body.getReader().cancel();
                    return { success: false, error: 'Ask window is not available.' };
                }

                const reader = response.body.getReader();
                // Fix MEDIUM BUG-M13: Use helper to prevent listener accumulation
                this._addAbortListener(signal, reader, 'abort');

                await this._processStream(reader, askWin, sessionId, signal, ragSources, trackingContext);
                return { success: true };

            } catch (multimodalError) {
                // Si la requête multimodale a échoué et contient une capture d'écran, réessayer avec le texte seul
                if (screenshotBase64 && this._isMultimodalError(multimodalError)) {
                    console.log(`[AskService] Multimodal request failed, retrying with text-only: ${multimodalError.message}`);

                    // Reconstruire le message avec le texte seul
                    const textOnlyMessages = [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: `User Request: ${userPrompt.trim()}`
                        }
                    ];

                    // Re-estimate input tokens for text-only fallback
                    const fallbackInputTokens = this._estimateMessagesTokens(textOnlyMessages);
                    const fallbackTrackingContext = {
                        provider: modelInfo.provider,
                        model: modelInfo.model,
                        inputTokens: fallbackInputTokens,
                        sessionId
                    };

                    const fallbackResponse = await streamingLLM.streamChat(textOnlyMessages);
                    const askWin = getWindowPool()?.get('ask');

                    if (!askWin || askWin.isDestroyed()) {
                        console.error("[AskService] Ask window is not available for fallback response.");
                        fallbackResponse.body.getReader().cancel();
                        return { success: false, error: 'Ask window is not available.' };
                    }

                    const fallbackReader = fallbackResponse.body.getReader();
                    // Fix MEDIUM BUG-M13: Use helper to prevent listener accumulation
                    this._addAbortListener(signal, fallbackReader, 'abort');

                    await this._processStream(fallbackReader, askWin, sessionId, signal, ragSources, fallbackTrackingContext);
                    return { success: true };
                } else {
                    // Si c'est un autre type d'erreur ou s'il n'y avait pas de capture d'écran, propager l'erreur
                    throw multimodalError;
                }
            }

        } catch (error) {
            console.error('[AskService] Error during message processing:', error);
            this.state = {
                ...this.state,
                isLoading: false,
                isStreaming: false,
                showTextInput: true,
            };
            this._broadcastState();

            const askWin = getWindowPool()?.get('ask');
            if (askWin && !askWin.isDestroyed()) {
                const streamError = error.message || 'Unknown error occurred';
                askWin.webContents.send('ask-response-stream-error', { error: streamError });
            }

            return { success: false, error: error.message };
        } finally {
            // Fix MEDIUM BUG-M15: Clean up AbortController and listeners
            this._cleanupAbortController();
        }
    }

    /**
     * Process streaming LLM response and track token usage
     *
     * @param {ReadableStreamDefaultReader} reader
     * @param {BrowserWindow} askWin
     * @param {number} sessionId
     * @param {AbortSignal} signal
     * @param {Array} ragSources - RAG context sources for citation tracking
     * @param {Object} trackingContext - Token tracking context {provider, model, inputTokens, sessionId}
     * @returns {Promise<void>}
     * @private
     */
    async _processStream(reader, askWin, sessionId, signal, ragSources = [], trackingContext = null) {
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
            this.state.isLoading = false;
            this.state.isStreaming = true;
            this._broadcastState();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            return;
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                fullResponse += token;
                                this.state.currentResponse = fullResponse;
                                this._broadcastState();
                            }
                        } catch (error) {
                        }
                    }
                }
            }
        } catch (streamError) {
            if (signal.aborted) {
                console.log(`[AskService] Stream reading was intentionally cancelled. Reason: ${signal.reason}`);
            } else {
                console.error('[AskService] Error while processing stream:', streamError);
                if (askWin && !askWin.isDestroyed()) {
                    askWin.webContents.send('ask-response-stream-error', { error: streamError.message });
                }
            }
        } finally {
            this.state.isStreaming = false;
            this.state.currentResponse = fullResponse;
            this._broadcastState();
            if (fullResponse) {
                 try {
                    const messageRecord = await askRepository.addAiMessage({ sessionId, role: 'assistant', content: fullResponse });
                    console.log(`[AskService] DB: Saved partial or full assistant response to session ${sessionId} after stream ended.`);

                    // Track token usage for streaming response (estimated)
                    if (trackingContext) {
                        try {
                            const outputTokens = tokenTrackingService.estimateTokens(fullResponse);
                            const usageData = {
                                provider: trackingContext.provider,
                                model: trackingContext.model,
                                inputTokens: trackingContext.inputTokens,
                                outputTokens: outputTokens,
                                totalTokens: trackingContext.inputTokens + outputTokens,
                                cost: tokenTrackingService.calculateCost(
                                    trackingContext.provider,
                                    trackingContext.model,
                                    trackingContext.inputTokens,
                                    outputTokens
                                ),
                                estimated: true, // Mark as estimated since streaming doesn't provide actual counts
                                feature: 'ask',
                                timestamp: Date.now()
                            };

                            // Update session and global stats
                            await tokenTrackingService.updateSessionUsage(sessionId, usageData);
                            tokenTrackingService.updateGlobalStats(usageData);

                            console.log(`[AskService] Token tracking (estimated): input=${trackingContext.inputTokens}, output=${outputTokens}, total=${usageData.totalTokens}, cost=$${usageData.cost.toFixed(4)}`);
                        } catch (trackingError) {
                            console.warn('[AskService] Token tracking failed:', trackingError);
                            // Non-critical error, don't fail the operation
                        }
                    }

                    // Phase 4: RAG - Track citations if context was used
                    if (ragSources && ragSources.length > 0) {
                        try {
                            const messageId = messageRecord?.id || null;
                            await ragService.trackCitations(sessionId, messageId, ragSources);
                            console.log(`[AskService] RAG: Tracked ${ragSources.length} citations for session ${sessionId}`);
                        } catch (citationError) {
                            console.warn('[AskService] RAG: Error tracking citations:', citationError);
                            // Non-critical error, don't fail the whole operation
                        }
                    }

                    // Phase 2: Parse and execute AI-triggered actions
                    if (actionParser.hasActions(fullResponse)) {
                        try {
                            const { actions, cleanText } = actionParser.parse(fullResponse);
                            console.log(`[AskService] Actions: Found ${actions.length} action(s) in response`);

                            if (actions.length > 0) {
                                // FIX: Use authService.getCurrentUserId() instead of non-existent getModelState()
                                const userId = authService.getCurrentUserId() || 'default_user';

                                const executionContext = {
                                    sessionId,
                                    userId,
                                    source: 'ai_response'
                                };

                                // Execute actions asynchronously
                                const results = await actionExecutor.executeAll(actions, executionContext);

                                // Log results
                                for (const result of results) {
                                    console.log(`[AskService] Action ${result.actionType}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message || result.error}`);
                                }

                                // Notify UI about executed actions
                                if (askWin && !askWin.isDestroyed()) {
                                    askWin.webContents.send('ask-actions-executed', {
                                        sessionId,
                                        actions: results.map(r => ({
                                            type: r.actionType,
                                            success: r.success,
                                            message: r.message || r.error
                                        }))
                                    });
                                }
                            }
                        } catch (actionError) {
                            console.warn('[AskService] Action parsing/execution error:', actionError);
                            // Non-critical error, don't fail the whole operation
                        }
                    }

                    // Phase 2: Auto-index conversation after AI response
                    // This indexes the conversation in the background for future RAG retrieval
                    // FIX: Use authService.getCurrentUserId() directly instead of non-existent getModelState()
                    const indexUserId = authService.getCurrentUserId();
                    if (sessionId && indexUserId) {
                        this._tryAutoIndexSession(sessionId, indexUserId);
                    }
                } catch(dbError) {
                    console.error("[AskService] DB: Failed to save assistant response after stream ended:", dbError);
                }
            }
        }
    }

    /**
     * Estimate total tokens for an array of messages
     * Used for tracking input tokens in streaming requests
     *
     * @param {Array} messages - Array of message objects {role, content}
     * @returns {number} Estimated token count
     * @private
     */
    _estimateMessagesTokens(messages) {
        if (!Array.isArray(messages) || messages.length === 0) {
            return 0;
        }

        let totalTokens = 0;

        for (const message of messages) {
            // Add overhead for message structure (~4 tokens per message for role, etc.)
            totalTokens += 4;

            // Handle different content formats
            const content = message.content;

            if (typeof content === 'string') {
                totalTokens += tokenTrackingService.estimateTokens(content);
            } else if (Array.isArray(content)) {
                // Multimodal content (array of content blocks)
                for (const block of content) {
                    if (block.type === 'text' && block.text) {
                        totalTokens += tokenTrackingService.estimateTokens(block.text);
                    } else if (block.type === 'image_url') {
                        // Images typically consume ~85-170 tokens depending on detail
                        // Use conservative estimate of 100 tokens per image
                        totalTokens += 100;
                    }
                }
            }
        }

        // Add base overhead for the conversation structure (~3 tokens)
        totalTokens += 3;

        return totalTokens;
    }

    /**
     * Déterminer si c'est une erreur liée au multimodal
     * @private
     */
    _isMultimodalError(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        return (
            errorMessage.includes('vision') ||
            errorMessage.includes('image') ||
            errorMessage.includes('multimodal') ||
            errorMessage.includes('unsupported') ||
            errorMessage.includes('image_url') ||
            errorMessage.includes('400') ||  // Bad Request often for unsupported features
            errorMessage.includes('invalid') ||
            errorMessage.includes('not supported')
        );
    }

    /**
     * Phase 2: Try to auto-index a completed conversation session
     * Called after AI responses to index meaningful conversations
     * @param {string} sessionId - Session to potentially index
     * @param {string} userId - User ID
     * @private
     */
    async _tryAutoIndexSession(sessionId, userId) {
        // Skip if no session or user
        if (!sessionId || !userId) {
            return;
        }

        // Skip if already indexed or currently being indexed
        if (this.lastIndexedSessionId === sessionId || this.indexingInProgress.has(sessionId)) {
            return;
        }

        try {
            // Check if session should be indexed (minimum messages, content length, etc.)
            const shouldIndex = await autoIndexingService.shouldIndexConversation(sessionId);

            if (shouldIndex) {
                // Mark as in progress to prevent duplicate indexing
                this.indexingInProgress.add(sessionId);

                console.log(`[AskService] Auto-indexing conversation: ${sessionId}`);

                // Index in background (non-blocking)
                autoIndexingService.indexConversation(sessionId, userId)
                    .then(result => {
                        this.indexingInProgress.delete(sessionId);

                        if (result.indexed) {
                            console.log(`[AskService] ✅ Conversation auto-indexed: ${result.content_id}`);
                            console.log(`[AskService]    Summary: ${result.summary?.substring(0, 80)}...`);
                            console.log(`[AskService]    Entities: ${Object.keys(result.entities || {}).length} types`);
                            this.lastIndexedSessionId = sessionId;
                        } else {
                            console.log(`[AskService] Conversation not indexed: ${result.reason}`);
                        }
                    })
                    .catch(err => {
                        this.indexingInProgress.delete(sessionId);
                        console.error('[AskService] Auto-indexing failed:', err.message);
                    });
            }
        } catch (error) {
            console.error('[AskService] Error checking auto-index:', error.message);
        }
    }

}

const askService = new AskService();

module.exports = askService;