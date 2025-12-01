const sqliteRepository = require('./meetingTasks.sqlite.repository');

/**
 * Meeting Tasks Repository Adapter
 * Currently uses SQLite only
 * Can be extended to support Firebase in the future
 */

module.exports = {
    ...sqliteRepository
};
