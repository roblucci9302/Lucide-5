const { onAuthStateChanged, signInWithCustomToken, signOut, signInAnonymously } = require('firebase/auth');
const { BrowserWindow, shell } = require('electron');
const { getFirebaseAuth } = require('./firebaseClient');
const fetch = require('node-fetch');
const encryptionService = require('./encryptionService');
const migrationService = require('./migrationService');
const sessionRepository = require('../repositories/session');
const providerSettingsRepository = require('../repositories/providerSettings');
const permissionService = require('./permissionService');
const agentProfileService = require('./agentProfileService');

/**
 * Fetch virtual key with timeout protection
 * Fix HIGH BUG #5: Added timeout to prevent login from hanging indefinitely
 */
async function getVirtualKeyByEmail(email, idToken) {
    if (!idToken) {
        throw new Error('Firebase ID token is required for virtual key request');
    }

    // Fix HIGH BUG #5: Wrap fetch in timeout promise (30 seconds)
    // Fix NORMAL MEDIUM BUG-M24: Document timeout rationale
    // Fix MEDIUM BUG-M6: Use AbortController to properly cancel fetch instead of Promise.race() leak
    // 30 seconds chosen based on:
    // - Typical API response time: 2-5 seconds
    // - Network latency buffer: 5-10 seconds
    // - Edge cases (slow connections): up to 15 seconds
    // - Total with safety margin: 30 seconds
    // Prevents indefinite hangs during login while allowing slow networks to succeed
    const timeoutMs = 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Fix HIGH BUG-H6: Use environment variable instead of hardcoded URL
    const apiUrl = process.env.VIRTUAL_KEY_API_URL || 'https://serverless-api-sf3o.vercel.app/api/virtual_key';

    let resp;
    try {
        resp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ email: email.trim().toLowerCase() }),
            redirect: 'follow',
            signal: controller.signal
        });
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Virtual key request timed out after 30 seconds');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
        console.error('[VK] API request failed:', json.message || 'Unknown error');
        throw new Error(json.message || `HTTP ${resp.status}: Virtual key request failed`);
    }

    const vKey = json?.data?.virtualKey || json?.data?.virtual_key || json?.data?.newVKey?.slug;

    if (!vKey) throw new Error('virtual key missing in response');
    return vKey;
}

class AuthService {
    constructor() {
        this.currentUserId = 'default_user';
        this.currentUserMode = 'local'; // 'local' or 'firebase'
        this.currentUser = null;
        this.isInitialized = false;

        // This ensures the key is ready before any login/logout state change.
        this.initializationPromise = null;

        // Store unsubscribe function for Firebase auth listener
        this.authUnsubscribe = null;

        // Race condition protection for auth state changes
        this.authStateInProgress = false;
        this.pendingAuthState = null;

        sessionRepository.setAuthService(this);
    }

    initialize() {
        if (this.isInitialized) return this.initializationPromise;

        // Fix: Use async IIFE instead of async Promise executor to avoid anti-pattern
        this.initializationPromise = (async () => {
            return new Promise((resolve) => {
                const auth = getFirebaseAuth();

                // Handle degraded mode when Firebase is not available
                if (!auth) {
                    console.log('[AuthService] Firebase not available - running in local mode');
                    this.currentUser = null;
                    this.currentUserId = 'default_user';
                    this.currentUserMode = 'local';
                    this.isInitialized = true;

                    // Initialize agent profile for default user
                    agentProfileService.initialize('default_user')
                        .then(() => {
                            this.broadcastUserState();
                            resolve();
                        })
                        .catch(error => {
                            console.error('[AuthService] Failed to initialize agent profile:', error);
                            this.broadcastUserState();
                            resolve(); // Still resolve to not block initialization
                        });
                    return;
                }

                // Store unsubscribe function for cleanup
                this.authUnsubscribe = onAuthStateChanged(auth, async (user) => {
                    // Prevent concurrent auth state changes
                    if (this.authStateInProgress) {
                        this.pendingAuthState = user;
                        return;
                    }

                    this.authStateInProgress = true;

                    try {
                        await this._handleAuthStateChange(user);
                    } catch (error) {
                        console.error('[AuthService] Error handling auth state change:', error);
                    } finally {
                        this.authStateInProgress = false;

                        // Fix HIGH BUG #4: Process pending state change directly instead of creating new listener
                        // The previous code used onAuthStateChanged() recursively which creates a memory leak
                        if (this.pendingAuthState !== null) {
                            const pending = this.pendingAuthState;
                            this.pendingAuthState = null;

                            // Set flag back to in-progress for pending state
                            this.authStateInProgress = true;

                            try {
                                // Call handler directly instead of creating new listener
                                await this._handleAuthStateChange(pending);
                            } catch (error) {
                                console.error('[AuthService] Error handling pending auth state change:', error);
                            } finally {
                                this.authStateInProgress = false;
                            }
                        }

                        // Resolve initialization promise on first run
                        if (!this.isInitialized) {
                            this.isInitialized = true;
                            console.log('[AuthService] Initialized and resolved initialization promise.');
                            resolve();
                        }
                    }
                });
            });
        })();

        return this.initializationPromise;
    }

    /**
     * Handle authentication state changes (extracted to prevent code duplication)
     * @private
     */
    async _handleAuthStateChange(user) {
        const previousUser = this.currentUser;

        if (user) {
            // User signed IN (can be anonymous or authenticated)
            const isAnonymous = user.isAnonymous;
            console.log(`[AuthService] Firebase user signed in: ${user.uid} (anonymous: ${isAnonymous})`);
            this.currentUser = user;
            this.currentUserId = user.uid;
            this.currentUserMode = isAnonymous ? 'anonymous' : 'firebase';

            // Clean up any zombie sessions from a previous run for this user.
            try {
                await sessionRepository.endAllActiveSessions();
            } catch (error) {
                console.error('[AuthService] Failed to end active sessions:', error);
            }

            // ** Initialize encryption key for the logged-in user if permissions are already granted **
            try {
                if (process.platform === 'darwin' && !(await permissionService.checkKeychainCompleted(this.currentUserId))) {
                    console.warn('[AuthService] Keychain permission not yet completed for this user. Deferring key initialization.');
                } else {
                    await encryptionService.initializeKey(user.uid);
                }
            } catch (error) {
                console.error('[AuthService] Failed to initialize encryption key:', error);
            }

            // ** Check for and run data migration for the user (only for non-anonymous users) **
            if (!isAnonymous) {
                migrationService.checkAndRunMigration(user).catch(error => {
                    console.error('[AuthService] Migration failed:', error);
                });
            }

            // ** Initialize agent profile service for the user **
            try {
                await agentProfileService.initialize(user.uid);
            } catch (error) {
                console.error('[AuthService] Failed to initialize agent profile:', error);
            }

            // ***** CRITICAL: Wait for the virtual key and model state update to complete *****
            // Skip virtual key for anonymous users (they don't have an email)
            if (!isAnonymous && user.email) {
                try {
                    const idToken = await user.getIdToken(true);
                    const virtualKey = await getVirtualKeyByEmail(user.email, idToken);

                    if (!global.modelStateService) {
                        throw new Error('modelStateService not available');
                    }

                    await global.modelStateService.setFirebaseVirtualKey(virtualKey);
                    console.log(`[AuthService] Virtual key for ${user.email} has been processed and state updated.`);

                } catch (error) {
                    console.error('[AuthService] Failed to fetch or save virtual key:', error);
                    // This is not critical enough to halt the login, but we should log it.
                }
            } else {
                console.log('[AuthService] Anonymous user - skipping virtual key fetch');
            }

        } else {
            // User signed OUT or not yet authenticated
            console.log(`[AuthService] No Firebase user.`);

            // Clear virtual key if previous user existed
            if (previousUser && !previousUser.isAnonymous) {
                console.log(`[AuthService] Clearing API key for logged-out user: ${previousUser.uid}`);
                if (global.modelStateService) {
                    try {
                        await global.modelStateService.setFirebaseVirtualKey(null);
                    } catch (error) {
                        console.error('[AuthService] Failed to clear virtual key:', error);
                    }
                }
            }

            // Try to sign in anonymously instead of staying in local mode
            const auth = getFirebaseAuth();
            if (auth) {
                try {
                    console.log('[AuthService] Attempting anonymous sign-in...');
                    await signInAnonymously(auth);
                    // onAuthStateChanged will fire again with the anonymous user
                    console.log('[AuthService] Anonymous sign-in initiated');
                    return; // Exit early - the auth state change handler will be called again
                } catch (error) {
                    console.error('[AuthService] Anonymous sign-in failed, falling back to local mode:', error);
                    // Fall through to local mode setup below
                }
            }

            // Fallback to local mode if anonymous auth fails or Firebase not available
            this.currentUser = null;
            this.currentUserId = 'default_user';
            this.currentUserMode = 'local';

            // End active sessions for the local/default user as well.
            try {
                await sessionRepository.endAllActiveSessions();
            } catch (error) {
                console.error('[AuthService] Failed to end active sessions on signout:', error);
            }

            // Initialize agent profile for default user
            try {
                await agentProfileService.initialize('default_user');
            } catch (error) {
                console.error('[AuthService] Failed to initialize default agent profile:', error);
            }

            try {
                encryptionService.resetSessionKey();
            } catch (error) {
                console.error('[AuthService] Failed to reset session key:', error);
            }
        }

        this.broadcastUserState();
    }

    async startFirebaseAuthFlow() {
        try {
            const webUrl = process.env.LUCIDE_WEB_URL || 'http://localhost:3000';
            const authUrl = `${webUrl}/login?mode=electron`;
            console.log(`[AuthService] Opening Firebase auth URL in browser: ${authUrl}`);
            await shell.openExternal(authUrl);
            return { success: true };
        } catch (error) {
            console.error('[AuthService] Failed to open Firebase auth URL:', error);
            return { success: false, error: error.message };
        }
    }

    async signInWithCustomToken(token) {
        const auth = getFirebaseAuth();
        if (!auth) {
            throw new Error('Firebase Auth not available - cannot sign in');
        }
        try {
            const userCredential = await signInWithCustomToken(auth, token);
            console.log(`[AuthService] Successfully signed in with custom token for user:`, userCredential.user.uid);
            // onAuthStateChanged will handle the state update and broadcast
        } catch (error) {
            console.error('[AuthService] Error signing in with custom token:', error);
            throw error; // Re-throw to be handled by the caller
        }
    }

    async signOut() {
        const auth = getFirebaseAuth();
        if (!auth) {
            console.warn('[AuthService] Firebase Auth not available - cannot sign out');
            return;
        }
        try {
            // End all active sessions for the current user BEFORE signing out.
            await sessionRepository.endAllActiveSessions();

            await signOut(auth);
            console.log('[AuthService] User sign-out initiated successfully.');
            // onAuthStateChanged will handle the state update and broadcast,
            // which will also re-evaluate the API key status.
        } catch (error) {
            console.error('[AuthService] Error signing out:', error);
        }
    }
    
    broadcastUserState() {
        const userState = this.getCurrentUser();
        console.log('[AuthService] Broadcasting user state change:', userState);
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                try {
                    win.webContents.send('user-state-changed', userState);
                } catch (error) {
                    // Handle EPIPE errors when window is being destroyed
                    if (error.code === 'EPIPE' || error.message?.includes('EPIPE')) {
                        console.warn('[AuthService] EPIPE error sending to window, likely being destroyed');
                    } else {
                        console.error('[AuthService] Error broadcasting user state:', error);
                    }
                }
            }
        });
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    getCurrentUser() {
        const isLoggedIn = !!(this.currentUserMode === 'firebase' && this.currentUser);
        const isAnonymous = this.currentUserMode === 'anonymous' && this.currentUser;

        if (isLoggedIn) {
            return {
                uid: this.currentUser.uid,
                email: this.currentUser.email,
                displayName: this.currentUser.displayName,
                mode: 'firebase',
                isLoggedIn: true,
                isAnonymous: false,
            };
        }

        if (isAnonymous) {
            return {
                uid: this.currentUser.uid,
                email: null,
                displayName: 'Utilisateur Anonyme',
                mode: 'anonymous',
                isLoggedIn: false,
                isAnonymous: true,
            };
        }

        return {
            uid: this.currentUserId, // returns 'default_user'
            email: 'contact@lucide.app',
            displayName: 'Default User',
            mode: 'local',
            isLoggedIn: false,
            isAnonymous: false,
        };
    }

    /**
     * Cleanup Firebase auth listener to prevent memory leaks
     * Should be called before app shutdown
     */
    cleanup() {
        console.log('[AuthService] Cleaning up Firebase auth listener...');

        if (this.authUnsubscribe) {
            try {
                this.authUnsubscribe();
                this.authUnsubscribe = null;
                console.log('[AuthService] Firebase auth listener unsubscribed');
            } catch (error) {
                console.error('[AuthService] Error unsubscribing Firebase auth listener:', error);
            }
        }
    }
}

const authService = new AuthService();
module.exports = authService; 