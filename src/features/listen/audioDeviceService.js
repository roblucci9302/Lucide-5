/**
 * Audio Device Service
 *
 * Detects and manages virtual audio devices like BlackHole for capturing
 * audio from native applications (FaceTime, Discord, etc.) on macOS.
 *
 * BlackHole is a virtual audio driver that creates a loopback device,
 * allowing Lucide to capture audio that would otherwise be isolated
 * by macOS security (like FaceTime calls).
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Known virtual audio device patterns
const VIRTUAL_AUDIO_DEVICES = {
    BLACKHOLE_2CH: 'BlackHole 2ch',
    BLACKHOLE_16CH: 'BlackHole 16ch',
    BLACKHOLE_64CH: 'BlackHole 64ch',
    LOOPBACK: 'Loopback Audio',
    SOUNDFLOWER: 'Soundflower',
};

class AudioDeviceService {
    constructor() {
        this.availableDevices = [];
        this.selectedDevice = null;
        this.isBlackHoleAvailable = false;
        this.blackHoleDeviceName = null;
    }

    /**
     * Detect available audio input devices on macOS
     * @returns {Promise<Array>} List of audio input devices
     */
    async detectAudioDevices() {
        if (process.platform !== 'darwin') {
            console.log('[AudioDeviceService] Not on macOS, skipping device detection');
            return [];
        }

        try {
            // Use system_profiler to list audio devices on macOS
            const { stdout } = await execAsync(
                'system_profiler SPAudioDataType -json 2>/dev/null || echo "{}"'
            );

            const audioData = JSON.parse(stdout);
            const devices = [];

            if (audioData.SPAudioDataType) {
                for (const device of audioData.SPAudioDataType) {
                    if (device._name) {
                        devices.push({
                            name: device._name,
                            type: device.coreaudio_device_input ? 'input' : 'output',
                            isVirtual: this._isVirtualDevice(device._name),
                            manufacturer: device.coreaudio_device_manufacturer || 'Unknown'
                        });
                    }
                }
            }

            this.availableDevices = devices;
            console.log('[AudioDeviceService] Detected devices:', devices.map(d => d.name));

            return devices;
        } catch (error) {
            console.error('[AudioDeviceService] Error detecting devices:', error);
            return [];
        }
    }

    /**
     * Check if BlackHole is installed on the system
     * @returns {Promise<Object>} BlackHole detection result
     */
    async detectBlackHole() {
        if (process.platform !== 'darwin') {
            return { installed: false, reason: 'Not on macOS' };
        }

        try {
            // Check for BlackHole using multiple methods

            // Method 1: Check Audio MIDI Setup
            const { stdout: audioDevices } = await execAsync(
                'system_profiler SPAudioDataType 2>/dev/null | grep -i "blackhole" || echo ""'
            );

            // Method 2: Check if BlackHole kext/driver is loaded
            const { stdout: kextList } = await execAsync(
                'kextstat 2>/dev/null | grep -i "blackhole" || echo ""'
            );

            // Method 3: Check CoreAudio devices directly
            const { stdout: ioreg } = await execAsync(
                'ioreg -r -c IOAudioDevice 2>/dev/null | grep -i "blackhole" || echo ""'
            );

            const isInstalled = audioDevices.trim() !== '' ||
                               kextList.trim() !== '' ||
                               ioreg.trim() !== '';

            if (isInstalled) {
                // Determine which BlackHole variant
                let deviceName = VIRTUAL_AUDIO_DEVICES.BLACKHOLE_2CH; // Default
                if (audioDevices.includes('16ch')) {
                    deviceName = VIRTUAL_AUDIO_DEVICES.BLACKHOLE_16CH;
                } else if (audioDevices.includes('64ch')) {
                    deviceName = VIRTUAL_AUDIO_DEVICES.BLACKHOLE_64CH;
                }

                this.isBlackHoleAvailable = true;
                this.blackHoleDeviceName = deviceName;

                console.log(`[AudioDeviceService] BlackHole detected: ${deviceName}`);
                return {
                    installed: true,
                    deviceName: deviceName,
                    message: `BlackHole est installé (${deviceName})`
                };
            }

            this.isBlackHoleAvailable = false;
            console.log('[AudioDeviceService] BlackHole not detected');
            return {
                installed: false,
                reason: 'BlackHole n\'est pas installé',
                installUrl: 'https://existential.audio/blackhole/'
            };

        } catch (error) {
            console.error('[AudioDeviceService] Error detecting BlackHole:', error);
            return {
                installed: false,
                reason: 'Erreur lors de la détection',
                error: error.message
            };
        }
    }

    /**
     * Check if a Multi-Output Device is configured with BlackHole
     * @returns {Promise<Object>} Multi-Output configuration status
     */
    async checkMultiOutputDevice() {
        if (process.platform !== 'darwin') {
            return { configured: false };
        }

        try {
            // Check for aggregate/multi-output devices
            const { stdout } = await execAsync(
                'system_profiler SPAudioDataType 2>/dev/null | grep -A5 -i "multi-output\\|aggregate" || echo ""'
            );

            const hasMultiOutput = stdout.trim() !== '' &&
                                  stdout.toLowerCase().includes('blackhole');

            return {
                configured: hasMultiOutput,
                message: hasMultiOutput
                    ? 'Multi-Output Device configuré avec BlackHole'
                    : 'Aucun Multi-Output Device avec BlackHole détecté'
            };
        } catch (error) {
            return { configured: false, error: error.message };
        }
    }

    /**
     * Get instructions for setting up BlackHole
     * @returns {Object} Setup instructions
     */
    getSetupInstructions() {
        return {
            title: 'Configuration de BlackHole pour capturer l\'audio FaceTime',
            steps: [
                {
                    step: 1,
                    title: 'Installer BlackHole',
                    description: 'Téléchargez et installez BlackHole depuis existential.audio/blackhole',
                    url: 'https://existential.audio/blackhole/',
                    command: 'brew install blackhole-2ch'
                },
                {
                    step: 2,
                    title: 'Ouvrir Configuration audio et MIDI',
                    description: 'Ouvrez l\'application "Configuration audio et MIDI" (Audio MIDI Setup)',
                    command: 'open -a "Audio MIDI Setup"'
                },
                {
                    step: 3,
                    title: 'Créer un périphérique Multi-Sortie',
                    description: 'Cliquez sur le "+" en bas à gauche et sélectionnez "Créer un périphérique à sorties multiples"'
                },
                {
                    step: 4,
                    title: 'Configurer le Multi-Output Device',
                    description: 'Cochez votre sortie audio habituelle (haut-parleurs/casque) ET BlackHole 2ch. Assurez-vous que "Correction de dérive" est activé pour BlackHole.'
                },
                {
                    step: 5,
                    title: 'Définir comme sortie par défaut',
                    description: 'Faites un clic droit sur le Multi-Output Device et sélectionnez "Utiliser ce périphérique pour la sortie audio"'
                },
                {
                    step: 6,
                    title: 'Configurer FaceTime/Discord',
                    description: 'Dans les préférences de FaceTime ou Discord, sélectionnez le Multi-Output Device comme sortie audio, ou utilisez simplement la sortie système par défaut.'
                }
            ],
            notes: [
                'BlackHole est gratuit et open-source',
                'Le Multi-Output Device envoie l\'audio à la fois vers vos haut-parleurs ET vers BlackHole',
                'Lucide capture ensuite l\'audio depuis BlackHole pour transcrire ce que dit votre interlocuteur',
                'Cette configuration fonctionne avec FaceTime, Discord, Zoom, Teams et toutes les autres applications'
            ],
            troubleshooting: [
                {
                    problem: 'Je n\'entends plus le son après la configuration',
                    solution: 'Assurez-vous que vos haut-parleurs sont cochés dans le Multi-Output Device'
                },
                {
                    problem: 'L\'audio n\'est pas capturé',
                    solution: 'Vérifiez que BlackHole est coché dans le Multi-Output Device et que "Correction de dérive" est activé'
                },
                {
                    problem: 'Écho ou feedback audio',
                    solution: 'Assurez-vous de ne pas avoir BlackHole sélectionné comme entrée micro dans vos applications'
                }
            ]
        };
    }

    /**
     * Check if a device name corresponds to a virtual audio device
     * @private
     */
    _isVirtualDevice(deviceName) {
        const name = deviceName.toLowerCase();
        return name.includes('blackhole') ||
               name.includes('loopback') ||
               name.includes('soundflower') ||
               name.includes('virtual') ||
               name.includes('aggregate') ||
               name.includes('multi-output');
    }

    /**
     * Get the recommended capture source based on available devices
     * @returns {Object} Recommended capture configuration
     */
    getRecommendedCaptureSource() {
        if (this.isBlackHoleAvailable) {
            return {
                method: 'blackhole',
                deviceName: this.blackHoleDeviceName,
                description: `Utiliser ${this.blackHoleDeviceName} pour capturer l'audio des applications natives`
            };
        }

        return {
            method: 'system_audio_dump',
            deviceName: null,
            description: 'Utiliser SystemAudioDump (limité pour les apps natives comme FaceTime)'
        };
    }

    /**
     * Get current status summary
     * @returns {Promise<Object>} Status summary
     */
    async getStatus() {
        const blackHoleStatus = await this.detectBlackHole();
        const multiOutputStatus = await this.checkMultiOutputDevice();

        return {
            platform: process.platform,
            blackHole: blackHoleStatus,
            multiOutput: multiOutputStatus,
            recommendation: this.getRecommendedCaptureSource(),
            nativeAppsSupported: blackHoleStatus.installed && multiOutputStatus.configured
        };
    }
}

// Singleton instance
const audioDeviceService = new AudioDeviceService();

module.exports = audioDeviceService;
