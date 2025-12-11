const { BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const { createSTT } = require('../../common/ai/factory');
const modelStateService = require('../../common/services/modelStateService');
const speakerService = require('../services/speakerService');
const unifiedDiarizationService = require('../services/unifiedDiarizationService');
const { v4: uuidv4 } = require('uuid');

// Reduced from 2000ms to 1200ms for faster transcription completion
// This allows quicker turn-taking detection while still batching speech segments
const COMPLETION_DEBOUNCE_MS = 1200;

// ── New heartbeat / renewal constants ────────────────────────────────────────────
// Interval to send low-cost keep-alive messages so the remote service does not
// treat the connection as idle. One minute is safely below the typical 2-5 min
// idle timeout window seen on provider websockets.
const KEEP_ALIVE_INTERVAL_MS = 60 * 1000;         // 1 minute

// Interval after which we pro-actively tear down and recreate the STT sessions
// to dodge the 30-minute hard timeout enforced by some providers. 20 minutes
// gives a 10-minute safety buffer.
const SESSION_RENEW_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

// Duration to allow the old and new sockets to run in parallel so we don't
// miss any packets at the exact swap moment.
const SOCKET_OVERLAP_MS = 2 * 1000; // 2 seconds

// Fix MEDIUM BUG-M7: Extract timeout constant for killing SystemAudioDump process
// Timeout for force-killing SystemAudioDump if it doesn't terminate gracefully
const SYSTEM_AUDIO_KILL_TIMEOUT_MS = 2000; // 2 seconds

// Fix NORMAL MEDIUM BUG-M15: Extract noise patterns to avoid duplication
// Whisper STT noise patterns to filter out (used for both My and Them audio streams)
const WHISPER_NOISE_PATTERNS = [
    '[BLANK_AUDIO]',
    '[INAUDIBLE]',
    '[MUSIC]',
    '[SOUND]',
    '[NOISE]',
    '(BLANK_AUDIO)',
    '(INAUDIBLE)',
    '(MUSIC)',
    '(SOUND)',
    '(NOISE)'
];

class SttService {
    constructor() {
        // Flux STT unifié avec diarisation intelligente
        this.unifiedSttSession = null;
        this.currentUtterance = '';

        // Turn-completion debouncing unifié
        this.completionBuffer = '';
        this.completionTimer = null;

        // Fix LOW BUG-L6: Add retry counter for exponential backoff
        this.renewalRetryCount = 0;
        this.MAX_RENEWAL_RETRIES = 3;

        // System audio capture
        this.systemAudioProc = null;

        // Fix CRITICAL BUG #1: Memory leak - Store audio handler references for cleanup
        this.audioHandlers = {
            onData: null,
            onStderr: null,
            onClose: null,
            onError: null
        };

        // Keep-alive / renewal timers
        this.keepAliveInterval = null;
        this.sessionRenewTimeout = null;

        // Callbacks
        this.onTranscriptionComplete = null;
        this.onStatusUpdate = null;

        this.modelInfo = null;
        // Fix CRITIQUE #3: Initialiser sessionId immédiatement pour éviter les pertes de chunks audio
        this.sessionId = uuidv4();

        // Fix CRITICAL BUG #2: Race condition - Add closing flag for better protection
        this._isClosing = false;

        // Fix HIGH BUG-H5: Add flag to prevent handler execution race conditions
        this.audioHandlersActive = false;
    }

    /**
     * Fix LOW BUG-L8: Add JSDoc documentation for public API methods
     * Set callback functions for transcription events
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onTranscriptionComplete - Called when transcription completes
     * @param {Function} callbacks.onStatusUpdate - Called when status changes
     */
    setCallbacks({ onTranscriptionComplete, onStatusUpdate }) {
        this.onTranscriptionComplete = onTranscriptionComplete;
        this.onStatusUpdate = onStatusUpdate;
    }

    /**
     * Send data to the listen window renderer process
     * Fix LOW BUG-L8: Translate Korean comment to English
     * Listen-related events are only sent to Listen window (prevents conflict with Ask window)
     * @param {string} channel - IPC channel name
     * @param {*} data - Data to send
     */
    sendToRenderer(channel, data) {
        const { windowPool } = require('../../../window/windowManager');
        const listenWindow = windowPool?.get('listen');

        if (listenWindow && !listenWindow.isDestroyed()) {
            listenWindow.webContents.send(channel, data);
        }
    }

    /**
     * Handle system audio content from IPC (wrapper with error handling)
     * @param {Buffer} data - Audio data buffer
     * @param {string} mimeType - MIME type of audio data
     * @returns {Promise<{success: boolean, error?: string}>} Result object
     */
    async handleSendSystemAudioContent(data, mimeType) {
        try {
            await this.sendSystemAudioContent(data, mimeType);
            this.sendToRenderer('system-audio-data', { data });
            return { success: true };
        } catch (error) {
            console.error('Error sending system audio:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Flush le buffer de completion avec les infos du dernier speaker
     */
    flushCompletion() {
        const finalText = (this.completionBuffer + this.currentUtterance).trim();
        if (!this.modelInfo || !finalText) return;

        // Le speaker label sera déjà déterminé par le dernier message traité
        // On ne peut pas le récupérer ici, donc on laisse le handleMessage gérer l'envoi final
        
        this.completionBuffer = '';
        this.completionTimer = null;
        this.currentUtterance = '';

        if (this.onStatusUpdate) {
            this.onStatusUpdate('Listening...');
        }
    }

    /**
     * Debounce la completion de transcription
     * @param {string} text - Texte à ajouter au buffer
     */
    debounceCompletion(text) {
        if (this.modelInfo?.provider === 'gemini') {
            this.completionBuffer += text;
        } else {
            this.completionBuffer += (this.completionBuffer ? ' ' : '') + text;
        }

        if (this.completionTimer) clearTimeout(this.completionTimer);
        this.completionTimer = setTimeout(() => this.flushCompletion(), COMPLETION_DEBOUNCE_MS);
    }

    async initializeSttSessions(language = 'fr') {
        // Fix MEDIUM BUG-M4: Validate language parameter
        const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'ar', 'hi'];
        let effectiveLanguage = process.env.OPENAI_TRANSCRIBE_LANG || language || 'fr';

        if (!SUPPORTED_LANGUAGES.includes(effectiveLanguage)) {
            console.warn(
                `[SttService] Unsupported language '${effectiveLanguage}', falling back to 'en'. ` +
                `Supported: ${SUPPORTED_LANGUAGES.join(', ')}`
            );
            effectiveLanguage = 'en';
        }

        console.log(`[SttService] Initializing STT with language: ${effectiveLanguage}`);

        // Fix CRITICAL BUG #2: Reset closing flag when initializing new sessions
        this._isClosing = false;

        // Fix CRITIQUE #3: Le sessionId est déjà initialisé dans le constructeur
        // On le recrée seulement si null (après un closeSessions)
        if (!this.sessionId) {
            this.sessionId = uuidv4();
        }
        console.log(`[SttService] Using session ID: ${this.sessionId}`);

        const modelInfo = await modelStateService.getCurrentModelInfo('stt');
        if (!modelInfo || !modelInfo.apiKey) {
            throw new Error('AI model or API key is not configured.');
        }
        this.modelInfo = modelInfo;
        console.log(`[SttService] Initializing unified STT for ${modelInfo.provider} using model ${modelInfo.model}`);

        // Réinitialiser le service de diarisation pour cette nouvelle session
        unifiedDiarizationService.reset();

        const handleUnifiedMessage = message => {
            // Fix CRITICAL BUG #2: Race condition - Enhanced protection against processing after closure
            if (!this.modelInfo || this._isClosing) {
                console.log('[SttService] Ignoring message - session already closed or closing');
                return;
            }

            // Fix HIGH MEDIUM BUG-M8: Wrap message processing in try-catch to prevent service crash
            try {
                if (this.modelInfo.provider === 'whisper') {
                // Whisper STT emits 'transcription' events with different structure
                if (message.text && message.text.trim()) {
                    const finalText = message.text.trim();

                    // Fix NORMAL MEDIUM BUG-M15: Use shared noise patterns constant
                    const isNoise = WHISPER_NOISE_PATTERNS.some(pattern =>
                        finalText.includes(pattern) || finalText === pattern
                    );
                    
                    
                    if (!isNoise && finalText.length > 2) {
                        // Pour Whisper, on ne peut pas faire de diarisation, donc on marque tout comme "Me"
                        this.debounceCompletion(finalText);
                        
                        this.sendToRenderer('stt-update', {
                            speaker: 'Me',
                            text: finalText,
                            speakerId: 0,
                            speakerName: 'Moi',
                            isPartial: false,
                            isFinal: true,
                            timestamp: Date.now(),
                        });

                        // Notifier le callback de completion
                        if (this.onTranscriptionComplete) {
                            this.onTranscriptionComplete('Me', finalText);
                        }
                    } else {
                        console.log(`[Whisper-Me] Filtered noise: "${finalText}"`);
                    }
                }
                return;
            } else if (this.modelInfo.provider === 'gemini') {
                if (!message.serverContent?.modelTurn) {
                    console.log('[Gemini STT - Me]', JSON.stringify(message, null, 2));
                }

                if (message.serverContent?.turnComplete) {
                    if (this.completionTimer) {
                        clearTimeout(this.completionTimer);
                        this.flushCompletion();
                    }
                    return;
                }
            
                const transcription = message.serverContent?.inputTranscription;
                if (!transcription || !transcription.text) return;
                
                const textChunk = transcription.text;
                if (!textChunk.trim() || textChunk.trim() === '<noise>') {
                    return; // 1. Ignore whitespace-only chunks or noise
                }
            
                this.debounceCompletion(textChunk);
                
                // Pour Gemini, pas de diarisation native, donc on marque tout comme "Me"
                this.sendToRenderer('stt-update', {
                    speaker: 'Me',
                    text: this.completionBuffer,
                    speakerId: 0,
                    speakerName: 'Moi',
                    isPartial: true,
                    isFinal: false,
                    timestamp: Date.now(),
                });
                
            // Deepgram avec diarisation intelligente
            } else if (this.modelInfo.provider === 'deepgram') {
                const alternative = message.channel?.alternatives?.[0];
                const text = alternative?.transcript;
                if (!text || text.trim().length === 0) return;

                const isFinal = message.is_final;
                const words = alternative?.words || [];
                // Fix MOYEN #11: Log verbeux seulement en mode debug
                if (process.env.DEBUG_STT) {
                    console.log(`[SttService-Unified-Deepgram] Received: isFinal=${isFinal}, text="${text.substring(0, 50)}...", words=${words.length}`);
                }

                // Détecter le speaker dominant dans cet utterance
                let dominantSpeakerId = 0;
                let speakerInfo = { speakerId: 0, label: 'Me', name: 'Moi', isUser: true };
                
                if (words.length > 0) {
                    const speakerCounts = {};
                    
                    words.forEach(word => {
                        const duration = word.end - word.start;
                        const speaker = word.speaker ?? 0;
                        
                        if (!speakerCounts[speaker]) {
                            speakerCounts[speaker] = 0;
                        }
                        speakerCounts[speaker] += duration;
                    });

                    // Speaker dominant = celui qui parle le plus longtemps
                    const speakerKeys = Object.keys(speakerCounts);
                    if (speakerKeys.length > 0) {
                        const dominantKey = speakerKeys.reduce((a, b) =>
                            speakerCounts[a] > speakerCounts[b] ? a : b
                        );
                        const parsed = parseInt(dominantKey, 10);
                        dominantSpeakerId = Number.isNaN(parsed) ? 0 : parsed;
                    }

                    // ✨ NOUVEAU : Identification intelligente du speaker via le service de diarisation
                    speakerInfo = unifiedDiarizationService.identifySpeaker(words, dominantSpeakerId);

                    const startTime = words[0].start;
                    const endTime = words[words.length - 1].end;
                    const confidence = words.reduce((sum, w) => sum + (w.confidence || 0), 0) / words.length;

                    // Stocker le segment avec le bon speaker ID
                    if (isFinal && this.sessionId) {
                        try {
                            speakerService.addSegment({
                                sessionId: this.sessionId,
                                speakerId: speakerInfo.speakerId,
                                text: text,
                                startTime,
                                endTime,
                                confidence,
                                isFinal: true
                            });

                            // Mettre à jour le mapping speaker dans le speakerService
                            if (!speakerInfo.isUser) {
                                speakerService.renameSpeaker(
                                    this.sessionId,
                                    speakerInfo.speakerId,
                                    speakerInfo.name
                                );
                            }
                        } catch (error) {
                            console.error('[SttService-Unified-Deepgram] Error storing segment:', error);
                        }
                    }
                }

                if (isFinal) {
                    this.currentUtterance = ''; 
                    this.debounceCompletion(text);
                    
                    // Émettre event avec info speaker correct
                    this.sendToRenderer('stt-recognized', {
                        speaker: speakerInfo.label, // 'Me' ou 'Them'
                        text: text,
                        speakerId: speakerInfo.speakerId,
                        speakerName: speakerInfo.name,
                        timestamp: Date.now(),
                    });

                    // Notifier le callback de completion avec le label correct
                    if (this.onTranscriptionComplete) {
                        this.onTranscriptionComplete(speakerInfo.label, text);
                    }
                } else {
                    if (this.completionTimer) clearTimeout(this.completionTimer);
                    this.completionTimer = null;

                    this.currentUtterance = text;
                    
                    const continuousText = (this.completionBuffer + ' ' + this.currentUtterance).trim();

                    // Émettre event avec info speaker
                    this.sendToRenderer('stt-recognizing', {
                        speaker: speakerInfo.label,
                        text: continuousText,
                        speakerId: speakerInfo.speakerId,
                        speakerName: speakerInfo.name,
                        isPartial: true,
                        isFinal: false,
                        timestamp: Date.now(),
                    });

                    this.sendToRenderer('stt-update', {
                        speaker: speakerInfo.label,
                        text: continuousText,
                        speakerId: speakerInfo.speakerId,
                        speakerName: speakerInfo.name,
                        isPartial: true,
                        isFinal: false,
                        timestamp: Date.now(),
                    });
                }

            } else {
                const type = message.type;
                const text = message.transcript || message.delta || (message.alternatives && message.alternatives[0]?.transcript) || '';

                if (type === 'conversation.item.input_audio_transcription.delta') {
                    if (this.completionTimer) clearTimeout(this.completionTimer);
                    this.completionTimer = null;
                    this.currentUtterance += text;
                    const continuousText = this.completionBuffer + (this.completionBuffer ? ' ' : '') + this.currentUtterance;
                    if (text && !text.includes('vq_lbr_audio_')) {
                        this.sendToRenderer('stt-update', {
                            speaker: 'Me',
                            text: continuousText,
                            speakerId: 0,
                            speakerName: 'Moi',
                            isPartial: true,
                            isFinal: false,
                            timestamp: Date.now(),
                        });
                    }
                } else if (type === 'conversation.item.input_audio_transcription.completed') {
                    if (text && text.trim()) {
                        const finalUtteranceText = text.trim();
                        this.currentUtterance = '';
                        this.debounceCompletion(finalUtteranceText);

                        // Notifier le callback de completion
                        if (this.onTranscriptionComplete) {
                            this.onTranscriptionComplete('Me', finalUtteranceText);
                        }
                    }
                }
            }
            } catch (error) {
                // Fix HIGH MEDIUM BUG-M8: Gracefully handle processing errors instead of crashing
                // Fix MEDIUM BUG-M4: Log full error context instead of truncating at 200 chars
                console.error('[SttService] Error processing My message:', error);
                console.error('[SttService] Full message that caused error:', JSON.stringify(message));
                console.error('[SttService] Error stack:', error.stack);
                // Service continues running - error is logged but doesn't crash STT
            }

            if (message.error) {
                console.error('[Me] STT Session Error:', message.error);
            }
        };

        const unifiedSttConfig = {
            language: effectiveLanguage,
            callbacks: {
                onmessage: handleUnifiedMessage,
                onerror: error => console.error('Unified STT session error:', error.message),
                onclose: event => console.log('Unified STT session closed:', event.reason),
            },
        };
        
        const sttOptions = {
            apiKey: this.modelInfo.apiKey,
            language: effectiveLanguage,
            usePortkey: this.modelInfo.provider === 'openai-lucide',
            portkeyVirtualKey: this.modelInfo.provider === 'openai-lucide' ? this.modelInfo.apiKey : undefined,
            callbacks: unifiedSttConfig.callbacks,
        };

        this.unifiedSttSession = await createSTT(this.modelInfo.provider, sttOptions);

        console.log('✅ Unified STT session initialized successfully.');

        // ── Setup keep-alive heart-beats ────────────────────────────────────────
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = setInterval(() => {
            this._sendKeepAlive();
        }, KEEP_ALIVE_INTERVAL_MS);

        // ── Schedule session auto-renewal ───────────────────────────────────────
        if (this.sessionRenewTimeout) clearTimeout(this.sessionRenewTimeout);
        this.sessionRenewTimeout = setTimeout(async () => {
            try {
                console.log('[SttService] Auto-renewing STT sessions…');
                await this.renewSessions(language);
            } catch (err) {
                console.error('[SttService] Failed to renew STT sessions:', err);
            }
        }, SESSION_RENEW_INTERVAL_MS);

        return true;
    }

    /**
     * Send a lightweight keep-alive to prevent idle disconnects.
     * Currently only implemented for OpenAI provider because Gemini's SDK
     * already performs its own heart-beats.
     */
    _sendKeepAlive() {
        if (!this.isSessionActive()) return;

        if (this.modelInfo?.provider === 'openai') {
            try {
                this.unifiedSttSession?.keepAlive?.();
            } catch (err) {
                console.error('[SttService] keepAlive error:', err.message);
            }
        }
    }

    /**
     * Fix MEDIUM BUG #2: Wrap sendRealtimeInput with timeout protection
     * Prevents STT from hanging indefinitely if provider websocket stalls
     * @private
     */
    async _sendRealtimeInputWithTimeout(session, payload, timeoutMs = 5000) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('sendRealtimeInput timed out')), timeoutMs);
        });

        const sendPromise = session.sendRealtimeInput(payload);

        try {
            await Promise.race([sendPromise, timeoutPromise]);
        } catch (error) {
            // Log timeout but don't crash - audio will continue on next chunk
            if (error.message.includes('timed out')) {
                console.warn('[SttService] sendRealtimeInput timed out, skipping this audio chunk');
            } else {
                throw error; // Re-throw non-timeout errors
            }
        }
    }

    /**
     * Gracefully tears down then recreates the STT sessions. Should be invoked
     * on a timer to avoid provider-side hard timeouts.
     *
     * Fix HIGH BUG #1: Added proper error handling and rollback to prevent
     * complete loss of STT functionality if renewal fails.
     */
    async renewSessions(language = 'fr') {
        if (!this.isSessionActive()) {
            console.warn('[SttService] renewSessions called but no active session.');
            return;
        }

        const oldSession = this.unifiedSttSession;
        const oldModelInfo = this.modelInfo;

        console.log('[SttService] Spawning fresh unified STT session in the background…');

        try {
            // We reuse initializeSttSessions to create fresh session with the same
            // language and handlers. The method will update the session pointer
            // and timers, but crucially it does NOT touch the system audio capture
            // pipeline, so audio continues flowing uninterrupted.
            await this.initializeSttSessions(language);

            // Close the old session after a short overlap window - only if init succeeded
            setTimeout(() => {
                try {
                    oldSession?.close?.();
                    console.log('[SttService] Old STT session closed after successful hand-off.');
                } catch (err) {
                    console.error('[SttService] Error closing old STT session:', err.message);
                }
            }, SOCKET_OVERLAP_MS);

        } catch (err) {
            // Fix HIGH BUG #1: Rollback to old session if renewal fails
            console.error('[SttService] Failed to renew session, rolling back to old session:', err.message);

            // Restore old session reference
            this.unifiedSttSession = oldSession;
            this.modelInfo = oldModelInfo;

            // The timers from the failed init attempt need to be cleared and rescheduled
            if (this.sessionRenewTimeout) {
                clearTimeout(this.sessionRenewTimeout);
            }

            // Fix LOW BUG-L6: Implement exponential backoff for retries
            this.renewalRetryCount++;
            if (this.renewalRetryCount <= this.MAX_RENEWAL_RETRIES) {
                // Exponential backoff: 1min, 2min, 4min
                const retryDelay = Math.min(Math.pow(2, this.renewalRetryCount - 1) * 60 * 1000, 5 * 60 * 1000);
                console.log(`[SttService] Scheduling retry ${this.renewalRetryCount}/${this.MAX_RENEWAL_RETRIES} after ${retryDelay / 1000}s`);

                this.sessionRenewTimeout = setTimeout(async () => {
                    try {
                        console.log(`[SttService] Retry ${this.renewalRetryCount}/${this.MAX_RENEWAL_RETRIES}: Renewing sessions...`);
                        await this.renewSessions(language);
                        this.renewalRetryCount = 0; // Reset on success
                    } catch (retryErr) {
                        console.error(`[SttService] Retry ${this.renewalRetryCount} failed:`, retryErr.message);
                    }
                }, retryDelay);
            } else {
                console.error('[SttService] Max retries reached, giving up on session renewal');
            }

            throw err; // Re-throw to let caller know renewal failed
        }
    }

    async sendMicAudioContent(data, mimeType) {
        // Fix LOW BUG-L6: Remove commented dead code (provider check now handled via modelInfo)
        if (!this.unifiedSttSession) {
            throw new Error('Unified STT session not active');
        }

        let modelInfo = this.modelInfo;
        if (!modelInfo) {
            console.warn('[SttService] modelInfo not found, fetching on-the-fly as a fallback...');
            modelInfo = await modelStateService.getCurrentModelInfo('stt');
        }
        if (!modelInfo) {
            throw new Error('STT model info could not be retrieved.');
        }

        let payload;
        if (modelInfo.provider === 'gemini') {
            payload = { audio: { data, mimeType: mimeType || 'audio/pcm;rate=24000' } };
        } else if (modelInfo.provider === 'deepgram') {
            payload = Buffer.from(data, 'base64');
        } else {
            payload = data;
        }
        // Fix MEDIUM BUG #2: Use timeout wrapper
        await this._sendRealtimeInputWithTimeout(this.unifiedSttSession, payload);
    }

    async sendSystemAudioContent(data, mimeType) {
        // Note: Avec la diarisation unifiée, tout l'audio va dans le même flux
        // Cette méthode redirige maintenant vers le flux unifié
        if (!this.unifiedSttSession) {
            throw new Error('Unified STT session not active');
        }

        let modelInfo = this.modelInfo;
        if (!modelInfo) {
            console.warn('[SttService] modelInfo not found, fetching on-the-fly as a fallback...');
            modelInfo = await modelStateService.getCurrentModelInfo('stt');
        }
        if (!modelInfo) {
            throw new Error('STT model info could not be retrieved.');
        }

        let payload;
        if (modelInfo.provider === 'gemini') {
            payload = { audio: { data, mimeType: mimeType || 'audio/pcm;rate=24000' } };
        } else if (modelInfo.provider === 'deepgram') {
            payload = Buffer.from(data, 'base64');
        } else {
            payload = data;
        }

        // Fix MEDIUM BUG #2: Use timeout wrapper
        await this._sendRealtimeInputWithTimeout(this.unifiedSttSession, payload);
    }

    killExistingSystemAudioDump() {
        return new Promise(resolve => {
            console.log('[SttService] Checking for existing SystemAudioDump processes...');

            const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
                stdio: 'ignore',
            });

            let resolved = false;

            const finish = (code) => {
                if (resolved) return;
                resolved = true;

                if (code === 0) {
                    console.log('[SttService] Killed existing SystemAudioDump processes');
                } else {
                    console.log('[SttService] No existing SystemAudioDump processes found');
                }
                resolve();
            };

            killProc.on('close', finish);

            killProc.on('error', err => {
                console.log('[SttService] Error checking for existing processes (this is normal):', err.message);
                finish(-1);
            });

            // Fix MEDIUM BUG-M7: Use constant for timeout
            setTimeout(() => {
                if (!resolved) {
                    console.warn(`[SttService] Kill process timeout after ${SYSTEM_AUDIO_KILL_TIMEOUT_MS}ms, forcing termination`);
                    killProc.kill();
                    finish(-1);
                }
            }, SYSTEM_AUDIO_KILL_TIMEOUT_MS);
        });
    }

    async startMacOSAudioCapture() {
        if (process.platform !== 'darwin' || !this.theirSttSession) return false;

        await this.killExistingSystemAudioDump();
        console.log('Starting macOS audio capture for "Them"...');

        const { app } = require('electron');
        const path = require('path');
        const systemAudioPath = app.isPackaged
            ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'ui', 'assets', 'SystemAudioDump')
            : path.join(app.getAppPath(), 'src', 'ui', 'assets', 'SystemAudioDump');

        console.log('SystemAudioDump path:', systemAudioPath);

        this.systemAudioProc = spawn(systemAudioPath, [], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        if (!this.systemAudioProc.pid) {
            console.error('Failed to start SystemAudioDump');
            return false;
        }

        console.log('SystemAudioDump started with PID:', this.systemAudioProc.pid);

        // Fix NORMAL MEDIUM BUG-M16: Document audio configuration constants
        const CHUNK_DURATION = 0.1;       // 100ms audio chunks for real-time processing
        const SAMPLE_RATE = 24000;        // 24kHz sample rate (standard for speech recognition)
        const BYTES_PER_SAMPLE = 2;       // 16-bit audio (2 bytes per sample)
        const CHANNELS = 2;               // Stereo audio (left + right channels)
        const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

        let audioBuffer = Buffer.alloc(0);

        // Fix CRITICAL BUG #3: Capture modelInfo in closure causes wrong provider after renewal
        // Instead, we'll fetch it dynamically in the handler to ensure we always use current value

        // Fix CRITICAL BUG #1: Store handler reference for proper cleanup
        this.audioHandlers.onData = async (data) => {
            // Fix HIGH BUG-H5: Skip processing if handlers are being deactivated
            if (!this.audioHandlersActive) {
                return;
            }

            audioBuffer = Buffer.concat([audioBuffer, data]);

            while (audioBuffer.length >= CHUNK_SIZE) {
                const chunk = audioBuffer.slice(0, CHUNK_SIZE);
                audioBuffer = audioBuffer.slice(CHUNK_SIZE);

                const monoChunk = CHANNELS === 2 ? this.convertStereoToMono(chunk) : chunk;
                const base64Data = monoChunk.toString('base64');

                this.sendToRenderer('system-audio-data', { data: base64Data });

                if (this.theirSttSession) {
                    try {
                        // Fix CRITICAL BUG #3: Fetch modelInfo dynamically instead of using closure
                        // This ensures we use the current provider after session renewal
                        const currentModelInfo = this.modelInfo || await modelStateService.getCurrentModelInfo('stt');
                        if (!currentModelInfo) {
                            console.warn('[SttService] modelInfo not available, skipping audio chunk');
                            return;
                        }

                        let payload;
                        if (currentModelInfo.provider === 'gemini') {
                            payload = { audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' } };
                        } else if (currentModelInfo.provider === 'deepgram') {
                            payload = Buffer.from(base64Data, 'base64');
                        } else {
                            payload = base64Data;
                        }

                        // Fix MEDIUM BUG #2: Use timeout wrapper
                        await this._sendRealtimeInputWithTimeout(this.theirSttSession, payload);
                    } catch (err) {
                        console.error('Error sending system audio:', err.message);
                    }
                }
            }
        };

        // Fix CRITICAL BUG #1: Store all handler references for proper cleanup
        this.audioHandlers.onStderr = (data) => {
            console.error('SystemAudioDump stderr:', data.toString());
        };

        this.audioHandlers.onClose = (code) => {
            console.log('SystemAudioDump process closed with code:', code);
            this.systemAudioProc = null;
        };

        this.audioHandlers.onError = (err) => {
            console.error('SystemAudioDump process error:', err);
            this.systemAudioProc = null;
        };

        // Attach handlers to the process
        this.systemAudioProc.stdout.on('data', this.audioHandlers.onData);
        this.systemAudioProc.stderr.on('data', this.audioHandlers.onStderr);
        this.systemAudioProc.on('close', this.audioHandlers.onClose);
        this.systemAudioProc.on('error', this.audioHandlers.onError);

        // Fix HIGH BUG-H5: Activate handlers after attaching
        this.audioHandlersActive = true;

        return true;
    }

    convertStereoToMono(stereoBuffer) {
        // Fix MEDIUM BUG-M5: Validate input buffer
        if (!Buffer.isBuffer(stereoBuffer)) {
            console.error('[SttService] convertStereoToMono: Input is not a Buffer');
            return Buffer.alloc(0);
        }

        if (stereoBuffer.length === 0) {
            console.warn('[SttService] convertStereoToMono: Empty buffer received');
            return Buffer.alloc(0);
        }

        // Verify buffer length is valid for 16-bit stereo audio (divisible by 4)
        if (stereoBuffer.length % 4 !== 0) {
            console.error(
                `[SttService] convertStereoToMono: Invalid buffer length ${stereoBuffer.length} ` +
                `(must be divisible by 4 for 16-bit stereo audio). Truncating to nearest valid length.`
            );
            // Truncate to nearest valid length
            const validLength = Math.floor(stereoBuffer.length / 4) * 4;
            stereoBuffer = stereoBuffer.slice(0, validLength);
        }

        const samples = stereoBuffer.length / 4;
        const monoBuffer = Buffer.alloc(samples * 2);

        for (let i = 0; i < samples; i++) {
            const leftSample = stereoBuffer.readInt16LE(i * 4);
            monoBuffer.writeInt16LE(leftSample, i * 2);
        }

        return monoBuffer;
    }

    async stopMacOSAudioCapture() {
        if (this.systemAudioProc) {
            console.log('Stopping SystemAudioDump...');

            // Fix HIGH BUG-H5: Deactivate handlers before removing to prevent race conditions
            this.audioHandlersActive = false;

            // Fix HIGH BUG-H5: Wait briefly for in-flight handler executions to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Fix CRITICAL BUG #1: Clean up all event handlers to prevent memory leak
            try {
                if (this.audioHandlers.onData) {
                    this.systemAudioProc.stdout.removeListener('data', this.audioHandlers.onData);
                }
                if (this.audioHandlers.onStderr) {
                    this.systemAudioProc.stderr.removeListener('data', this.audioHandlers.onStderr);
                }
                if (this.audioHandlers.onClose) {
                    this.systemAudioProc.removeListener('close', this.audioHandlers.onClose);
                }
                if (this.audioHandlers.onError) {
                    this.systemAudioProc.removeListener('error', this.audioHandlers.onError);
                }
                console.log('[SttService] Audio event handlers cleaned up');
            } catch (err) {
                console.warn('[SttService] Error cleaning up audio handlers:', err.message);
            }

            // Reset handler references
            this.audioHandlers = {
                onData: null,
                onStderr: null,
                onClose: null,
                onError: null
            };

            this.systemAudioProc.kill('SIGTERM');
            this.systemAudioProc = null;
        }
    }

    isSessionActive() {
        return !!this.unifiedSttSession;
    }

    async closeSessions() {
        // Fix CRITICAL BUG #2: Set closing flag FIRST to prevent race conditions
        this._isClosing = true;

        // Fix CRITIQUE #2: Flush les buffers AVANT de les vider pour ne pas perdre les dernières paroles
        // Sauvegarder modelInfo temporairement pour permettre le flush
        const savedModelInfo = this.modelInfo;
        const savedSessionId = this.sessionId;

        // Flush completion buffer si non vide
        if (this.completionBuffer.trim() || this.currentUtterance.trim()) {
            const finalText = (this.completionBuffer + ' ' + this.currentUtterance).trim();
            if (finalText && savedModelInfo) {
                // Le speaker sera déterminé par le dernier segment, on envoie juste le texte final
                // Note: Pour une meilleure précision, on pourrait récupérer le dernier speaker du service de diarisation
                const lastSpeakerInfo = unifiedDiarizationService.getLastSpeaker();
                const speakerLabel = lastSpeakerInfo !== null ? 
                    (lastSpeakerInfo === unifiedDiarizationService.userSpeakerId ? 'Me' : 'Them') : 'Me';
                
                this.sendToRenderer('stt-update', {
                    speaker: speakerLabel,
                    text: finalText,
                    isPartial: false,
                    isFinal: true,
                    timestamp: Date.now(),
                });
                
                if (this.onTranscriptionComplete) {
                    this.onTranscriptionComplete(speakerLabel, finalText);
                }
            }
        }

        this.stopMacOSAudioCapture();

        // Set modelInfo to null to prevent any message processing during closure
        // This is checked in message handlers to ignore messages
        this.modelInfo = null;

        // Clear heartbeat / renewal timers
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        if (this.sessionRenewTimeout) {
            clearTimeout(this.sessionRenewTimeout);
            this.sessionRenewTimeout = null;
        }

        // Clear timer (after flush, so no need to fire it)
        if (this.completionTimer) {
            clearTimeout(this.completionTimer);
            this.completionTimer = null;
        }

        // Reset state after flush
        this.currentUtterance = '';
        this.completionBuffer = '';

        // Close unified session
        if (this.unifiedSttSession) {
            try {
                await this.unifiedSttSession.close();
                this.unifiedSttSession = null;
            } catch (error) {
                console.error('[SttService] Error closing unified session:', error);
            }
        }

        // Réinitialiser le service de diarisation
        unifiedDiarizationService.reset();

        // Fix CRITIQUE: Réinitialiser sessionId pour la prochaine session d'écoute
        // Cela garantit que chaque nouvelle réunion aura un sessionId unique
        this.sessionId = null;

        console.log('All STT sessions closed.');
    }
}

module.exports = SttService; 