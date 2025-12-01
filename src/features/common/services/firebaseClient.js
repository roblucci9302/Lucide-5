const { initializeApp } = require('firebase/app');
const { initializeAuth } = require('firebase/auth');
const Store = require('electron-store');
const { getFirestore, setLogLevel, initializeFirestore, connectFirestoreEmulator } = require('firebase/firestore');
const { getAnalytics } = require('firebase/analytics');

// setLogLevel('debug');

/**
 * Firebase Auth expects the `persistence` option passed to `initializeAuth()` to be *classes*,
 * not instances. It then calls `new PersistenceClass()` internally.  
 *
 * The helper below returns such a class, pre-configured with an `electron-store` instance that
 * will be shared across all constructed objects. This mirrors the pattern used by Firebase's own
 * `browserLocalPersistence` implementation as well as community solutions for NodeJS.
 */
function createElectronStorePersistence(storeName = 'firebase-auth-session') {
    // Create a single `electron-store` behind the scenes – all Persistence instances will use it.
    const sharedStore = new Store({ name: storeName });

    return class ElectronStorePersistence {
        constructor() {
            this.store = sharedStore;
            this.type = 'LOCAL';
        }

        /**
         * Firebase calls this to check whether the persistence is usable in the current context.
         */
        _isAvailable() {
            return Promise.resolve(true);
        }

        async _set(key, value) {
            this.store.set(key, value);
        }

        async _get(key) {
            return this.store.get(key) ?? null;
        }

        async _remove(key) {
            this.store.delete(key);
        }

        /**
         * These are used by Firebase to react to external storage events (e.g. multi-tab).
         * Electron apps are single-renderer per process, so we can safely provide no-op
         * implementations.
         */
        _addListener(_key, _listener) {
            // no-op
        }

        _removeListener(_key, _listener) {
            // no-op
        }
    };
}

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

let firebaseApp = null;
let firebaseAuth = null;
let firestoreInstance = null; // To hold the specific DB instance
let analyticsInstance = null; // To hold the analytics instance

// Fix HIGH BUG-H7: Validate Firebase configuration before initialization
function validateFirebaseConfig(config) {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
    const missingFields = requiredFields.filter(field => !config[field]);

    if (missingFields.length > 0) {
        return { valid: false, missingFields };
    }

    return { valid: true, missingFields: [] };
}

function initializeFirebase() {
    if (firebaseApp) {
        console.log('[FirebaseClient] Firebase already initialized.');
        return;
    }
    try {
        // Fix HIGH BUG-H7: Validate configuration before attempting initialization
        const validation = validateFirebaseConfig(firebaseConfig);

        // If Firebase is not configured, run in local mode (no error)
        if (!validation.valid) {
            console.log('[FirebaseClient] Firebase not configured - running in LOCAL MODE');
            console.log('[FirebaseClient] Missing config fields:', validation.missingFields.join(', '));
            console.log('[FirebaseClient] To enable cloud sync, configure Firebase in .env file');
            return; // Exit gracefully without throwing
        }

        firebaseApp = initializeApp(firebaseConfig);
        
        // Build a *class* persistence provider and hand it to Firebase.
        const ElectronStorePersistence = createElectronStorePersistence('firebase-auth-session');

        firebaseAuth = initializeAuth(firebaseApp, {
            // `initializeAuth` accepts a single class or an array – we pass an array for future
            // extensibility and to match Firebase examples.
            persistence: [ElectronStorePersistence],
        });

        // Initialize Firestore with the specific database ID
        // Initialisation de Firestore
        firestoreInstance = initializeFirestore(firebaseApp, {
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true
        });

        // Initialize Analytics if possible
        try {
            analyticsInstance = getAnalytics(firebaseApp);
            console.log('[FirebaseClient] Analytics initialized successfully.');
        } catch (error) {
            console.log('[FirebaseClient] Analytics not available in this environment:', error.message);
        }

        console.log('[FirebaseClient] Firebase initialized successfully with class-based electron-store persistence.');
        console.log('[FirebaseClient] Firestore instance is targeting the "lucide-dream" database.');
    } catch (error) {
        console.error('[FirebaseClient] Firebase initialization failed:', error);
    }
}

function getFirebaseAuth() {
    // Return null silently - local mode is valid when Firebase is not configured
    return firebaseAuth;
}

function getFirestoreInstance() {
    // Return null silently - local mode is valid when Firebase is not configured
    return firestoreInstance;
}

function getAnalyticsInstance() {
    return analyticsInstance;
}

module.exports = {
    initializeFirebase,
    getFirebaseAuth,
    getFirestoreInstance,
    getAnalyticsInstance,
}; 