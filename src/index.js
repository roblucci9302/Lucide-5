require('dotenv').config();

if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, dialog, desktopCapturer, session } = require('electron');
const windowManager = require('./window/windowManager.js');
const { createWindows } = windowManager;
const listenService = require('./features/listen/listenService');
const { initializeFirebase } = require('./features/common/services/firebaseClient');
const databaseInitializer = require('./features/common/services/databaseInitializer');
const authService = require('./features/common/services/authService');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');
const { EventEmitter } = require('events');
const askService = require('./features/ask/askService');
const settingsService = require('./features/settings/settingsService');
const sessionRepository = require('./features/common/repositories/session');
const modelStateService = require('./features/common/services/modelStateService');
const featureBridge = require('./bridge/featureBridge');
const windowBridge = require('./bridge/windowBridge');

// Phase 4: Knowledge Base services
const { createGenericRepository } = require('./features/common/repositories/genericRepository');
const documentService = require('./features/common/services/documentService');
const indexingService = require('./features/common/services/indexingService');
const ragService = require('./features/common/services/ragService');
const { EmbeddingProviderFactory } = require('./features/common/services/embeddingProvider');

// Phase 2: External Data Sync Scheduler
const syncSchedulerService = require('./features/common/services/syncSchedulerService');

// Phase WOW 1: User Profiles & Onboarding
const userProfileService = require('./features/common/services/userProfileService');
const agentProfileService = require('./features/common/services/agentProfileService');
const profileThemeService = require('./features/common/services/profileThemeService');

// Deep Link Service
const deepLinkService = require('./features/common/services/deepLinkService');

// Architecture detection for diagnostics
const architectureUtils = require('./features/common/utils/architectureUtils');

// Global variables
const eventBridge = new EventEmitter();
let isShuttingDown = false; // Flag to prevent infinite shutdown loop

// Log system architecture at startup for diagnostics
console.log('[Startup] System Architecture Information:');
architectureUtils.logArchitectureInfo();

//////// after_modelStateService ////////
global.modelStateService = modelStateService;
//////// after_modelStateService ////////

// Import and initialize OllamaService
const ollamaService = require('./features/common/services/ollamaService');
const ollamaModelRepository = require('./features/common/repositories/ollamaModel');
const localAIManager = require('./features/common/services/localAIManager');

// Native deep link handling - cross-platform compatible
let pendingDeepLinkUrl = null;

function setupProtocolHandling() {
    try {
        if (!app.isDefaultProtocolClient('lucide')) {
            const success = app.setAsDefaultProtocolClient('lucide');
            if (success) {
                console.log('[Protocol] Successfully set as default protocol client for lucide://');
            } else {
                console.warn('[Protocol] Failed to set as default protocol client - this may affect deep linking');
            }
        } else {
            console.log('[Protocol] Already registered as default protocol client for lucide://');
        }
    } catch (error) {
        console.error('[Protocol] Error during protocol registration:', error);
    }
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

// setup protocol after single instance lock
setupProtocolHandling();

// Handle second instance (Windows/Linux) - when app is already running
app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[Protocol] Second instance detected');
    console.log('[Protocol] Command line:', commandLine);
    console.log('[Protocol] Working directory:', workingDirectory);

    // Focus the existing window (find first non-destroyed window)
    const windows = BrowserWindow.getAllWindows();
    const mainWindow = windows.find(w => !w.isDestroyed());
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.show();
    }

    // Extract deep link URL from command line (Windows/Linux)
    // Safety: ensure commandLine is an array and arg is a string
    if (Array.isArray(commandLine)) {
        const deepLinkUrl = commandLine.find(arg =>
            typeof arg === 'string' && arg.startsWith('lucide://')
        );
        if (deepLinkUrl) {
            console.log('[Protocol] Deep link from second instance:', deepLinkUrl);
            deepLinkService.handleDeepLink(deepLinkUrl);
        }
    }
});

// Handle open-url (macOS) - deep link from external source
app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('[Protocol] open-url event received:', url);

    if (url.startsWith('lucide://')) {
        if (app.isReady()) {
            deepLinkService.handleDeepLink(url);
        } else {
            // Store for later processing
            pendingDeepLinkUrl = url;
            console.log('[Protocol] App not ready, storing deep link for later');
        }
    }
});

app.whenReady().then(async () => {
    // Setup native loopback audio capture for Windows
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
            callback({ video: sources[0], audio: 'loopback' });
        }).catch((error) => {
            console.error('Failed to get desktop capturer sources:', error);
            callback({});
        });
    });

    // Initialize core services
    initializeFirebase();

    // Track initialization status for each service
    const initStatus = {
        database: false,
        auth: false,
        modelState: false,
        userProfile: false,
        knowledgeBase: false,
        syncScheduler: false,
        featureBridge: false,
        windowBridge: false,
        ollamaModels: false
    };

    // Track error messages for failed services
    const initErrors = {};

    // ============================================
    // CRITICAL SERVICE 1: Database (required)
    // ============================================
    try {
        await databaseInitializer.initialize();
        initStatus.database = true;
        console.log('>>> [index.js] ✓ Database initialized successfully');
    } catch (err) {
        initErrors.database = err.message;
        console.error('>>> [index.js] ✗ Database initialization FAILED:', err.message);
        console.error('>>> [index.js] Stack:', err.stack);
    }

    // ============================================
    // CRITICAL SERVICE 2: Auth Service
    // ============================================
    try {
        await authService.initialize();
        initStatus.auth = true;
        console.log('>>> [index.js] ✓ Auth service initialized successfully');
    } catch (err) {
        initErrors.auth = err.message;
        console.error('>>> [index.js] ✗ Auth service initialization FAILED:', err.message);
        // Auth failure is not critical - app can run in local mode
    }

    // ============================================
    // CRITICAL SERVICE 3: Model State Service
    // ============================================
    try {
        //////// after_modelStateService ////////
        await modelStateService.initialize();
        //////// after_modelStateService ////////
        initStatus.modelState = true;
        console.log('>>> [index.js] ✓ Model state service initialized successfully');
    } catch (err) {
        initErrors.modelState = err.message;
        console.error('>>> [index.js] ✗ Model state service initialization FAILED:', err.message);
    }

    // ============================================
    // NON-CRITICAL: User Profile Service (Phase WOW 1)
    // ============================================
    console.log('[index.js] Initializing Phase WOW 1: User Profiles & Onboarding...');
    try {
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.uid) {
            await userProfileService.initialize(currentUser.uid);
            console.log('[index.js] ✓ User Profile service initialized for uid:', currentUser.uid);

            // Initialize theme service with current profile
            const currentProfile = userProfileService.getCurrentProfile();
            const activeProfile = currentProfile?.active_profile || 'lucide_assistant';
            profileThemeService.initialize(activeProfile);
            console.log('[index.js] ✓ Theme service initialized with profile:', activeProfile);
        } else {
            console.log('[index.js] No user logged in, skipping user profile initialization');
            // Still initialize theme service with default profile
            profileThemeService.initialize('lucide_assistant');
            console.log('[index.js] ✓ Theme service initialized with default profile');
        }
        initStatus.userProfile = true;
    } catch (profileError) {
        console.error('[index.js] ✗ User profile service error:', profileError.message);
        // Non-critical - app can continue without profile features
        try {
            profileThemeService.initialize('lucide_assistant');
            console.log('[index.js] ✓ Theme service initialized with default profile (fallback)');
        } catch (themeError) {
            console.error('[index.js] ✗ Theme service fallback error:', themeError.message);
        }
    }

    // ============================================
    // NON-CRITICAL: Knowledge Base Services (Phase 4)
    // ============================================
    console.log('[index.js] Initializing Phase 4: Knowledge Base services...');
    try {
        // Create repositories for Phase 4 tables
        const documentsRepository = createGenericRepository('documents');
        const chunksRepository = createGenericRepository('document_chunks');
        const citationsRepository = createGenericRepository('document_citations');

        // Initialize services with repositories
        documentService.initialize(documentsRepository, chunksRepository);
        indexingService.initialize(chunksRepository);
        ragService.initialize(citationsRepository);

        // Set up embedding provider (auto-detects OpenAI key or uses mock)
        const embeddingProvider = EmbeddingProviderFactory.createAuto();
        indexingService.setEmbeddingProvider(embeddingProvider);

        initStatus.knowledgeBase = true;
        console.log('[index.js] ✓ Phase 4 services initialized successfully');
    } catch (phase4Error) {
        console.error('[index.js] ✗ Phase 4 services error:', phase4Error.message);
        // Non-critical - app can continue without knowledge base features
    }

    // ============================================
    // NON-CRITICAL: Sync Scheduler (Phase 2)
    // ============================================
    console.log('[index.js] Starting Phase 2: External Data Sync Scheduler...');
    try {
        await syncSchedulerService.start();
        initStatus.syncScheduler = true;
        console.log('[index.js] ✓ External data sync scheduler started');
    } catch (syncSchedulerError) {
        console.error('[index.js] ✗ Sync scheduler error:', syncSchedulerError.message);
        // Non-critical - app can continue without scheduled sync
    }

    // ============================================
    // CRITICAL SERVICE 4: Feature Bridge
    // ============================================
    try {
        featureBridge.initialize();
        initStatus.featureBridge = true;
        console.log('>>> [index.js] ✓ Feature bridge initialized successfully');
    } catch (err) {
        initErrors.featureBridge = err.message;
        console.error('>>> [index.js] ✗ Feature bridge initialization FAILED:', err.message);
        console.error('>>> [index.js] Stack:', err.stack);
    }

    // ============================================
    // CRITICAL SERVICE 5: Window Bridge
    // ============================================
    try {
        windowBridge.initialize();
        initStatus.windowBridge = true;
        console.log('>>> [index.js] ✓ Window bridge initialized successfully');
    } catch (err) {
        initErrors.windowBridge = err.message;
        console.error('>>> [index.js] ✗ Window bridge initialization FAILED:', err.message);
        console.error('>>> [index.js] Stack:', err.stack);
    }

    // ============================================
    // NON-CRITICAL: Ollama Models
    // ============================================
    try {
        await ollamaModelRepository.initializeDefaultModels();
        initStatus.ollamaModels = true;
        console.log('[index.js] ✓ Ollama models initialized');
    } catch (err) {
        console.error('[index.js] ✗ Ollama models initialization error:', err.message);
        // Non-critical - app can work without Ollama
    }

    // Auto warm-up selected Ollama model in background (non-blocking)
    setTimeout(async () => {
        try {
            console.log('[index.js] Starting background Ollama model warm-up...');
            await ollamaService.autoWarmUpSelectedModel();
        } catch (error) {
            console.log('[index.js] Background warm-up failed (non-critical):', error.message);
        }
    }, 2000);

    // ============================================
    // Determine overall initialization status
    // Only CRITICAL services affect degraded mode:
    // - database (required for all operations)
    // - featureBridge (required for IPC)
    // - windowBridge (required for window management)
    // Auth and modelState are semi-critical (app works in local mode without them)
    // ============================================
    const criticalServicesOk = initStatus.database && initStatus.featureBridge && initStatus.windowBridge;
    const initializationSuccessful = criticalServicesOk;

    // Log initialization summary
    console.log('>>> [index.js] ============================================');
    console.log('>>> [index.js] INITIALIZATION SUMMARY');
    console.log('>>> [index.js] ============================================');
    console.log('>>> [index.js] Database:       ', initStatus.database ? '✓ OK' : '✗ FAILED');
    console.log('>>> [index.js] Auth:           ', initStatus.auth ? '✓ OK' : '○ Local mode');
    console.log('>>> [index.js] Model State:    ', initStatus.modelState ? '✓ OK' : '○ Defaults');
    console.log('>>> [index.js] User Profile:   ', initStatus.userProfile ? '✓ OK' : '○ Skipped');
    console.log('>>> [index.js] Knowledge Base: ', initStatus.knowledgeBase ? '✓ OK' : '○ Disabled');
    console.log('>>> [index.js] Sync Scheduler: ', initStatus.syncScheduler ? '✓ OK' : '○ Disabled');
    console.log('>>> [index.js] Feature Bridge: ', initStatus.featureBridge ? '✓ OK' : '✗ FAILED');
    console.log('>>> [index.js] Window Bridge:  ', initStatus.windowBridge ? '✓ OK' : '✗ FAILED');
    console.log('>>> [index.js] Ollama Models:  ', initStatus.ollamaModels ? '✓ OK' : '○ Disabled');
    console.log('>>> [index.js] --------------------------------------------');
    console.log('>>> [index.js] OVERALL STATUS: ', initializationSuccessful ? '✓ READY' : '✗ DEGRADED');
    console.log('>>> [index.js] ============================================');

    // ALWAYS create windows, even if initialization failed
    createWindows();

    // Initialize deep link service with window manager
    deepLinkService.setWindowManager(windowManager);

    // Process any pending deep link from app launch (macOS)
    if (pendingDeepLinkUrl) {
        console.log('[Protocol] Processing pending deep link:', pendingDeepLinkUrl);
        deepLinkService.handleDeepLink(pendingDeepLinkUrl);
        pendingDeepLinkUrl = null;
    }

    // Check for deep link in command line args (Windows/Linux launch)
    const launchDeepLink = process.argv.find(arg => arg.startsWith('lucide://'));
    if (launchDeepLink) {
        console.log('[Protocol] Processing launch deep link:', launchDeepLink);
        deepLinkService.handleDeepLink(launchDeepLink);
    }

    // Show warning dialog AFTER windows are created if there were errors
    if (!initializationSuccessful) {
        // Build detailed error message
        const failedServices = [];
        if (!initStatus.database) failedServices.push(`Database: ${initErrors.database || 'Unknown error'}`);
        if (!initStatus.featureBridge) failedServices.push(`Feature Bridge: ${initErrors.featureBridge || 'Unknown error'}`);
        if (!initStatus.windowBridge) failedServices.push(`Window Bridge: ${initErrors.windowBridge || 'Unknown error'}`);

        const detailMessage = failedServices.length > 0
            ? `Failed services:\n${failedServices.join('\n')}\n\nCore features should work, but some advanced features may be unavailable.`
            : 'Core features should work, but some advanced features may be unavailable.';

        console.error('>>> [index.js] DEGRADED MODE - Failed services:', failedServices);

        setTimeout(() => {
            dialog.showMessageBox({
                type: 'warning',
                title: 'Initialization Warning',
                message: 'Some services failed to initialize. The application is running in degraded mode.',
                detail: detailMessage,
                buttons: ['OK']
            });
        }, 1000);
    }

    // initAutoUpdater should be called after auth is initialized
    initAutoUpdater();
});

app.on('before-quit', async (event) => {
    if (isShuttingDown) {
        console.log('[Shutdown] 🔄 Shutdown already in progress, allowing quit...');
        return;
    }
    
    console.log('[Shutdown] App is about to quit. Starting graceful shutdown...');
    
    isShuttingDown = true;
    
    event.preventDefault();
    
    try {
        await listenService.closeSession();
        console.log('[Shutdown] Audio capture stopped');
        
        try {
            await sessionRepository.endAllActiveSessions();
            console.log('[Shutdown] Active sessions ended');
        } catch (dbError) {
            console.warn('[Shutdown] Could not end active sessions (database may be closed):', dbError.message);
        }
        
        console.log('[Shutdown] shutting down LocalAI services...');
        try {
            await localAIManager.shutdown();
            console.log('[Shutdown] LocalAI services shut down');
        } catch (localAIError) {
            console.warn('[Shutdown] Error shutting down LocalAI services:', localAIError.message);
        }

        console.log('[Shutdown] shutting down Ollama service...');
        const ollamaShutdownSuccess = await Promise.race([
            ollamaService.shutdown(false),
            new Promise(resolve => setTimeout(() => resolve(false), 8000))
        ]);

        if (ollamaShutdownSuccess) {
            console.log('[Shutdown] Ollama service shut down gracefully');
        } else {
            console.log('[Shutdown] Ollama shutdown timeout, forcing...');
            try {
                await ollamaService.shutdown(true);
            } catch (forceShutdownError) {
                console.warn('[Shutdown] Force shutdown also failed:', forceShutdownError.message);
            }
        }

        // Stop sync scheduler
        console.log('[Shutdown] Stopping sync scheduler...');
        try {
            syncSchedulerService.stop();
            console.log('[Shutdown] Sync scheduler stopped');
        } catch (schedulerError) {
            console.warn('[Shutdown] Error stopping sync scheduler:', schedulerError.message);
        }

        console.log('[Shutdown] Cleaning up event listeners and services...');
        try {
            // Fix HIGH BUG-H9/H10/H11/H12: Cleanup window manager event listeners
            windowManager.cleanup();
            featureBridge.cleanup();
            authService.cleanup();
            modelStateService.cleanup();
            console.log('[Shutdown] Event listeners and services cleaned up');
        } catch (cleanupError) {
            console.warn('[Shutdown] Error during cleanup:', cleanupError.message);
        }

        try {
            databaseInitializer.close();
            console.log('[Shutdown] Database connections closed');
        } catch (closeError) {
            console.warn('[Shutdown] Error closing database:', closeError.message);
        }
        
        console.log('[Shutdown] Graceful shutdown completed successfully');
        
    } catch (error) {
        console.error('[Shutdown] Error during graceful shutdown:', error);
    } finally {
        console.log('[Shutdown] Exiting application...');
        app.exit(0);
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindows();
    }
});

// Auto-update initialization
async function initAutoUpdater() {
    if (process.env.NODE_ENV === 'development') {
        console.log('Development environment, skipping auto-updater.');
        return;
    }

    try {
        await autoUpdater.checkForUpdates();
        autoUpdater.on('update-available', () => {
            console.log('Update available!');
            autoUpdater.downloadUpdate();
        });
        autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, date, url) => {
            console.log('Update downloaded:', releaseNotes, releaseName, date, url);
            dialog.showMessageBox({
                type: 'info',
                title: 'Application Update',
                message: `A new version of Lucide (${releaseName}) has been downloaded. It will be installed the next time you launch the application.`,
                buttons: ['Restart', 'Later']
            }).then(response => {
                if (response.response === 0) {
                    autoUpdater.quitAndInstall();
                }
            });
        });
        autoUpdater.on('error', (err) => {
            console.error('Error in auto-updater:', err);
        });
    } catch (err) {
        console.error('Error initializing auto-updater:', err);
    }
}