const sqliteRepository = require('./meetingNotes.sqlite.repository');

/**
 * Meeting Notes Repository Adapter
 * Currently uses SQLite only
 * Can be extended to support Firebase in the future
 */

module.exports = {
    ...sqliteRepository
};
