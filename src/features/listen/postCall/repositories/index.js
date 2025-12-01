/**
 * Post-Call Repositories Index
 * Central export for meeting notes and tasks repositories
 */

const meetingNotesRepository = require('./meetingNotes.repository');
const meetingTasksRepository = require('./meetingTasks.repository');
const sessionParticipantsRepository = require('./sessionParticipants.sqlite.repository'); // Phase 2

module.exports = {
    meetingNotesRepository,
    meetingTasksRepository,
    sessionParticipantsRepository
};
