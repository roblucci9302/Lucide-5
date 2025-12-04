const sqliteRepository = require('./sqlite.repository');
const firebaseRepository = require('./firebase.repository');
const authService = require('../../../common/services/authService');

function getBaseRepository() {
    const user = authService.getCurrentUser();
    if (user && user.isLoggedIn) {
        return firebaseRepository;
    }
    return sqliteRepository;
}

const sttRepositoryAdapter = {
    /**
     * Add a transcript with error handling and fallback
     * FIX MEDIUM: Added try-catch with fallback to SQLite if Firebase fails
     */
    addTranscript: async ({ sessionId, speaker, text }) => {
        const uid = authService.getCurrentUserId();
        const repo = getBaseRepository();

        try {
            return await repo.addTranscript({ uid, sessionId, speaker, text });
        } catch (error) {
            console.error('[STTRepository] Error adding transcript:', error.message);

            // If Firebase fails, try SQLite as fallback
            if (repo === firebaseRepository) {
                console.warn('[STTRepository] Firebase failed, falling back to SQLite');
                try {
                    return await sqliteRepository.addTranscript({ uid, sessionId, speaker, text });
                } catch (fallbackError) {
                    console.error('[STTRepository] SQLite fallback also failed:', fallbackError.message);
                    throw fallbackError;
                }
            }
            throw error;
        }
    },

    /**
     * Get all transcripts with error handling
     * FIX MEDIUM: Added try-catch with fallback
     */
    getAllTranscriptsBySessionId: async (sessionId) => {
        const repo = getBaseRepository();

        try {
            return await repo.getAllTranscriptsBySessionId(sessionId);
        } catch (error) {
            console.error('[STTRepository] Error getting transcripts:', error.message);

            // If Firebase fails, try SQLite as fallback
            if (repo === firebaseRepository) {
                console.warn('[STTRepository] Firebase failed, falling back to SQLite');
                try {
                    return await sqliteRepository.getAllTranscriptsBySessionId(sessionId);
                } catch (fallbackError) {
                    console.error('[STTRepository] SQLite fallback also failed:', fallbackError.message);
                    return []; // Return empty array instead of throwing
                }
            }
            return []; // Return empty array on error
        }
    },

    // Alias for compatibility - both names point to the same function
    getTranscriptsBySessionId: async (sessionId) => {
        return sttRepositoryAdapter.getAllTranscriptsBySessionId(sessionId);
    }
};

module.exports = sttRepositoryAdapter; 