const createAecModule = require('./aec.js');

let aecModPromise = null;     // Charger une seule fois
let aecMod        = null;
let aecPtr        = 0;        // Réutiliser un seul Rust Aec*

/** Récupérer et initialiser le module WASM une seule fois */
async function getAec () {
  if (aecModPromise) return aecModPromise;   // Cache

    aecModPromise = createAecModule().then((M) => {
        aecMod = M; 

        console.log('WASM Module Loaded:', M); 
        // Binding des symboles C vers wrapper JS (une seule fois)
        M.newPtr   = M.cwrap('AecNew',        'number',
                            ['number','number','number','number']);
        M.cancel   = M.cwrap('AecCancelEcho', null,
                            ['number','number','number','number','number']);
        M.destroy  = M.cwrap('AecDestroy',    null, ['number']);
        return M;
    });

  return aecModPromise;
}

// ---------------------------
// Constants & Globals
// ---------------------------
const SAMPLE_RATE = 24000;
const AUDIO_CHUNK_DURATION = 0.1;
const BUFFER_SIZE = 4096;

const isLinux = window.api.platform.isLinux;
const isMacOS = window.api.platform.isMacOS;

let mediaStream = null;
let micMediaStream = null;
let audioContext = null;
let audioProcessor = null;
let systemAudioContext = null;
let systemAudioProcessor = null;

let systemAudioBuffer = [];
const MAX_SYSTEM_BUFFER_SIZE = 10;

// BlackHole virtual audio device support
let blackHoleDeviceId = null;
let blackHoleStream = null;
let blackHoleContext = null;
let blackHoleProcessor = null;
let useBlackHoleCapture = false;

// ---------------------------
// Utility helpers (exact from renderer.js)
// ---------------------------
function isVoiceActive(audioFloat32Array, threshold = 0.005) {
    if (!audioFloat32Array || audioFloat32Array.length === 0) {
        return false;
    }

    let sumOfSquares = 0;
    for (let i = 0; i < audioFloat32Array.length; i++) {
        sumOfSquares += audioFloat32Array[i] * audioFloat32Array[i];
    }
    const rms = Math.sqrt(sumOfSquares / audioFloat32Array.length);

    return rms > threshold;
}

function base64ToFloat32Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    return float32Array;
}

function convertFloat32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        // Improved scaling to prevent clipping
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// ---------------------------
// BlackHole Audio Device Detection & Capture
// ---------------------------

/**
 * Get all available audio input devices
 * @returns {Promise<Array>} List of audio input devices
 */
async function getAudioInputDevices() {
    try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => stream.getTracks().forEach(track => track.stop()));

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');

        console.log('[BlackHole] Available audio inputs:', audioInputs.map(d => ({
            label: d.label,
            deviceId: d.deviceId.substring(0, 20) + '...'
        })));

        return audioInputs;
    } catch (error) {
        console.error('[BlackHole] Error enumerating devices:', error);
        return [];
    }
}

/**
 * Detect if BlackHole is available as an audio input device
 * @returns {Promise<Object>} Detection result with device info
 */
async function detectBlackHoleDevice() {
    const devices = await getAudioInputDevices();

    // Look for BlackHole device (various versions)
    const blackHolePatterns = [
        /blackhole\s*2ch/i,
        /blackhole\s*16ch/i,
        /blackhole\s*64ch/i,
        /blackhole/i
    ];

    for (const device of devices) {
        for (const pattern of blackHolePatterns) {
            if (pattern.test(device.label)) {
                console.log(`[BlackHole] Found device: ${device.label}`);
                blackHoleDeviceId = device.deviceId;
                return {
                    found: true,
                    deviceId: device.deviceId,
                    deviceName: device.label,
                    message: `BlackHole détecté: ${device.label}`
                };
            }
        }
    }

    // Also check for Loopback Audio or Soundflower as alternatives
    const alternativePatterns = [
        { pattern: /loopback\s*audio/i, name: 'Loopback Audio' },
        { pattern: /soundflower/i, name: 'Soundflower' }
    ];

    for (const device of devices) {
        for (const alt of alternativePatterns) {
            if (alt.pattern.test(device.label)) {
                console.log(`[BlackHole] Found alternative: ${device.label}`);
                blackHoleDeviceId = device.deviceId;
                return {
                    found: true,
                    deviceId: device.deviceId,
                    deviceName: device.label,
                    isAlternative: true,
                    message: `Périphérique audio virtuel détecté: ${device.label}`
                };
            }
        }
    }

    console.log('[BlackHole] No virtual audio device found');
    blackHoleDeviceId = null;
    return {
        found: false,
        message: 'Aucun périphérique audio virtuel (BlackHole) détecté',
        installUrl: 'https://existential.audio/blackhole/'
    };
}

/**
 * Start capturing audio from BlackHole device
 * Sends audio to the "Them" STT session for transcription
 * @returns {Promise<boolean>} Success status
 */
async function startBlackHoleCapture() {
    if (!blackHoleDeviceId) {
        const detection = await detectBlackHoleDevice();
        if (!detection.found) {
            console.error('[BlackHole] Cannot start capture - device not found');
            return false;
        }
    }

    try {
        console.log(`[BlackHole] Starting capture from device: ${blackHoleDeviceId.substring(0, 20)}...`);

        // Get audio stream from BlackHole device
        blackHoleStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: { exact: blackHoleDeviceId },
                sampleRate: SAMPLE_RATE,
                channelCount: 1,
                echoCancellation: false, // Don't apply echo cancellation to system audio
                noiseSuppression: false,
                autoGainControl: false
            },
            video: false
        });

        console.log('[BlackHole] Got audio stream, setting up processing...');

        // Create audio context for processing
        blackHoleContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        const source = blackHoleContext.createMediaStreamSource(blackHoleStream);

        // Create ScriptProcessor for audio chunks
        blackHoleProcessor = blackHoleContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

        let audioChunkBuffer = new Float32Array(0);
        const CHUNK_SIZE = SAMPLE_RATE * AUDIO_CHUNK_DURATION; // 100ms chunks

        blackHoleProcessor.onaudioprocess = async (event) => {
            const inputData = event.inputBuffer.getChannelData(0);

            // Accumulate audio data
            const newBuffer = new Float32Array(audioChunkBuffer.length + inputData.length);
            newBuffer.set(audioChunkBuffer);
            newBuffer.set(inputData, audioChunkBuffer.length);
            audioChunkBuffer = newBuffer;

            // Process when we have enough data
            while (audioChunkBuffer.length >= CHUNK_SIZE) {
                const chunk = audioChunkBuffer.slice(0, CHUNK_SIZE);
                audioChunkBuffer = audioChunkBuffer.slice(CHUNK_SIZE);

                // Check for voice activity (skip silent chunks)
                if (!isVoiceActive(chunk, 0.003)) {
                    continue;
                }

                // Convert to Int16 and Base64
                const int16Data = convertFloat32ToInt16(chunk);
                const base64Data = arrayBufferToBase64(int16Data.buffer);

                // Send to main process for "Them" STT session
                try {
                    await window.api.listenCapture.sendSystemAudioContent({
                        data: base64Data,
                        mimeType: 'audio/pcm;rate=24000'
                    });
                } catch (err) {
                    console.error('[BlackHole] Error sending audio:', err.message);
                }
            }
        };

        // Connect the audio graph
        source.connect(blackHoleProcessor);
        blackHoleProcessor.connect(blackHoleContext.destination);

        useBlackHoleCapture = true;
        console.log('[BlackHole] Capture started successfully');
        return true;

    } catch (error) {
        console.error('[BlackHole] Error starting capture:', error);
        await stopBlackHoleCapture();
        return false;
    }
}

/**
 * Stop BlackHole audio capture
 */
async function stopBlackHoleCapture() {
    console.log('[BlackHole] Stopping capture...');

    if (blackHoleProcessor) {
        blackHoleProcessor.disconnect();
        blackHoleProcessor = null;
    }

    if (blackHoleContext && blackHoleContext.state !== 'closed') {
        await blackHoleContext.close();
        blackHoleContext = null;
    }

    if (blackHoleStream) {
        blackHoleStream.getTracks().forEach(track => track.stop());
        blackHoleStream = null;
    }

    useBlackHoleCapture = false;
    console.log('[BlackHole] Capture stopped');
}

/**
 * Check if BlackHole capture is currently active
 * @returns {boolean}
 */
function isBlackHoleCaptureActive() {
    return useBlackHoleCapture && blackHoleStream !== null;
}

/* ───────────────────────── Helpers JS ↔︎ WASM ───────────────────────── */
function int16PtrFromFloat32(mod, f32) {
  const len   = f32.length;
  const bytes = len * 2;
  const ptr   = mod._malloc(bytes);
  // Si HEAP16 n'existe pas, wrapper directement avec HEAPU8.buffer
  const heapBuf = (mod.HEAP16 ? mod.HEAP16.buffer : mod.HEAPU8.buffer);
  const i16   = new Int16Array(heapBuf, ptr, len);
  for (let i = 0; i < len; ++i) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    i16[i]  = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return { ptr, view: i16 };
}

function float32FromInt16View(i16) {
  const out = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; ++i) out[i] = i16[i] / 32768;
  return out;
}

/* À la fermeture si nécessaire */
function disposeAec () {
  getAec().then(mod => { if (aecPtr) mod.destroy(aecPtr); });
}

// listenCapture.js

function runAecSync(micF32, sysF32) {
    if (!aecMod || !aecPtr || !aecMod.HEAPU8) {
        return micF32;
    }

    const frameSize = 160; // Taille de frame définie lors de l'initialisation du module AEC
    const numFrames = Math.floor(micF32.length / frameSize);

    // Buffer pour stocker les données audio traitées
    const processedF32 = new Float32Array(micF32.length);

    // Aligner les longueurs de l'audio système et microphone (pour la stabilité)
    let alignedSysF32 = new Float32Array(micF32.length);
    if (sysF32.length > 0) {
        // Tronquer ou compléter sysF32 pour correspondre à la longueur de micF32
        const lengthToCopy = Math.min(micF32.length, sysF32.length);
        alignedSysF32.set(sysF32.slice(0, lengthToCopy));
    }


    // Boucle divisant 2400 échantillons en frames de 160
    for (let i = 0; i < numFrames; i++) {
        const offset = i * frameSize;

        // Extraire les 160 échantillons correspondant à la frame actuelle
        const micFrame = micF32.subarray(offset, offset + frameSize);
        const echoFrame = alignedSysF32.subarray(offset, offset + frameSize);

        // Écrire les données de frame dans la mémoire WASM
        const micPtr = int16PtrFromFloat32(aecMod, micFrame);
        const echoPtr = int16PtrFromFloat32(aecMod, echoFrame);
        const outPtr = aecMod._malloc(frameSize * 2); // 160 * 2 bytes

        // Exécuter AEC (par unités de 160 échantillons)
        aecMod.cancel(aecPtr, micPtr.ptr, echoPtr.ptr, outPtr, frameSize);

        // Lire les données de frame traitées depuis la mémoire WASM
        const heapBuf = (aecMod.HEAP16 ? aecMod.HEAP16.buffer : aecMod.HEAPU8.buffer);
        const outFrameI16 = new Int16Array(heapBuf, outPtr, frameSize);
        const outFrameF32 = float32FromInt16View(outFrameI16);

        // Copier la frame traitée à la bonne position dans le buffer final
        processedF32.set(outFrameF32, offset);

        // Libérer la mémoire allouée
        aecMod._free(micPtr.ptr);
        aecMod._free(echoPtr.ptr);
        aecMod._free(outPtr);
    }

    return processedF32;
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    //                      Fin de la nouvelle logique
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
}


// System audio data handler
window.api.listenCapture.onSystemAudioData((event, { data }) => {
    systemAudioBuffer.push({
        data: data,
        timestamp: Date.now(),
    });

    // Supprimer les anciennes données
    if (systemAudioBuffer.length > MAX_SYSTEM_BUFFER_SIZE) {
        systemAudioBuffer = systemAudioBuffer.slice(-MAX_SYSTEM_BUFFER_SIZE);
    }
});

// ---------------------------
// Complete token tracker (exact from renderer.js)
// ---------------------------
let tokenTracker = {
    tokens: [],
    audioStartTime: null,

    addTokens(count, type = 'image') {
        const now = Date.now();
        this.tokens.push({
            timestamp: now,
            count: count,
            type: type,
        });

        this.cleanOldTokens();
    },

    calculateImageTokens(width, height) {
        const pixels = width * height;
        if (pixels <= 384 * 384) {
            return 85;
        }

        const tiles = Math.ceil(pixels / (768 * 768));
        return tiles * 85;
    },

    trackAudioTokens() {
        if (!this.audioStartTime) {
            this.audioStartTime = Date.now();
            return;
        }

        const now = Date.now();
        const elapsedSeconds = (now - this.audioStartTime) / 1000;

        const audioTokens = Math.floor(elapsedSeconds * 16);

        if (audioTokens > 0) {
            this.addTokens(audioTokens, 'audio');
            this.audioStartTime = now;
        }
    },

    cleanOldTokens() {
        const oneMinuteAgo = Date.now() - 60 * 1000;
        this.tokens = this.tokens.filter(token => token.timestamp > oneMinuteAgo);
    },

    getTokensInLastMinute() {
        this.cleanOldTokens();
        return this.tokens.reduce((total, token) => total + token.count, 0);
    },

    shouldThrottle() {
        const throttleEnabled = localStorage.getItem('throttleTokens') === 'true';
        if (!throttleEnabled) {
            return false;
        }

        const maxTokensPerMin = parseInt(localStorage.getItem('maxTokensPerMin') || '500000', 10);
        const throttleAtPercent = parseInt(localStorage.getItem('throttleAtPercent') || '75', 10);

        const currentTokens = this.getTokensInLastMinute();
        const throttleThreshold = Math.floor((maxTokensPerMin * throttleAtPercent) / 100);

        console.log(`Token check: ${currentTokens}/${maxTokensPerMin} (throttle at ${throttleThreshold})`);

        return currentTokens >= throttleThreshold;
    },

    // Reset the tracker
    reset() {
        this.tokens = [];
        this.audioStartTime = null;
    },
};

// Track audio tokens every few seconds
setInterval(() => {
    tokenTracker.trackAudioTokens();
}, 2000);

// ---------------------------
// Audio processing functions (exact from renderer.js)
// ---------------------------
async function setupMicProcessing(micStream) {
    /* ── Charger WASM en premier ───────────────────────── */
    const mod = await getAec();
    if (!aecPtr) aecPtr = mod.newPtr(160, 1600, 24000, 1);


    const micAudioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    await micAudioContext.resume(); 
    const micSource = micAudioContext.createMediaStreamSource(micStream);
    const micProcessor = micAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;

    micProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        // Envoyer quand samplesPerChunk(=2400) échantillons sont accumulés
        while (audioBuffer.length >= samplesPerChunk) {
            let chunk = audioBuffer.splice(0, samplesPerChunk);
            let processedChunk = new Float32Array(chunk); // Valeur par défaut

            // ───────────────── WASM AEC ─────────────────
            if (systemAudioBuffer.length > 0) {
                const latest = systemAudioBuffer[systemAudioBuffer.length - 1];
                const sysF32 = base64ToFloat32Array(latest.data);

                // **Exécuter uniquement pendant les segments vocaux**
                processedChunk = runAecSync(new Float32Array(chunk), sysF32);
            } else {
                console.log('🔊 No system audio for AEC reference');
            }

            const pcm16 = convertFloat32ToInt16(processedChunk);
            const b64 = arrayBufferToBase64(pcm16.buffer);

            window.api.listenCapture.sendMicAudioContent({
                data: b64,
                mimeType: 'audio/pcm;rate=24000',
            });
        }
    };

    micSource.connect(micProcessor);
    micProcessor.connect(micAudioContext.destination);

    audioProcessor = micProcessor;
    return { context: micAudioContext, processor: micProcessor };
}

function setupLinuxMicProcessing(micStream) {
    // Setup microphone audio processing for Linux
    const micAudioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const micSource = micAudioContext.createMediaStreamSource(micStream);
    const micProcessor = micAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;

    micProcessor.onaudioprocess = async e => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(...inputData);

        // Process audio in chunks
        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);
            const pcmData16 = convertFloat32ToInt16(chunk);
            const base64Data = arrayBufferToBase64(pcmData16.buffer);

            await window.api.listenCapture.sendMicAudioContent({
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            });
        }
    };

    micSource.connect(micProcessor);
    micProcessor.connect(micAudioContext.destination);

    // Store processor reference for cleanup
    audioProcessor = micProcessor;
}

function setupSystemAudioProcessing(systemStream) {
    const systemAudioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const systemSource = systemAudioContext.createMediaStreamSource(systemStream);
    const systemProcessor = systemAudioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

    let audioBuffer = [];
    const samplesPerChunk = SAMPLE_RATE * AUDIO_CHUNK_DURATION;

    systemProcessor.onaudioprocess = async e => {
        const inputData = e.inputBuffer.getChannelData(0);
        if (!inputData || inputData.length === 0) return;
        
        audioBuffer.push(...inputData);

        while (audioBuffer.length >= samplesPerChunk) {
            const chunk = audioBuffer.splice(0, samplesPerChunk);
            const pcmData16 = convertFloat32ToInt16(chunk);
            const base64Data = arrayBufferToBase64(pcmData16.buffer);

            try {
                await window.api.listenCapture.sendSystemAudioContent({
                    data: base64Data,
                    mimeType: 'audio/pcm;rate=24000',
                });
            } catch (error) {
                console.error('Failed to send system audio:', error);
            }
        }
    };

    systemSource.connect(systemProcessor);
    systemProcessor.connect(systemAudioContext.destination);

    return { context: systemAudioContext, processor: systemProcessor };
}

// ---------------------------
// Main capture functions (exact from renderer.js)
// ---------------------------
async function startCapture(screenshotIntervalSeconds = 5, imageQuality = 'medium') {

    // Reset token tracker when starting new capture session
    tokenTracker.reset();
    console.log('🎯 Token tracker reset for new capture session');

    try {
        if (isMacOS) {

            const sessionActive = await window.api.listenCapture.isSessionActive();
            if (!sessionActive) {
                throw new Error('STT sessions not initialized - please wait for initialization to complete');
            }

            // On macOS, try BlackHole first for better native app support (FaceTime, Discord, etc.)
            // Then fallback to SystemAudioDump if BlackHole is not available
            console.log('Starting macOS capture...');

            // Check for BlackHole virtual audio device
            const blackHoleDetection = await detectBlackHoleDevice();
            let systemAudioStarted = false;

            if (blackHoleDetection.found) {
                console.log(`[macOS] BlackHole detected: ${blackHoleDetection.deviceName}`);
                console.log('[macOS] Using BlackHole for system audio capture (supports FaceTime, Discord, etc.)');

                // Start BlackHole capture for system audio ("Them")
                systemAudioStarted = await startBlackHoleCapture();

                if (systemAudioStarted) {
                    console.log('[macOS] BlackHole capture started successfully');
                } else {
                    console.warn('[macOS] BlackHole capture failed, falling back to SystemAudioDump');
                }
            }

            // Fallback to SystemAudioDump if BlackHole not available or failed
            if (!systemAudioStarted) {
                console.log('[macOS] Using SystemAudioDump for system audio capture');
                console.log('[macOS] Note: Native apps like FaceTime may not be captured. Install BlackHole for full support.');

                const audioResult = await window.api.listenCapture.startMacosSystemAudio();
                if (!audioResult.success) {
                    console.warn('[listenCapture] macOS audio start failed:', audioResult.error);

                    // Already running -> stop and retry
                    if (audioResult.error === 'already_running') {
                        await window.api.listenCapture.stopMacosSystemAudio();
                        await new Promise(r => setTimeout(r, 500));
                        const retry = await window.api.listenCapture.startMacosSystemAudio();
                        if (!retry.success) {
                            console.error('[macOS] SystemAudioDump retry failed:', retry.error);
                            // Continue without system audio rather than failing completely
                        }
                    } else {
                        console.error('[macOS] SystemAudioDump failed:', audioResult.error);
                        // Continue without system audio rather than failing completely
                    }
                }
            }

            // Start microphone capture (always needed for "Me" transcription)
            console.log('[macOS] Requesting microphone access...');
            try {
                micMediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: SAMPLE_RATE,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false,
                });

                console.log('[macOS] ✅ Microphone access granted');
                console.log('[macOS] Microphone stream tracks:', micMediaStream.getAudioTracks().map(t => t.label));
                console.log('[macOS] Setting up mic audio processing...');
                const { context, processor } = await setupMicProcessing(micMediaStream);
                audioContext = context;
                audioProcessor = processor;
                console.log('[macOS] ✅ Microphone capture started successfully');
            } catch (micErr) {
                console.error('[macOS] ❌ Failed to get microphone access:', micErr.name, micErr.message);
                console.error('[macOS] Error details:', micErr);
                throw new Error(`Microphone access denied: ${micErr.message}`);
            }
            ////////// for index & subjects //////////

            console.log('macOS screen capture started - audio handled by SystemAudioDump');
        } else if (isLinux) {

            const sessionActive = await window.api.listenCapture.isSessionActive();
            if (!sessionActive) {
                throw new Error('STT sessions not initialized - please wait for initialization to complete');
            }
            
            // Linux - use display media for screen capture and getUserMedia for microphone
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 1,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false, // Don't use system audio loopback on Linux
            });

            // Get microphone input for Linux
            let micMediaStream = null;
            try {
                micMediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: SAMPLE_RATE,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false,
                });

                console.log('Linux microphone capture started');

                // Setup audio processing for microphone on Linux
                setupLinuxMicProcessing(micMediaStream);
            } catch (micError) {
                console.warn('Failed to get microphone access on Linux:', micError);
                // Continue without microphone if permission denied
            }

            console.log('Linux screen capture started');
        } else {
            // Windows - capture mic and system audio separately using native loopback
            console.log('Starting Windows capture with native loopback audio...');

            // Ensure STT sessions are initialized before starting audio capture
            const sessionActive = await window.api.listenCapture.isSessionActive();
            if (!sessionActive) {
                throw new Error('STT sessions not initialized - please wait for initialization to complete');
            }

            // 1. Get user's microphone
            try {
                micMediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: SAMPLE_RATE,
                        channelCount: 1,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false,
                });
                console.log('Windows microphone capture started');
                const { context, processor } = await setupMicProcessing(micMediaStream);
                audioContext = context;
                audioProcessor = processor;
            } catch (micErr) {
                console.warn('Could not get microphone access on Windows:', micErr);
            }

            // 2. Get system audio using native Electron loopback
            try {
                mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true // This will now use native loopback from our handler
                });
                
                // Verify we got audio tracks
                const audioTracks = mediaStream.getAudioTracks();
                if (audioTracks.length === 0) {
                    throw new Error('No audio track in native loopback stream');
                }
                
                console.log('Windows native loopback audio capture started');
                const { context, processor } = setupSystemAudioProcessing(mediaStream);
                systemAudioContext = context;
                systemAudioProcessor = processor;
            } catch (sysAudioErr) {
                console.error('Failed to start Windows native loopback audio:', sysAudioErr);
                // Continue without system audio
            }
        }
    } catch (err) {
        console.error('Error starting capture:', err);
        // Note: lucide.e() is not available in this context, commenting out
        // lucide.e().setStatus('error');
    }
}

async function stopCapture() {
    // Clean up microphone resources
    if (audioProcessor) {
        audioProcessor.disconnect();
        audioProcessor = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    // Clean up system audio resources
    if (systemAudioProcessor) {
        systemAudioProcessor.disconnect();
        systemAudioProcessor = null;
    }
    if (systemAudioContext) {
        systemAudioContext.close();
        systemAudioContext = null;
    }

    // Stop and release media stream tracks
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (micMediaStream) {
        micMediaStream.getTracks().forEach(t => t.stop());
        micMediaStream = null;
    }

    // Stop macOS audio capture
    if (isMacOS) {
        // Stop BlackHole capture if active
        if (isBlackHoleCaptureActive()) {
            await stopBlackHoleCapture();
        }

        // Stop SystemAudioDump if running
        window.api.listenCapture.stopMacosSystemAudio().catch(err => {
            console.error('Error stopping macOS audio:', err);
        });
    }
}

// ---------------------------
// Exports & global registration
// ---------------------------
module.exports = {
    getAec,          // Nouvelle fonction d'initialisation
    runAecSync,      // Version synchrone
    disposeAec,      // Détruire l'objet Rust si nécessaire
    startCapture,
    stopCapture,
    isLinux,
    isMacOS,
    // BlackHole virtual audio device support
    getAudioInputDevices,
    detectBlackHoleDevice,
    startBlackHoleCapture,
    stopBlackHoleCapture,
    isBlackHoleCaptureActive,
};

// Expose functions to global scope for external access (exact from renderer.js)
if (typeof window !== 'undefined') {
    window.listenCapture = module.exports;
    window.lucide = window.lucide || {};
    window.lucide.startCapture = startCapture;
    window.lucide.stopCapture = stopCapture;
} 