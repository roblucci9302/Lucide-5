const sqliteRepository = require('./sqlite.repository');
const firebaseRepository = require('./firebase.repository');
const authService = require('../../services/authService');

function getBaseRepository() {
    const user = authService.getCurrentUser();
    if (user && user.isLoggedIn) {
        return firebaseRepository;
    }
    return sqliteRepository;
}

const presetRepositoryAdapter = {
    // Fix HIGH BUG-H18: Mark functions as async for proper error handling
    getPresets: async () => {
        const uid = authService.getCurrentUserId();
        // Fix HIGH BUG-H19: Validate getCurrentUserId() result before using
        if (!uid) {
            throw new Error('[PresetRepository] User ID not available - cannot get presets');
        }
        return getBaseRepository().getPresets(uid);
    },

    getPresetTemplates: async () => {
        return getBaseRepository().getPresetTemplates();
    },

    create: async (options) => {
        const uid = authService.getCurrentUserId();
        // Fix HIGH BUG-H19: Validate getCurrentUserId() result before using
        if (!uid) {
            throw new Error('[PresetRepository] User ID not available - cannot create preset');
        }
        return getBaseRepository().create({ uid, ...options });
    },

    update: async (id, options) => {
        const uid = authService.getCurrentUserId();
        // Fix HIGH BUG-H19: Validate getCurrentUserId() result before using
        if (!uid) {
            throw new Error('[PresetRepository] User ID not available - cannot update preset');
        }
        return getBaseRepository().update(id, options, uid);
    },

    delete: async (id) => {
        const uid = authService.getCurrentUserId();
        // Fix HIGH BUG-H19: Validate getCurrentUserId() result before using
        if (!uid) {
            throw new Error('[PresetRepository] User ID not available - cannot delete preset');
        }
        return getBaseRepository().delete(id, uid);
    },
};

module.exports = presetRepositoryAdapter; 