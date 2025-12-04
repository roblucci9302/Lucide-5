const { meetingTasksRepository } = require('./repositories');
const participantService = require('./participantService');
const authService = require('../../common/services/authService');
const { parseRelativeDate, isOverdue: dateIsOverdue, isWithinDays: dateIsWithinDays } = require('../../common/utils/dateUtils');

/**
 * Task Management Service - Phase 2.3
 * Advanced task management with email assignment, reminders, and status tracking
 */
class TaskManagementService {
    constructor() {
        console.log('[TaskManagementService] Initialized');
    }

    /**
     * Auto-assign email addresses to tasks based on participant data
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Assignment result
     */
    async autoAssignEmails(sessionId) {
        try {
            console.log(`[TaskManagementService] Auto-assigning emails for session ${sessionId}`);

            // Get all tasks for this session
            const tasks = meetingTasksRepository.getBySessionId(sessionId);
            if (!tasks || tasks.length === 0) {
                return { success: true, assigned: 0, message: 'No tasks to assign' };
            }

            // Get participant mapping
            const participantMapping = participantService.getParticipantMapping(sessionId);
            if (Object.keys(participantMapping).length === 0) {
                return { success: false, assigned: 0, message: 'No participants assigned yet' };
            }

            let assignedCount = 0;

            // Assign emails based on participant names
            tasks.forEach(task => {
                if (!task.assigned_to || task.assigned_to_email) {
                    return; // Skip if no assignee or email already set
                }

                // Try to match assigned_to with participant names
                const assigneeName = task.assigned_to.toLowerCase().trim();

                // Direct match
                let matchedParticipant = Object.values(participantMapping).find(
                    p => p.name.toLowerCase().trim() === assigneeName
                );

                // Partial match if direct match fails
                if (!matchedParticipant) {
                    matchedParticipant = Object.values(participantMapping).find(
                        p => p.name.toLowerCase().includes(assigneeName) ||
                             assigneeName.includes(p.name.toLowerCase())
                    );
                }

                if (matchedParticipant && matchedParticipant.email) {
                    // Update task with email
                    meetingTasksRepository.update(task.id, {
                        assigned_to_email: matchedParticipant.email
                    });
                    assignedCount++;
                    console.log(`[TaskManagementService] Assigned ${matchedParticipant.email} to task ${task.id}`);
                }
            });

            return {
                success: true,
                assigned: assignedCount,
                total: tasks.length,
                message: `Assigned emails to ${assignedCount} out of ${tasks.length} tasks`
            };

        } catch (error) {
            console.error('[TaskManagementService] Error auto-assigning emails:', error);
            throw error;
        }
    }

    /**
     * Update task with full field support
     * @param {string} taskId - Task ID
     * @param {Object} updates - Fields to update
     * @returns {Object} Update result
     */
    updateTask(taskId, updates) {
        try {
            const now = Math.floor(Date.now() / 1000);

            // Handle status change logic
            if (updates.status) {
                if (updates.status === 'completed' && !updates.completed_at) {
                    updates.completed_at = now;
                } else if (updates.status !== 'completed') {
                    updates.completed_at = null;
                }

                // If marking as blocked, ensure blocked_reason is provided
                if (updates.status === 'blocked' && !updates.blocked_reason) {
                    updates.blocked_reason = 'Reason not specified';
                }

                // Clear blocked_reason if not blocked
                if (updates.status !== 'blocked') {
                    updates.blocked_reason = null;
                }
            }

            // Add updated_at timestamp
            updates.updated_at = now;

            const result = meetingTasksRepository.update(taskId, updates);

            console.log(`[TaskManagementService] Updated task ${taskId}:`, updates);
            return {
                success: true,
                changes: result.changes,
                taskId
            };

        } catch (error) {
            console.error('[TaskManagementService] Error updating task:', error);
            throw error;
        }
    }

    /**
     * Change task status with business logic
     * @param {string} taskId - Task ID
     * @param {string} newStatus - New status
     * @param {Object} metadata - Additional metadata (blocked_reason, etc.)
     * @returns {Object} Update result
     */
    changeStatus(taskId, newStatus, metadata = {}) {
        try {
            const updates = { status: newStatus };

            // Add metadata based on status
            if (newStatus === 'blocked' && metadata.blocked_reason) {
                updates.blocked_reason = metadata.blocked_reason;
            }

            if (newStatus === 'completed') {
                updates.completed_at = Math.floor(Date.now() / 1000);
            }

            return this.updateTask(taskId, updates);

        } catch (error) {
            console.error('[TaskManagementService] Error changing status:', error);
            throw error;
        }
    }

    /**
     * Get tasks by status
     * @param {string} sessionId - Session ID
     * @param {string} status - Status to filter by
     * @returns {Array<Object>} Filtered tasks
     */
    getTasksByStatus(sessionId, status) {
        try {
            const allTasks = meetingTasksRepository.getBySessionId(sessionId);
            return allTasks.filter(task => task.status === status);
        } catch (error) {
            console.error('[TaskManagementService] Error getting tasks by status:', error);
            return [];
        }
    }

    /**
     * Get tasks by assignee email
     * @param {string} email - Assignee email
     * @returns {Array<Object>} Tasks assigned to this email
     */
    getTasksByAssignee(email) {
        try {
            const uid = authService.getCurrentUserId();
            const allTasks = meetingTasksRepository.getAllByUserId(uid);
            return allTasks.filter(task =>
                task.assigned_to_email &&
                task.assigned_to_email.toLowerCase() === email.toLowerCase()
            );
        } catch (error) {
            console.error('[TaskManagementService] Error getting tasks by assignee:', error);
            return [];
        }
    }

    /**
     * Get overdue tasks
     * @param {string} sessionId - Session ID (optional)
     * @returns {Array<Object>} Overdue tasks
     */
    getOverdueTasks(sessionId = null) {
        try {
            let tasks;
            if (sessionId) {
                tasks = meetingTasksRepository.getBySessionId(sessionId);
            } else {
                const uid = authService.getCurrentUserId();
                tasks = meetingTasksRepository.getAllByUserId(uid);
            }

            const now = new Date();

            return tasks.filter(task => {
                if (task.status === 'completed' || task.status === 'cancelled') {
                    return false;
                }

                if (!task.deadline || task.deadline === 'TBD' || task.deadline === 'Flexible') {
                    return false;
                }

                // Use dateUtils for robust date parsing (supports relative dates FR/EN)
                return dateIsOverdue(task.deadline, now);
            });

        } catch (error) {
            console.error('[TaskManagementService] Error getting overdue tasks:', error);
            return [];
        }
    }

    /**
     * Get upcoming tasks (due within X days)
     * @param {number} days - Number of days to look ahead
     * @param {string} sessionId - Session ID (optional)
     * @returns {Array<Object>} Upcoming tasks
     */
    getUpcomingTasks(days = 7, sessionId = null) {
        try {
            let tasks;
            if (sessionId) {
                tasks = meetingTasksRepository.getBySessionId(sessionId);
            } else {
                const uid = authService.getCurrentUserId();
                tasks = meetingTasksRepository.getAllByUserId(uid);
            }

            const now = new Date();

            return tasks.filter(task => {
                if (task.status === 'completed' || task.status === 'cancelled') {
                    return false;
                }

                if (!task.deadline || task.deadline === 'TBD' || task.deadline === 'Flexible') {
                    return false;
                }

                // Use dateUtils for robust date parsing (supports relative dates FR/EN)
                return dateIsWithinDays(task.deadline, days, now);
            });

        } catch (error) {
            console.error('[TaskManagementService] Error getting upcoming tasks:', error);
            return [];
        }
    }

    /**
     * Set reminder for a task
     * @param {string} taskId - Task ID
     * @param {string} reminderDate - ISO date string
     * @returns {Object} Update result
     */
    setReminder(taskId, reminderDate) {
        try {
            return this.updateTask(taskId, {
                reminder_date: reminderDate,
                reminder_sent: 0
            });
        } catch (error) {
            console.error('[TaskManagementService] Error setting reminder:', error);
            throw error;
        }
    }

    /**
     * Mark reminder as sent
     * @param {string} taskId - Task ID
     * @returns {Object} Update result
     */
    markReminderSent(taskId) {
        try {
            return this.updateTask(taskId, {
                reminder_sent: 1
            });
        } catch (error) {
            console.error('[TaskManagementService] Error marking reminder sent:', error);
            throw error;
        }
    }

    /**
     * Get tasks that need reminders
     * @returns {Array<Object>} Tasks needing reminders
     */
    getTasksNeedingReminders() {
        try {
            const uid = authService.getCurrentUserId();
            const allTasks = meetingTasksRepository.getAllByUserId(uid);

            const now = new Date();

            return allTasks.filter(task => {
                if (task.status === 'completed' || task.status === 'cancelled') {
                    return false;
                }

                if (!task.reminder_date || task.reminder_sent) {
                    return false;
                }

                try {
                    const reminderDate = new Date(task.reminder_date);
                    return reminderDate <= now;
                } catch (e) {
                    return false;
                }
            });

        } catch (error) {
            console.error('[TaskManagementService] Error getting tasks needing reminders:', error);
            return [];
        }
    }

    /**
     * Add tags to a task
     * @param {string} taskId - Task ID
     * @param {Array<string>} tags - Tags to add
     * @returns {Object} Update result
     */
    addTags(taskId, tags) {
        try {
            const task = meetingTasksRepository.getById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            let existingTags = [];
            if (task.tags) {
                try {
                    existingTags = JSON.parse(task.tags);
                } catch (e) {
                    existingTags = [];
                }
            }

            // Merge tags (unique)
            const mergedTags = [...new Set([...existingTags, ...tags])];

            return this.updateTask(taskId, {
                tags: JSON.stringify(mergedTags)
            });

        } catch (error) {
            console.error('[TaskManagementService] Error adding tags:', error);
            throw error;
        }
    }

    /**
     * Remove tags from a task
     * @param {string} taskId - Task ID
     * @param {Array<string>} tags - Tags to remove
     * @returns {Object} Update result
     */
    removeTags(taskId, tags) {
        try {
            const task = meetingTasksRepository.getById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            let existingTags = [];
            if (task.tags) {
                try {
                    existingTags = JSON.parse(task.tags);
                } catch (e) {
                    existingTags = [];
                }
            }

            // Remove tags
            const filteredTags = existingTags.filter(t => !tags.includes(t));

            return this.updateTask(taskId, {
                tags: JSON.stringify(filteredTags)
            });

        } catch (error) {
            console.error('[TaskManagementService] Error removing tags:', error);
            throw error;
        }
    }

    /**
     * Get task statistics for a session
     * @param {string} sessionId - Session ID
     * @returns {Object} Task statistics
     */
    getTaskStatistics(sessionId) {
        try {
            const tasks = meetingTasksRepository.getBySessionId(sessionId);

            const stats = {
                total: tasks.length,
                byStatus: {
                    pending: 0,
                    in_progress: 0,
                    completed: 0,
                    blocked: 0,
                    cancelled: 0
                },
                byPriority: {
                    low: 0,
                    medium: 0,
                    high: 0
                },
                overdue: 0,
                withEmail: 0,
                withoutEmail: 0
            };

            tasks.forEach(task => {
                // Count by status
                if (stats.byStatus[task.status] !== undefined) {
                    stats.byStatus[task.status]++;
                }

                // Count by priority
                if (stats.byPriority[task.priority] !== undefined) {
                    stats.byPriority[task.priority]++;
                }

                // Count with/without email
                if (task.assigned_to_email) {
                    stats.withEmail++;
                } else {
                    stats.withoutEmail++;
                }

                // Count overdue (using dateUtils for relative date support)
                if (task.deadline && task.deadline !== 'TBD' && task.deadline !== 'Flexible') {
                    if (task.status !== 'completed' && task.status !== 'cancelled') {
                        if (dateIsOverdue(task.deadline, new Date())) {
                            stats.overdue++;
                        }
                    }
                }
            });

            return stats;

        } catch (error) {
            console.error('[TaskManagementService] Error getting task statistics:', error);
            return null;
        }
    }

    /**
     * Export tasks to CSV format
     * @param {string} sessionId - Session ID
     * @returns {string} CSV content
     */
    exportToCSV(sessionId) {
        try {
            const tasks = meetingTasksRepository.getBySessionId(sessionId);

            const headers = [
                'Task Description',
                'Assigned To',
                'Email',
                'Deadline',
                'Priority',
                'Status',
                'Context',
                'Notes',
                'Tags',
                'Estimated Hours'
            ];

            let csv = headers.join(',') + '\n';

            tasks.forEach(task => {
                const row = [
                    this._escapeCSV(task.task_description || ''),
                    this._escapeCSV(task.assigned_to || ''),
                    this._escapeCSV(task.assigned_to_email || ''),
                    this._escapeCSV(task.deadline || ''),
                    this._escapeCSV(task.priority || ''),
                    this._escapeCSV(task.status || ''),
                    this._escapeCSV(task.context || ''),
                    this._escapeCSV(task.notes || ''),
                    this._escapeCSV(task.tags || ''),
                    this._escapeCSV(task.estimated_hours ? task.estimated_hours.toString() : '')
                ];

                csv += row.join(',') + '\n';
            });

            return csv;

        } catch (error) {
            console.error('[TaskManagementService] Error exporting to CSV:', error);
            throw error;
        }
    }

    /**
     * Helper: Escape CSV field
     * @private
     */
    _escapeCSV(field) {
        if (field === null || field === undefined) return '';

        const str = field.toString();

        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }

        return str;
    }
}

// Singleton instance
const taskManagementService = new TaskManagementService();
module.exports = taskManagementService;
