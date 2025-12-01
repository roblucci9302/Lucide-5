const sqliteRepository = require('./sqlite.repository');
const firebaseRepository = require('./firebase.repository');

let authService = null;

function setAuthService(service) {
    authService = service;
}

function getBaseRepository() {
    if (!authService) {
        // Fallback or error if authService is not set, to prevent crashes.
        // During initial load, it might not be set, so we default to sqlite.
        return sqliteRepository;
    }
    const user = authService.getCurrentUser();
    if (user && user.isLoggedIn) {
        return firebaseRepository;
    }
    return sqliteRepository;
}

// The adapter layer that injects the UID
const sessionRepositoryAdapter = {
    setAuthService, // Expose the setter

    // Fix CRITICAL BUG-C15: Normalize all methods to async for consistency
    getById: async (id) => await getBaseRepository().getById(id),

    create: async (type = 'ask') => {
        // Fix CRITICAL BUG-C14: Add null check for authService before calling methods
        if (!authService || typeof authService.getCurrentUserId !== 'function') {
            throw new Error('[SessionRepository] AuthService not initialized');
        }
        const uid = authService.getCurrentUserId();
        return await getBaseRepository().create(uid, type);
    },

    getAllByUserId: async () => {
        // Fix CRITICAL BUG-C14: Add null check for authService
        if (!authService || typeof authService.getCurrentUserId !== 'function') {
            throw new Error('[SessionRepository] AuthService not initialized');
        }
        const uid = authService.getCurrentUserId();
        return await getBaseRepository().getAllByUserId(uid);
    },

    updateTitle: async (id, title) => await getBaseRepository().updateTitle(id, title),

    deleteWithRelatedData: async (id) => await getBaseRepository().deleteWithRelatedData(id),

    end: async (id) => await getBaseRepository().end(id),

    updateType: async (id, type) => await getBaseRepository().updateType(id, type),

    touch: async (id) => await getBaseRepository().touch(id),

    getOrCreateActive: async (requestedType = 'ask') => {
        // Fix CRITICAL BUG-C14: Add null check for authService
        if (!authService || typeof authService.getCurrentUserId !== 'function') {
            throw new Error('[SessionRepository] AuthService not initialized');
        }
        const uid = authService.getCurrentUserId();
        return await getBaseRepository().getOrCreateActive(uid, requestedType);
    },

    endAllActiveSessions: async () => {
        // Fix CRITICAL BUG-C14: Add null check for authService
        if (!authService || typeof authService.getCurrentUserId !== 'function') {
            throw new Error('[SessionRepository] AuthService not initialized');
        }
        const uid = authService.getCurrentUserId();
        return await getBaseRepository().endAllActiveSessions(uid);
    },

    // Fix HIGH BUG: Session post-processing tracking methods
    markAsPostProcessed: async (id) => {
        // Currently only supported in SQLite - Firebase sessions are synced separately
        return await sqliteRepository.markAsPostProcessed(id);
    },

    isPostProcessed: async (id) => {
        // Currently only supported in SQLite
        return sqliteRepository.isPostProcessed(id);
    },

    getUnprocessedSessions: async () => {
        // Fix CRITICAL BUG-C14: Add null check for authService
        if (!authService || typeof authService.getCurrentUserId !== 'function') {
            throw new Error('[SessionRepository] AuthService not initialized');
        }
        const uid = authService.getCurrentUserId();
        // Currently only supported in SQLite
        return sqliteRepository.getUnprocessedSessions(uid);
    },
};

module.exports = sessionRepositoryAdapter; 