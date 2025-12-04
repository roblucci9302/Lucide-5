const { EventEmitter } = require('events');
const ollamaService = require('./ollamaService');
const whisperService = require('./whisperService');


//Central manager for managing Ollama and Whisper services 
class LocalAIManager extends EventEmitter {
    constructor() {
        super();
        
        // service map
        this.services = {
            ollama: ollamaService,
            whisper: whisperService
        };
        
        // unified state management
        this.state = {
            ollama: {
                installed: false,
                running: false,
                models: []
            },
            whisper: {
                installed: false,
                initialized: false,
                models: []
            }
        };
        
        // setup event listeners
        this.setupEventListeners();
    }
    
    
    // subscribe to events from each service and re-emit as unified events
    setupEventListeners() {
        // ollama events
        ollamaService.on('install-progress', (data) => {
            this.emit('install-progress', 'ollama', data);
        });
        
        ollamaService.on('installation-complete', () => {
            this.emit('installation-complete', 'ollama');
            this.updateServiceState('ollama');
        });
        
        ollamaService.on('error', (error) => {
            this.emit('error', { service: 'ollama', ...error });
        });
        
        ollamaService.on('model-pull-complete', (data) => {
            this.emit('model-ready', { service: 'ollama', ...data });
            this.updateServiceState('ollama');
        });
        
        ollamaService.on('state-changed', (state) => {
            this.emit('state-changed', 'ollama', state);
        });
        
        // Événements Whisper
        whisperService.on('install-progress', (data) => {
            this.emit('install-progress', 'whisper', data);
        });
        
        whisperService.on('installation-complete', () => {
            this.emit('installation-complete', 'whisper');
            this.updateServiceState('whisper');
        });
        
        whisperService.on('error', (error) => {
            this.emit('error', { service: 'whisper', ...error });
        });
        
        whisperService.on('model-download-complete', (data) => {
            this.emit('model-ready', { service: 'whisper', ...data });
            this.updateServiceState('whisper');
        });
    }
    
    /**
     * Installation du service
     */
    async installService(serviceName, options = {}) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        try {
            if (serviceName === 'ollama') {
                return await service.handleInstall();
            } else if (serviceName === 'whisper') {
                // Whisper s'installe automatiquement
                await service.initialize();
                return { success: true };
            }
        } catch (error) {
            this.emit('error', {
                service: serviceName,
                errorType: 'installation-failed',
                error: error.message
            });
            throw error;
        }
    }
    
    /**
     * Consultation de l'état du service
     */
    async getServiceStatus(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        if (serviceName === 'ollama') {
            return await service.getStatus();
        } else if (serviceName === 'whisper') {
            const installed = await service.isInstalled();
            const running = await service.isServiceRunning();
            const models = await service.getInstalledModels();
            return {
                success: true,
                installed,
                running,
                models
            };
        }
    }
    
    /**
     * Démarrage du service
     */
    async startService(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        const result = await service.startService();
        await this.updateServiceState(serviceName);
        return { success: result };
    }
    
    /**
     * Arrêt du service
     */
    async stopService(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        let result;
        if (serviceName === 'ollama') {
            result = await service.shutdown(false);
        } else if (serviceName === 'whisper') {
            result = await service.stopService();
        }
        
        // Mise à jour de l'état après arrêt du service
        await this.updateServiceState(serviceName);
        
        return result;
    }
    
    /**
     * Installation/téléchargement de modèle
     */
    async installModel(serviceName, modelId, options = {}) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        if (serviceName === 'ollama') {
            return await service.pullModel(modelId);
        } else if (serviceName === 'whisper') {
            return await service.downloadModel(modelId);
        }
    }
    
    /**
     * Consultation de la liste des modèles installés
     */
    async getInstalledModels(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        if (serviceName === 'ollama') {
            return await service.getAllModelsWithStatus();
        } else if (serviceName === 'whisper') {
            return await service.getInstalledModels();
        }
    }
    
    /**
     * Préchauffage du modèle (Ollama uniquement)
     */
    async warmUpModel(modelName, forceRefresh = false) {
        return await ollamaService.warmUpModel(modelName, forceRefresh);
    }
    
    /**
     * Préchauffage automatique (Ollama uniquement)
     */
    async autoWarmUp() {
        return await ollamaService.autoWarmUpSelectedModel();
    }
    
    /**
     * Exécution du diagnostic
     */
    async runDiagnostics(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        const diagnostics = {
            service: serviceName,
            timestamp: new Date().toISOString(),
            checks: {}
        };
        
        try {
            // 1. Vérification de l'état d'installation
            diagnostics.checks.installation = {
                check: 'Installation',
                status: await service.isInstalled() ? 'pass' : 'fail',
                details: {}
            };
            
            // 2. État d'exécution du service
            diagnostics.checks.running = {
                check: 'Service Running',
                status: await service.isServiceRunning() ? 'pass' : 'fail',
                details: {}
            };
            
            // 3. Test de connexion au port et health check détaillé (Ollama)
            if (serviceName === 'ollama') {
                try {
                    // Use comprehensive health check
                    const health = await service.healthCheck();
                    diagnostics.checks.health = {
                        check: 'Service Health',
                        status: health.healthy ? 'pass' : 'fail',
                        details: health
                    };
                    
                    // Legacy port check for compatibility
                    diagnostics.checks.port = {
                        check: 'Port Connectivity',
                        status: health.checks.apiResponsive ? 'pass' : 'fail',
                        details: { connected: health.checks.apiResponsive }
                    };
                } catch (error) {
                    diagnostics.checks.health = {
                        check: 'Service Health',
                        status: 'fail',
                        details: { error: error.message }
                    };
                    diagnostics.checks.port = {
                        check: 'Port Connectivity',
                        status: 'fail',
                        details: { error: error.message }
                    };
                }
                
                // 4. Liste des modèles
                if (diagnostics.checks.running.status === 'pass') {
                    try {
                        const models = await service.getInstalledModels();
                        diagnostics.checks.models = {
                            check: 'Installed Models',
                            status: 'pass',
                            details: { count: models.length, models: models.map(m => m.name) }
                        };
                        
                        // 5. État du préchauffage
                        const warmupStatus = await service.getWarmUpStatus();
                        diagnostics.checks.warmup = {
                            check: 'Model Warm-up',
                            status: 'pass',
                            details: warmupStatus
                        };
                    } catch (error) {
                        diagnostics.checks.models = {
                            check: 'Installed Models',
                            status: 'fail',
                            details: { error: error.message }
                        };
                    }
                }
            }
            
            // 4. Diagnostic spécifique à Whisper
            if (serviceName === 'whisper') {
                // Vérification du binaire
                diagnostics.checks.binary = {
                    check: 'Whisper Binary',
                    status: service.whisperPath ? 'pass' : 'fail',
                    details: { path: service.whisperPath }
                };
                
                // Répertoire des modèles
                diagnostics.checks.modelDir = {
                    check: 'Model Directory',
                    status: service.modelsDir ? 'pass' : 'fail',
                    details: { path: service.modelsDir }
                };
            }
            
            // Résultat global du diagnostic
            const allChecks = Object.values(diagnostics.checks);
            diagnostics.summary = {
                total: allChecks.length,
                passed: allChecks.filter(c => c.status === 'pass').length,
                failed: allChecks.filter(c => c.status === 'fail').length,
                overallStatus: allChecks.every(c => c.status === 'pass') ? 'healthy' : 'unhealthy'
            };
            
        } catch (error) {
            diagnostics.error = error.message;
            diagnostics.summary = {
                overallStatus: 'error'
            };
        }
        
        return diagnostics;
    }
    
    /**
     * Réparation du service
     */
    async repairService(serviceName) {
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        
        console.log(`[LocalAIManager] Starting repair for ${serviceName}...`);
        const repairLog = [];
        
        try {
            // 1. Exécution du diagnostic
            repairLog.push('Running diagnostics...');
            const diagnostics = await this.runDiagnostics(serviceName);
            
            if (diagnostics.summary.overallStatus === 'healthy') {
                repairLog.push('Service is already healthy, no repair needed');
                return {
                    success: true,
                    repairLog,
                    diagnostics
                };
            }
            
            // 2. Résolution des problèmes d'installation
            if (diagnostics.checks.installation?.status === 'fail') {
                repairLog.push('Installation missing, attempting to install...');
                try {
                    await this.installService(serviceName);
                    repairLog.push('Installation completed');
                } catch (error) {
                    repairLog.push(`Installation failed: ${error.message}`);
                    throw error;
                }
            }
            
            // 3. Redémarrage du service
            if (diagnostics.checks.running?.status === 'fail') {
                repairLog.push('Service not running, attempting to start...');

                // Tentative d'arrêt
                try {
                    await this.stopService(serviceName);
                    repairLog.push('Stopped existing service');
                } catch (error) {
                    repairLog.push('Service was not running');
                }
                
                // Attente brève
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Démarrage
                try {
                    await this.startService(serviceName);
                    repairLog.push('Service started successfully');
                } catch (error) {
                    repairLog.push(`Failed to start service: ${error.message}`);
                    throw error;
                }
            }
            
            // 4. Résolution des problèmes de port (Ollama)
            if (serviceName === 'ollama' && diagnostics.checks.port?.status === 'fail') {
                repairLog.push('Port connectivity issue detected');

                // Arrêt forcé du processus
                if (process.platform === 'darwin') {
                    try {
                        const { exec } = require('child_process');
                        const { promisify } = require('util');
                        const execAsync = promisify(exec);
                        await execAsync('pkill -f ollama');
                        repairLog.push('Killed stale Ollama processes');
                    } catch (error) {
                        repairLog.push('No stale processes found');
                    }
                }
                else if (process.platform === 'win32') {
                    try {
                        const { exec } = require('child_process');
                        const { promisify } = require('util');
                        const execAsync = promisify(exec);
                        await execAsync('taskkill /F /IM ollama.exe');
                        repairLog.push('Killed stale Ollama processes');
                    } catch (error) {
                        repairLog.push('No stale processes found');
                    }
                }
                else if (process.platform === 'linux') {
                    try {
                        const { exec } = require('child_process');
                        const { promisify } = require('util');
                        const execAsync = promisify(exec);
                        await execAsync('pkill -f ollama');
                        repairLog.push('Killed stale Ollama processes');
                    } catch (error) {
                        repairLog.push('No stale processes found');
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Redémarrage
                await this.startService(serviceName);
                repairLog.push('Restarted service after port cleanup');
            }
            
            // 5. Récupération spécifique à Whisper
            if (serviceName === 'whisper') {
                // Nettoyage des sessions
                if (diagnostics.checks.running?.status === 'pass') {
                    repairLog.push('Cleaning up Whisper sessions...');
                    await service.cleanup();
                    repairLog.push('Sessions cleaned up');
                }
                
                // Initialisation
                if (!service.installState.isInitialized) {
                    repairLog.push('Re-initializing Whisper...');
                    await service.initialize();
                    repairLog.push('Whisper re-initialized');
                }
            }
            
            // 6. Vérification de l'état final
            repairLog.push('Verifying repair...');
            const finalDiagnostics = await this.runDiagnostics(serviceName);
            
            const success = finalDiagnostics.summary.overallStatus === 'healthy';
            repairLog.push(success ? 'Repair successful!' : 'Repair failed - manual intervention may be required');
            
            // Mise à jour de l'état en cas de succès
            if (success) {
                await this.updateServiceState(serviceName);
            }
            
            return {
                success,
                repairLog,
                diagnostics: finalDiagnostics
            };
            
        } catch (error) {
            repairLog.push(`Repair error: ${error.message}`);
            return {
                success: false,
                repairLog,
                error: error.message
            };
        }
    }
    
    /**
     * Mise à jour de l'état
     */
    async updateServiceState(serviceName) {
        try {
            const status = await this.getServiceStatus(serviceName);
            this.state[serviceName] = status;
            
            // Émission de l'événement de changement d'état
            this.emit('state-changed', serviceName, status);
        } catch (error) {
            console.error(`[LocalAIManager] Failed to update ${serviceName} state:`, error);
        }
    }
    
    /**
     * Consultation de l'état de tous les services
     */
    async getAllServiceStates() {
        const states = {};
        
        for (const serviceName of Object.keys(this.services)) {
            try {
                states[serviceName] = await this.getServiceStatus(serviceName);
            } catch (error) {
                states[serviceName] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return states;
    }
    
    /**
     * Démarrage de la synchronisation périodique de l'état
     */
    startPeriodicSync(interval = 30000) {
        if (this.syncInterval) {
            return;
        }
        
        this.syncInterval = setInterval(async () => {
            for (const serviceName of Object.keys(this.services)) {
                await this.updateServiceState(serviceName);
            }
        }, interval);
        
        // Démarrage également de la synchronisation périodique pour chaque service
        ollamaService.startPeriodicSync();
    }

    /**
     * Arrêt de la synchronisation périodique de l'état
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        // Arrêt également de la synchronisation périodique pour chaque service
        ollamaService.stopPeriodicSync();
    }

    /**
     * Arrêt complet
     */
    async shutdown() {
        this.stopPeriodicSync();
        
        const results = {};
        for (const [serviceName, service] of Object.entries(this.services)) {
            try {
                if (serviceName === 'ollama') {
                    results[serviceName] = await service.shutdown(false);
                } else if (serviceName === 'whisper') {
                    await service.cleanup();
                    results[serviceName] = true;
                }
            } catch (error) {
                results[serviceName] = false;
                console.error(`[LocalAIManager] Failed to shutdown ${serviceName}:`, error);
            }
        }
        
        return results;
    }
    
    /**
     * Gestion des erreurs
     */
    async handleError(serviceName, errorType, details = {}) {
        console.error(`[LocalAIManager] Error in ${serviceName}: ${errorType}`, details);

        // Traitement des erreurs par service
        switch(errorType) {
            case 'installation-failed':
                // Émission d'événement en cas d'échec d'installation
                this.emit('error-occurred', {
                    service: serviceName,
                    errorType,
                    error: details.error || 'Installation failed',
                    canRetry: true
                });
                break;
                
            case 'model-pull-failed':
            case 'model-download-failed':
                // Échec du téléchargement du modèle
                this.emit('error-occurred', {
                    service: serviceName,
                    errorType,
                    model: details.model,
                    error: details.error || 'Model download failed',
                    canRetry: true
                });
                break;
                
            case 'service-not-responding':
                // Service ne répond pas
                console.log(`[LocalAIManager] Attempting to repair ${serviceName}...`);
                const repairResult = await this.repairService(serviceName);
                
                this.emit('error-occurred', {
                    service: serviceName,
                    errorType,
                    error: details.error || 'Service not responding',
                    repairAttempted: true,
                    repairSuccessful: repairResult.success
                });
                break;
                
            default:
                // Autres erreurs
                this.emit('error-occurred', {
                    service: serviceName,
                    errorType,
                    error: details.error || `Unknown error: ${errorType}`,
                    canRetry: false
                });
        }
    }
}

// Singleton
const localAIManager = new LocalAIManager();
module.exports = localAIManager;