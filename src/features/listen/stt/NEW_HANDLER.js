// Ce fichier contient le nouveau handleUnifiedMessage pour remplacer handleMyMessage et handleTheirMessage

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
                    console.log(`[Whisper-Unified] Filtered noise: "${finalText}"`);
                }
            }
            return;

        } else if (this.modelInfo.provider === 'gemini') {
            if (!message.serverContent?.modelTurn) {
                console.log('[Gemini STT - Unified]', JSON.stringify(message, null, 2));
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
                return; // Ignore whitespace-only chunks or noise
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
            // OpenAI ou autres providers
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
        console.error('[SttService] Error processing unified message:', error);
        console.error('[SttService] Full message that caused error:', JSON.stringify(message));
        console.error('[SttService] Error stack:', error.stack);
        // Service continues running - error is logged but doesn't crash STT
    }

    if (message.error) {
        console.error('[Unified] STT Session Error:', message.error);
    }
};
