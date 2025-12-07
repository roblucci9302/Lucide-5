const { BrowserWindow } = require('electron');
const SttService = require('./stt/sttService');
const SummaryService = require('./summary/summaryService');
const responseService = require('./response/responseService');
const liveInsightsService = require('./liveInsights/liveInsightsService');
const { liveInsightsRepository } = require('./liveInsights/repositories');
const notificationService = require('./liveInsights/notificationService'); // Phase 3.3
const authService = require('../common/services/authService');
const sessionRepository = require('../common/repositories/session');
const sttRepository = require('./stt/repositories');
const internalBridge = require('../../bridge/internalBridge');
const autoIndexingService = require('../common/services/autoIndexingService'); // Phase 2: Auto-indexing

// Fix NORMAL MEDIUM BUG-M18: Extract suggestion generation debounce timeout
// Wait 800ms after user stops speaking before generating AI response suggestions
// Reduced from 2000ms for faster real-time responses while still avoiding mid-sentence triggers
const SUGGESTION_GENERATION_DEBOUNCE_MS = 800;

// Phase 3.4: Increased close delay to prevent transcript loss from late callbacks
// Increased from 100ms to 500ms for more reliable transcript capture
const SESSION_CLOSE_DELAY_MS = 500;

// Phase 3.3: Buffer configuration for transcript queue during initialization
const TRANSCRIPT_BUFFER_MAX_SIZE = 100; // Maximum transcripts to buffer
const TRANSCRIPT_BUFFER_FLUSH_DELAY_MS = 50; // Delay between flush attempts

// Fix LOW BUG-L1: Extract button state magic strings
// Button text states used in header for listen mode control
// Support both French and English translations
const BUTTON_STATES = {
    // French translations
    LISTEN_FR: 'Écouter',
    PAUSE_FR: 'Pause',
    RESUME_FR: 'Reprendre',
    STOP_FR: 'Arrêter',
    DONE_FR: 'Terminé',
    // English translations
    LISTEN_EN: 'Listen',
    PAUSE_EN: 'Pause',
    RESUME_EN: 'Resume',
    STOP_EN: 'Stop',
    DONE_EN: 'Done'
};

// Helper to check button state regardless of language
const isListenButton = (text) => text === BUTTON_STATES.LISTEN_FR || text === BUTTON_STATES.LISTEN_EN;
const isPauseButton = (text) => text === BUTTON_STATES.PAUSE_FR || text === BUTTON_STATES.PAUSE_EN;
const isResumeButton = (text) => text === BUTTON_STATES.RESUME_FR || text === BUTTON_STATES.RESUME_EN;
const isStopButton = (text) => text === BUTTON_STATES.STOP_FR || text === BUTTON_STATES.STOP_EN;
const isDoneButton = (text) => text === BUTTON_STATES.DONE_FR || text === BUTTON_STATES.DONE_EN;

class ListenService {
    constructor() {
        this.sttService = new SttService();
        this.summaryService = new SummaryService();
        this.currentSessionId = null;
        this.isInitializingSession = false;
        this.isStartingAudio = false; // Fix HIGH BUG-H4: Add flag to prevent concurrent audio starts
        this.lastTranscription = '';
        this.suggestionDebounceTimer = null; // For debouncing AI suggestion requests

        // FIX MEDIUM: Track recent transcripts to prevent duplicates
        this._recentTranscripts = new Map(); // Map<hash, timestamp>
        this._transcriptDedupeWindowMs = 5000; // 5 second window for deduplication

        // Phase 3.1: Transcript counter for real-time UI feedback
        this._transcriptCount = 0;
        this._totalCharacters = 0;

        // Phase 3.3: Transcript buffer for initialization race condition prevention
        this._transcriptBuffer = [];
        this._isFlushingBuffer = false;

        this.setupServiceCallbacks();
        console.log('[ListenService] Service instance created.');
    }

    /**
     * FIX MEDIUM: Generate a simple hash for transcript deduplication
     * @private
     */
    _getTranscriptHash(speaker, text) {
        return `${speaker}:${text.trim().toLowerCase()}`;
    }

    /**
     * FIX MEDIUM: Check if transcript is a duplicate within the time window
     * @private
     */
    _isDuplicateTranscript(speaker, text) {
        const hash = this._getTranscriptHash(speaker, text);
        const now = Date.now();

        // Clean up old entries
        for (const [key, timestamp] of this._recentTranscripts) {
            if (now - timestamp > this._transcriptDedupeWindowMs) {
                this._recentTranscripts.delete(key);
            }
        }

        if (this._recentTranscripts.has(hash)) {
            console.warn(`[ListenService] Duplicate transcript detected and skipped: ${text.substring(0, 50)}...`);
            return true;
        }

        // Add to recent transcripts
        this._recentTranscripts.set(hash, now);
        return false;
    }

    setupServiceCallbacks() {
        // STT service callbacks
        this.sttService.setCallbacks({
            onTranscriptionComplete: (speaker, text) => {
                this.handleTranscriptionComplete(speaker, text);
            },
            onStatusUpdate: (status) => {
                this.sendToRenderer('update-status', status);
            }
        });

        // Summary service callbacks
        this.summaryService.setCallbacks({
            onAnalysisComplete: (data) => {
                console.log('📊 Analysis completed:', data);
            },
            onStatusUpdate: (status) => {
                this.sendToRenderer('update-status', status);
            }
        });

        // Response service callbacks (real-time AI suggestions)
        responseService.setCallbacks({
            onSuggestionsReady: (suggestions) => {
                console.log('💬 AI suggestions ready:', suggestions);
                this.sendToRenderer('ai-response-ready', { suggestions });
            },
            onSuggestionsError: (error) => {
                console.error('❌ AI suggestions error:', error.message);
                this.sendToRenderer('ai-response-error', { error: error.message });
            }
        });

        // Live Insights service callbacks (Phase 3)
        liveInsightsService.on('insight-detected', (insight) => {
            console.log(`[LiveInsights] ${insight.priority.toUpperCase()}: ${insight.title}`);

            // Send to renderer for real-time display
            this.sendToRenderer('insight-detected', { insight });

            // Save to database
            this._saveInsightToDatabase(insight);
        });

        liveInsightsService.on('insight-dismissed', (insight) => {
            console.log(`[LiveInsights] Dismissed: ${insight.title}`);
            this.sendToRenderer('insight-dismissed', { insightId: insight.id });
        });

        // Notification service callbacks (Phase 3.3)
        notificationService.on('notification', (notification) => {
            this.sendToRenderer('notification', notification);
        });

        notificationService.on('notification-read', (notification) => {
            this.sendToRenderer('notification-read', notification);
        });

        notificationService.on('all-notifications-read', () => {
            this.sendToRenderer('all-notifications-read', {});
        });

        notificationService.on('notification-expired', (notificationId) => {
            this.sendToRenderer('notification-expired', notificationId);
        });

        notificationService.on('all-notifications-cleared', () => {
            this.sendToRenderer('all-notifications-cleared', {});
        });

        notificationService.on('preferences-updated', (preferences) => {
            this.sendToRenderer('notification-preferences-updated', { preferences });
        });
    }

    /**
     * Fix LOW BUG-L3: Add JSDoc for public methods
     * Sends data to the listen window renderer process
     * @param {string} channel - IPC channel name
     * @param {*} data - Data to send to renderer
     */
    sendToRenderer(channel, data) {
        const { windowPool } = require('../../window/windowManager');
        const listenWindow = windowPool?.get('listen');

        if (listenWindow && !listenWindow.isDestroyed()) {
            listenWindow.webContents.send(channel, data);
            // Fix LOW BUG-L4: Add consistent return value
            return true;
        }
        return false;
    }

    /**
     * Initialize the listen service (IPC handlers registered in conversationBridge.js)
     */
    initialize() {
        // IPC handlers are registered in conversationBridge.js
        // Service callbacks are already set up in constructor via setupServiceCallbacks()
        console.log('[ListenService] Initialized and ready.');
    }

    /**
     * Handle listen mode button state changes from header
     * @param {string} listenButtonText - Button state (supports FR/EN): 'Écouter'/'Listen' | 'Pause' | 'Reprendre'/'Resume' | 'Arrêter'/'Stop' | 'Terminé'/'Done'
     * @returns {Promise<void>}
     * @throws {Error} If unknown button state or session operation fails
     */
    async handleListenRequest(listenButtonText) {
        const { windowPool } = require('../../window/windowManager');
        const listenWindow = windowPool.get('listen');
        const header = windowPool.get('header');

        try {
            if (isListenButton(listenButtonText)) {
                // Start a new session
                console.log('[ListenService] changeSession to "Listen"');
                internalBridge.emit('window:requestVisibility', { name: 'listen', visible: true });
                await this.initializeSession();
                if (listenWindow && !listenWindow.isDestroyed()) {
                    listenWindow.webContents.send('session-state-changed', { isActive: true });
                }
            } else if (isPauseButton(listenButtonText)) {
                // Pause: stop audio capture but keep session and suggestions alive
                console.log('[ListenService] changeSession to "Pause"');
                await this.pauseSession();
                if (listenWindow && !listenWindow.isDestroyed()) {
                    listenWindow.webContents.send('session-state-changed', { isActive: true, isPaused: true });
                }
            } else if (isResumeButton(listenButtonText)) {
                // Resume: restart audio capture
                console.log('[ListenService] changeSession to "Resume"');
                await this.resumeSession();
                if (listenWindow && !listenWindow.isDestroyed()) {
                    listenWindow.webContents.send('session-state-changed', { isActive: true, isPaused: false });
                }
            } else if (isStopButton(listenButtonText)) {
                // Stop completely: close everything
                console.log('[ListenService] changeSession to "Stop"');
                await this.closeSession();
                if (listenWindow && !listenWindow.isDestroyed()) {
                    listenWindow.webContents.send('session-state-changed', { isActive: false });
                }
                // Notify header to go to afterSession state
                if (header && !header.isDestroyed()) {
                    header.webContents.send('listen:changeSessionResult', { success: true, action: 'stopped' });
                }
                return; // Return early, we already sent the result
            } else if (isDoneButton(listenButtonText)) {
                // Done: close session properly and hide window
                console.log('[ListenService] changeSession to "Done"');
                // Fix: Call closeSession() to properly set ended_at in database
                // This ensures the session can be found for post-meeting reports
                await this.closeSession();
                internalBridge.emit('window:requestVisibility', { name: 'listen', visible: false });
                if (listenWindow && !listenWindow.isDestroyed()) {
                    listenWindow.webContents.send('session-state-changed', { isActive: false });
                }
            } else {
                throw new Error(`[ListenService] unknown listenButtonText: ${listenButtonText}`);
            }

            // Fix CRITICAL BUG-C2: Add null check before sending to header window
            if (header && !header.isDestroyed()) {
                header.webContents.send('listen:changeSessionResult', { success: true });
            }

        } catch (error) {
            console.error('[ListenService] error in handleListenRequest:', error);
            // Fix CRITICAL BUG-C3: Add null check before sending error to header window
            if (header && !header.isDestroyed()) {
                header.webContents.send('listen:changeSessionResult', { success: false });
            }
            throw error;
        }
    }

    /**
     * Handle completed transcription from STT service
     * Saves to database, adds to summary/response services, and processes live insights
     * @param {string} speaker - Speaker identifier: 'Me' | 'Them'
     * @param {string} text - Transcribed text
     * @returns {Promise<void>}
     */
    async handleTranscriptionComplete(speaker, text) {
        console.log(`[ListenService] Transcription complete: ${speaker} - ${text}`);

        // Fix HIGH BUG #8: Wrap critical operations in try-catch to prevent data loss
        try {
            // Save to database - CRITICAL: must succeed or transcription is lost
            await this.saveConversationTurn(speaker, text);
        } catch (error) {
            console.error('[ListenService] CRITICAL: Failed to save transcription to database:', error);
            // Notify user of data loss
            this.sendToRenderer('transcription-save-failed', {
                speaker,
                text,
                error: error.message
            });
        }

        // Fix HIGH BUG #8: Add error handling for summary service
        try {
            // Add to summary service for analysis
            this.summaryService.addConversationTurn(speaker, text);
        } catch (error) {
            console.error('[ListenService] Failed to add turn to summary service:', error);
            // Continue - summary is not critical for core functionality
        }

        // Fix HIGH BUG #8: Add error handling for response service
        try {
            // Add to response service for real-time suggestions
            responseService.addConversationTurn(speaker, text);
        } catch (error) {
            console.error('[ListenService] Failed to add turn to response service:', error);
            // Continue - response suggestions are not critical
        }

        // Process for live insights (Phase 3) - Fire-and-forget with error handling
        liveInsightsService.processConversationTurn(speaker, text).catch(error => {
            console.error('[ListenService] Failed to process live insights:', error);
        });

        // Fix LOW BUG-L5: Translate French comment to English for consistency
        // Save last transcription if user is speaking (for AI suggestions)
        if (speaker === 'Me') {
            this.lastTranscription = text;

            // Debounce AI suggestion requests to avoid overwhelming the service
            if (this.suggestionDebounceTimer) {
                clearTimeout(this.suggestionDebounceTimer);
            }

            this.suggestionDebounceTimer = setTimeout(() => {
                console.log('[ListenService] User finished speaking, generating response suggestions...');
                // Notify UI that generation is starting
                this.sendToRenderer('ai-response-generating', { speaker: 'Me' });
                responseService.generateSuggestions().catch(error => {
                    console.error('[ListenService] Failed to generate suggestions:', error);
                });
            }, SUGGESTION_GENERATION_DEBOUNCE_MS);
        }

        // Generate suggestions when the other person asks a question or makes a request
        // This helps the user prepare a response in real-time
        if (speaker === 'Them') {
            const isQuestion = this._detectQuestionOrRequest(text);
            if (isQuestion) {
                // Clear any pending timer and generate suggestions immediately
                if (this.suggestionDebounceTimer) {
                    clearTimeout(this.suggestionDebounceTimer);
                }

                this.suggestionDebounceTimer = setTimeout(() => {
                    console.log('[ListenService] Other person asked a question, generating response suggestions...');
                    // Notify UI that generation is starting
                    this.sendToRenderer('ai-response-generating', { speaker: 'Them', isQuestion: true });
                    responseService.generateSuggestions().catch(error => {
                        console.error('[ListenService] Failed to generate suggestions:', error);
                    });
                }, SUGGESTION_GENERATION_DEBOUNCE_MS);
            }
        }
    }

    /**
     * Detect if text contains a question or request (French + English)
     * @private
     * @param {string} text - Text to analyze
     * @returns {boolean} True if text contains a question or request
     */
    _detectQuestionOrRequest(text) {
        if (!text || typeof text !== 'string') return false;

        const lowerText = text.toLowerCase().trim();

        // Direct question (ends with ?)
        if (text.trim().endsWith('?')) return true;

        // French question patterns
        const frenchPatterns = [
            /\b(qu'est-ce que|qu'est ce que|est-ce que|c'est quoi)\b/i,
            /\b(comment|pourquoi|quand|où|qui|quel|quelle|quels|quelles)\b/i,
            /\b(peux-tu|pouvez-vous|pourriez-vous|pourrais-tu)\b/i,
            /\b(as-tu|avez-vous|est-ce|y a-t-il)\b/i,
            /\b(dis-moi|dites-moi|explique|expliquez)\b/i,
        ];

        // English question patterns
        const englishPatterns = [
            /\b(what|how|why|when|where|who|which)\b/i,
            /\b(can you|could you|would you|will you)\b/i,
            /\b(do you|does|did|is|are|was|were|have|has|had)\s+(you|it|this|that|there)\b/i,
            /\b(tell me|show me|explain)\b/i,
        ];

        const allPatterns = [...frenchPatterns, ...englishPatterns];
        return allPatterns.some(pattern => pattern.test(lowerText));
    }

    async saveConversationTurn(speaker, transcription) {
        const trimmedText = transcription.trim();
        if (trimmedText === '') return;

        // Phase 3.3: Buffer transcripts if session not ready yet
        if (!this.currentSessionId) {
            if (this.isInitializingSession) {
                // Buffer the transcript for later
                if (this._transcriptBuffer.length < TRANSCRIPT_BUFFER_MAX_SIZE) {
                    this._transcriptBuffer.push({ speaker, text: trimmedText, timestamp: Date.now() });
                    console.log(`[ListenService] Buffered transcript (${this._transcriptBuffer.length}): ${trimmedText.substring(0, 30)}...`);
                } else {
                    console.warn('[ListenService] Transcript buffer full, dropping oldest entry');
                    this._transcriptBuffer.shift();
                    this._transcriptBuffer.push({ speaker, text: trimmedText, timestamp: Date.now() });
                }
                return;
            } else {
                console.error('[DB] Cannot save turn, no active session ID.');
                return;
            }
        }

        // FIX MEDIUM: Check for duplicate transcripts
        if (this._isDuplicateTranscript(speaker, trimmedText)) {
            return; // Skip duplicate
        }

        try {
            await sessionRepository.touch(this.currentSessionId);
            await sttRepository.addTranscript({
                sessionId: this.currentSessionId,
                speaker: speaker,
                text: trimmedText,
            });

            // Phase 3.1: Update transcript counter and notify UI
            this._transcriptCount++;
            this._totalCharacters += trimmedText.length;
            this._sendTranscriptStats();

            console.log(`[DB] Saved transcript for session ${this.currentSessionId}: (${speaker}) [${this._transcriptCount} total]`);
        } catch (error) {
            console.error('Failed to save transcript to DB:', error);
        }
    }

    /**
     * Phase 3.1: Send transcript statistics to renderer for real-time display
     * @private
     */
    _sendTranscriptStats() {
        this.sendToRenderer('transcript-stats', {
            count: this._transcriptCount,
            characters: this._totalCharacters,
            sessionId: this.currentSessionId
        });
    }

    /**
     * Phase 3.3: Flush buffered transcripts after session is initialized
     * @private
     */
    async _flushTranscriptBuffer() {
        if (this._isFlushingBuffer || this._transcriptBuffer.length === 0) return;

        this._isFlushingBuffer = true;
        console.log(`[ListenService] Flushing ${this._transcriptBuffer.length} buffered transcripts...`);

        try {
            while (this._transcriptBuffer.length > 0 && this.currentSessionId) {
                const { speaker, text } = this._transcriptBuffer.shift();

                // Skip if already a duplicate
                if (this._isDuplicateTranscript(speaker, text)) continue;

                await sttRepository.addTranscript({
                    sessionId: this.currentSessionId,
                    speaker: speaker,
                    text: text,
                });

                this._transcriptCount++;
                this._totalCharacters += text.length;

                // Small delay to avoid overwhelming the DB
                await new Promise(resolve => setTimeout(resolve, TRANSCRIPT_BUFFER_FLUSH_DELAY_MS));
            }

            this._sendTranscriptStats();
            console.log(`[ListenService] Flushed all buffered transcripts. Total: ${this._transcriptCount}`);
        } catch (error) {
            console.error('[ListenService] Error flushing transcript buffer:', error);
        } finally {
            this._isFlushingBuffer = false;
        }
    }

    async initializeNewSession() {
        try {
            // The UID is no longer passed to the repository method directly.
            // The adapter layer handles UID injection. We just ensure a user is available.
            const user = authService.getCurrentUser();
            if (!user) {
                // This case should ideally not happen as authService initializes a default user.
                throw new Error("Cannot initialize session: auth service not ready.");
            }

            // Phase 3.1: Reset transcript counters for new session
            this._transcriptCount = 0;
            this._totalCharacters = 0;
            this._sendTranscriptStats();

            this.currentSessionId = await sessionRepository.getOrCreateActive('listen');
            console.log(`[DB] New listen session ensured: ${this.currentSessionId}`);

            // FIX HIGH: Validate session type after retrieval to ensure it's 'listen'
            // This catches cases where session promotion from 'ask' to 'listen' failed
            const session = await sessionRepository.getById(this.currentSessionId);
            if (session && session.session_type !== 'listen') {
                console.warn(`[ListenService] Session ${this.currentSessionId} has wrong type '${session.session_type}', forcing to 'listen'`);
                await sessionRepository.updateType(this.currentSessionId, 'listen');
            }

            // Set session ID for summary service
            this.summaryService.setSessionId(this.currentSessionId);

            // Set session ID for live insights service (Phase 3)
            liveInsightsService.setSessionId(this.currentSessionId);

            // Set session ID for response service (for token tracking)
            responseService.setSessionId(this.currentSessionId);

            // Link summary service to response service for context enrichment
            responseService.setSummaryService(this.summaryService);

            // Reset conversation history
            this.summaryService.resetConversationHistory();
            responseService.resetConversationHistory();

            // Phase 3.3: Flush any buffered transcripts that arrived during initialization
            this._flushTranscriptBuffer();

            console.log('New conversation session started:', this.currentSessionId);
            return true;
        } catch (error) {
            console.error('Failed to initialize new session in DB:', error);
            this.currentSessionId = null;
            return false;
        }
    }

    async initializeSession(language = 'fr') {
        if (this.isInitializingSession) {
            console.log('Session initialization already in progress.');
            return false;
        }

        this.isInitializingSession = true;
        this.sendToRenderer('session-initializing', true);
        this.sendToRenderer('update-status', 'Initializing sessions...');

        try {
            // Initialize database session
            const sessionInitialized = await this.initializeNewSession();
            if (!sessionInitialized) {
                throw new Error('Failed to initialize database session');
            }

            /* ---------- STT Initialization Retry Logic ---------- */
            // Fix MEDIUM BUG-M3: Document retry configuration with exponential backoff
            const STT_INIT_CONFIG = {
                MAX_RETRY: 10,              // Maximum retry attempts for STT initialization
                INITIAL_DELAY_MS: 300,      // Initial delay between retries (300ms)
                BACKOFF_MULTIPLIER: 1.5     // Exponential backoff multiplier
            };

            let sttReady = false;
            let currentDelay = STT_INIT_CONFIG.INITIAL_DELAY_MS;

            // Fix HIGH BUG-H1: Store original session ID to detect session changes
            const originalSessionId = this.currentSessionId;

            for (let attempt = 1; attempt <= STT_INIT_CONFIG.MAX_RETRY; attempt++) {
                // Fix HIGH BUG-H1: Check if session changed (not just null) during retry loop
                // This prevents race condition where new session starts during retry
                if (!this.currentSessionId || this.currentSessionId !== originalSessionId) {
                    console.log('[ListenService] Session changed during STT init - aborting');
                    throw new Error('Session changed during initialization');
                }

                try {
                    console.log(`[ListenService] STT init attempt ${attempt}/${STT_INIT_CONFIG.MAX_RETRY}`);
                    await this.sttService.initializeSttSessions(language);
                    sttReady = true;
                    console.log(`[ListenService] STT initialized successfully after ${attempt} attempt(s)`);
                    break;                         // Exit on success
                } catch (err) {
                    console.warn(
                        `[ListenService] STT init attempt ${attempt}/${STT_INIT_CONFIG.MAX_RETRY} failed: ${err.message}`
                    );
                    if (attempt < STT_INIT_CONFIG.MAX_RETRY) {
                        console.log(`[ListenService] Retrying in ${currentDelay}ms...`);
                        await new Promise(r => setTimeout(r, currentDelay));
                        currentDelay = Math.floor(currentDelay * STT_INIT_CONFIG.BACKOFF_MULTIPLIER); // Exponential backoff
                    }
                }
            }

            if (!sttReady) {
                throw new Error(`STT init failed after ${STT_INIT_CONFIG.MAX_RETRY} attempts`);
            }
            /* ------------------------------------------- */

            console.log('✅ Listen service initialized successfully.');

            this.sendToRenderer('update-status', 'Connected. Ready to listen.');

            // Fix HIGH BUG-H2: Send "start" status in finally to ensure it's sent on success
            this.isInitializingSession = false;
            this.sendToRenderer('session-initializing', false);
            console.log('[ListenService] 🎙️ SENDING change-listen-capture-state with status: "start"');
            this.sendToRenderer('change-listen-capture-state', { status: "start" });

            return true;
        } catch (error) {
            console.error('❌ Failed to initialize listen service:', error);
            this.sendToRenderer('update-status', 'Initialization failed.');

            // Fix HIGH BUG-H2: Cleanup flags but don't send "start" status on failure
            this.isInitializingSession = false;
            this.sendToRenderer('session-initializing', false);
            // NOT sending "start" status - UI should remain in error state

            return false;
        }
    }

    async sendMicAudioContent(data, mimeType) {
        return await this.sttService.sendMicAudioContent(data, mimeType);
    }

    async startMacOSAudioCapture() {
        if (process.platform !== 'darwin') {
            throw new Error('macOS audio capture only available on macOS');
        }
        return await this.sttService.startMacOSAudioCapture();
    }

    async stopMacOSAudioCapture() {
        // Fix HIGH BUG-H5: Await to allow proper handler cleanup
        await this.sttService.stopMacOSAudioCapture();
    }

    isSessionActive() {
        return this.sttService.isSessionActive();
    }

    /**
     * Pause the current session - stops audio capture but keeps everything else alive
     * Suggestions and insights remain visible and the session can be resumed
     */
    async pauseSession() {
        try {
            console.log('[ListenService] Pausing session...');

            // Stop audio capture in renderer
            this.sendToRenderer('change-listen-capture-state', { status: "pause" });

            // Stop macOS audio capture if running
            await this.stopMacOSAudioCapture();

            // Keep STT sessions alive for quick resume
            // Keep suggestions/insights service alive
            // Keep database session open

            console.log('[ListenService] Session paused - suggestions remain active');
            return { success: true };
        } catch (error) {
            console.error('[ListenService] Error pausing session:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Resume a paused session - restarts audio capture
     */
    async resumeSession() {
        try {
            console.log('[ListenService] Resuming session...');

            // Restart audio capture in renderer
            this.sendToRenderer('change-listen-capture-state', { status: "start" });

            // Restart macOS audio capture if on macOS
            if (process.platform === 'darwin') {
                await this.startMacOSAudioCapture();
            }

            console.log('[ListenService] Session resumed');
            return { success: true };
        } catch (error) {
            console.error('[ListenService] Error resuming session:', error);
            return { success: false, error: error.message };
        }
    }

    async closeSession() {
        try {
            this.sendToRenderer('change-listen-capture-state', { status: "stop" });

            // Clear any pending debounced suggestion requests
            if (this.suggestionDebounceTimer) {
                clearTimeout(this.suggestionDebounceTimer);
                this.suggestionDebounceTimer = null;
            }

            // FIX CRITICAL: Save session ID before any async operations to prevent transcript loss
            // This ensures late-arriving transcriptions can still be saved
            const closingSessionId = this.currentSessionId;
            const userId = authService.getCurrentUserId();

            // Phase 3.1: Log final transcript stats before closing
            console.log(`[ListenService] Session closing with ${this._transcriptCount} transcripts (${this._totalCharacters} chars)`);

            // Close STT sessions
            await this.sttService.closeSessions();

            await this.stopMacOSAudioCapture();

            // Phase 3.4: Wait for any pending transcription callbacks to complete
            // Increased from 100ms to 500ms for more reliable transcript capture
            await new Promise(resolve => setTimeout(resolve, SESSION_CLOSE_DELAY_MS));

            // End database session and trigger auto-indexing
            if (closingSessionId) {
                await sessionRepository.end(closingSessionId);
                console.log(`[DB] Session ${closingSessionId} ended.`);

                // Phase 2: Auto-index the audio session (non-blocking)
                // This extracts entities, speakers, actions from the transcription
                if (userId) {
                    autoIndexingService.indexAudioSession(closingSessionId, userId)
                        .then(result => {
                            if (result.indexed) {
                                console.log(`[ListenService] ✅ Audio session auto-indexed: ${result.content_id}`);
                                console.log(`[ListenService]    Summary: ${result.summary?.substring(0, 80)}...`);
                                console.log(`[ListenService]    Speakers: ${result.speakerAnalysis?.speakerCount || 0}`);
                                console.log(`[ListenService]    Actions: ${result.actionsDecisions?.actions?.length || 0}`);
                                console.log(`[ListenService]    Decisions: ${result.actionsDecisions?.decisions?.length || 0}`);
                            } else {
                                console.log(`[ListenService] Audio session not indexed: ${result.reason}`);
                            }
                        })
                        .catch(err => {
                            console.error('[ListenService] Audio auto-indexing failed:', err.message);
                        });
                }
            }

            // Reset state - now safe since STT is fully closed and pending callbacks processed
            this.currentSessionId = null;
            this.summaryService.resetConversationHistory();
            responseService.resetConversationHistory();
            liveInsightsService.reset(); // Phase 3

            // Phase 3.1/3.3: Reset counters and clear buffer
            this._transcriptCount = 0;
            this._totalCharacters = 0;
            this._transcriptBuffer = [];
            this._recentTranscripts.clear();

            console.log('Listen service session closed.');
            return { success: true };
        } catch (error) {
            console.error('Error closing listen service session:', error);
            return { success: false, error: error.message };
        }
    }

    getCurrentSessionData() {
        return {
            sessionId: this.currentSessionId,
            conversationHistory: this.summaryService.getConversationHistory(),
            totalTexts: this.summaryService.getConversationHistory().length,
            analysisData: this.summaryService.getCurrentAnalysisData(),
        };
    }

    /**
     * Phase 3.1: Get current transcript statistics
     * @returns {Object} Transcript stats { count, characters, sessionId }
     */
    getTranscriptStats() {
        return {
            count: this._transcriptCount,
            characters: this._totalCharacters,
            sessionId: this.currentSessionId,
            bufferSize: this._transcriptBuffer.length
        };
    }

    /**
     * Phase 3.2: Validate that required services are configured before recording
     * @returns {Promise<Object>} Validation result { valid, errors, warnings }
     */
    async validatePreRecording() {
        const errors = [];
        const warnings = [];

        try {
            // Check STT configuration
            const modelStateService = require('../common/services/modelStateService');
            const sttModel = await modelStateService.getCurrentModelInfo('stt');

            if (!sttModel) {
                errors.push({
                    code: 'STT_NOT_CONFIGURED',
                    message: 'Aucun modèle de transcription configuré',
                    action: 'Configurez un modèle STT dans les paramètres'
                });
            } else if (!sttModel.apiKey) {
                errors.push({
                    code: 'STT_NO_API_KEY',
                    message: `Clé API manquante pour ${sttModel.provider || 'STT'}`,
                    action: 'Ajoutez votre clé API dans les paramètres'
                });
            }

            // Check LLM configuration (for post-meeting generation)
            const llmModel = await modelStateService.getCurrentModelInfo('llm');

            if (!llmModel) {
                warnings.push({
                    code: 'LLM_NOT_CONFIGURED',
                    message: 'Aucun modèle LLM configuré',
                    action: 'La génération de compte-rendu ne sera pas disponible'
                });
            } else if (!llmModel.apiKey) {
                warnings.push({
                    code: 'LLM_NO_API_KEY',
                    message: `Clé API manquante pour ${llmModel.provider || 'LLM'}`,
                    action: 'La génération de compte-rendu ne sera pas disponible'
                });
            }

            // Check audio permissions (macOS specific)
            if (process.platform === 'darwin') {
                // Note: Actual permission check would require native module
                // This is a placeholder for future implementation
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings,
                sttProvider: sttModel?.provider || null,
                llmProvider: llmModel?.provider || null
            };
        } catch (error) {
            console.error('[ListenService] Pre-recording validation error:', error);
            return {
                valid: false,
                errors: [{
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    action: 'Vérifiez la configuration de l\'application'
                }],
                warnings: []
            };
        }
    }

    getConversationHistory() {
        return this.summaryService.getConversationHistory();
    }

    getLastTranscription() {
        return this.lastTranscription;
    }

    getRecentTranscriptions(count = 3) {
        return this.summaryService.getConversationHistory().slice(-count);
    }

    /**
     * Save insight to database (Phase 3)
     * @private
     */
    async _saveInsightToDatabase(insight) {
        try {
            const uid = authService.getCurrentUserId();

            await liveInsightsRepository.create({
                ...insight,
                user_id: uid
            });

            console.log(`[LiveInsights] Saved to DB: ${insight.type} - ${insight.title}`);
        } catch (error) {
            console.error('[LiveInsights] Failed to save to database:', error);
        }
    }

    _createHandler(asyncFn, successMessage, errorMessage) {
        return async (...args) => {
            try {
                const result = await asyncFn.apply(this, args);
                if (successMessage) console.log(successMessage);
                // `startMacOSAudioCapture` ne retourne pas d'objet { success, error } en cas de succès,
                // donc on retourne ici un objet success pour que le handler envoie une réponse cohérente.
                // Les autres fonctions retournent déjà un objet success.
                return result && typeof result.success !== 'undefined' ? result : { success: true };
            } catch (e) {
                console.error(errorMessage, e);
                return { success: false, error: e.message };
            }
        };
    }

    // Générer dynamiquement les handlers en utilisant `_createHandler`
    handleSendMicAudioContent = this._createHandler(
        this.sendMicAudioContent,
        null,
        'Error sending user audio:'
    );

    handleStartMacosAudio = this._createHandler(
        async () => {
            if (process.platform !== 'darwin') {
                return { success: false, error: 'macOS audio capture only available on macOS' };
            }

            // Fix HIGH BUG-H4: Use flag to prevent concurrent audio starts
            if (this.isStartingAudio) {
                return { success: false, error: 'audio_start_in_progress' };
            }

            // Check if STT session is active and system audio is already running
            if (this.sttService.isSessionActive() && this.sttService.systemAudioProc) {
                return { success: false, error: 'already_running' };
            }

            // Fix HIGH BUG-H4: Set flag before starting audio
            this.isStartingAudio = true;
            try {
                await this.startMacOSAudioCapture();
                return { success: true, error: null };
            } finally {
                // Fix HIGH BUG-H4: Clear flag after audio start completes or fails
                this.isStartingAudio = false;
            }
        },
        'macOS audio capture started.',
        'Error starting macOS audio capture:'
    );
    
    handleStopMacosAudio = this._createHandler(
        async () => {
            // Fix HIGH BUG-H5: Ensure async stopMacOSAudioCapture is properly awaited
            await this.stopMacOSAudioCapture();
        },
        'macOS audio capture stopped.',
        'Error stopping macOS audio capture:'
    );

    handleUpdateGoogleSearchSetting = this._createHandler(
        async (enabled) => {
            console.log('Google Search setting updated to:', enabled);
        },
        null,
        'Error updating Google Search setting:'
    );
}

const listenService = new ListenService();
module.exports = listenService;