/**
 * Notification Service - Phase 3.3
 * Manages notifications for live insights with desktop and in-app alerts
 */

const { Notification } = require('electron');
const EventEmitter = require('events');

/**
 * Notification Types
 */
const NotificationType = {
    INSIGHT: 'insight',           // New insight detected
    SUGGESTION: 'suggestion',     // AI suggestion
    BLOCKER: 'blocker',          // Critical blocker
    DEADLINE: 'deadline',        // Deadline mentioned
    SUMMARY: 'summary'           // Meeting summary
};

/**
 * Notification Priority
 */
const NotificationPriority = {
    LOW: 'low',           // Silent, in-app only
    MEDIUM: 'medium',     // In-app with badge
    HIGH: 'high',         // Desktop + in-app
    CRITICAL: 'critical'  // Desktop + sound + in-app
};

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.notifications = [];
        this.preferences = this._loadDefaultPreferences();
        this.unreadCount = 0;
        this.isEnabled = true;

        // FIX MEDIUM: Track expiration timers for proper cleanup
        this._expireTimers = new Map(); // Map<notificationId, timerId>

        console.log('[NotificationService] Initialized');
    }

    /**
     * FIX MEDIUM: Clear expiration timer for a notification
     * @private
     */
    _clearExpireTimer(notificationId) {
        if (this._expireTimers.has(notificationId)) {
            clearTimeout(this._expireTimers.get(notificationId));
            this._expireTimers.delete(notificationId);
        }
    }

    /**
     * FIX MEDIUM: Clear all expiration timers
     * Called during reset to prevent memory leaks
     */
    clearAllTimers() {
        for (const [id, timerId] of this._expireTimers) {
            clearTimeout(timerId);
        }
        this._expireTimers.clear();
        console.log('[NotificationService] All timers cleared');
    }

    /**
     * Load default notification preferences
     * @private
     */
    _loadDefaultPreferences() {
        return {
            enabled: true,
            desktop: {
                enabled: true,
                highPriorityOnly: true,
                sound: true
            },
            inApp: {
                enabled: true,
                showBadge: true,
                autoExpire: true,
                expireDuration: 30000 // 30 seconds
            },
            filters: {
                blockers: true,
                deadlines: true,
                decisions: true,
                suggestions: true,
                questions: false,
                topicChanges: false
            }
        };
    }

    /**
     * Update notification preferences
     */
    updatePreferences(newPreferences) {
        this.preferences = {
            ...this.preferences,
            ...newPreferences
        };
        console.log('[NotificationService] Preferences updated');
        this.emit('preferences-updated', this.preferences);
    }

    /**
     * Get current preferences
     */
    getPreferences() {
        return this.preferences;
    }

    /**
     * Enable/disable all notifications
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`[NotificationService] ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    /**
     * Notify about a new insight
     * @param {Object} insight - The insight to notify about
     */
    notifyInsight(insight) {
        if (!this.isEnabled || !this.preferences.enabled) {
            return;
        }

        // Check if this insight type should trigger notifications
        if (!this._shouldNotify(insight)) {
            return;
        }

        const notificationPriority = this._calculateNotificationPriority(insight);
        const notification = this._createNotification(
            NotificationType.INSIGHT,
            insight.title,
            insight.content,
            notificationPriority,
            {
                insightId: insight.id,
                insightType: insight.type,
                insightPriority: insight.priority,
                sentiment: insight.sentiment
            }
        );

        this._processNotification(notification);
    }

    /**
     * Notify about AI suggestion
     * @param {Object} suggestion - The suggestion to notify about
     */
    notifySuggestion(suggestion) {
        if (!this.isEnabled || !this.preferences.enabled) {
            return;
        }

        if (!this.preferences.filters.suggestions) {
            return;
        }

        const notification = this._createNotification(
            NotificationType.SUGGESTION,
            '💡 AI Suggestion',
            suggestion.title || suggestion.description,
            NotificationPriority.MEDIUM,
            { suggestion }
        );

        this._processNotification(notification);
    }

    /**
     * Notify about meeting summary
     * @param {Object} summary - The summary to notify about
     */
    notifySummary(summary) {
        if (!this.isEnabled || !this.preferences.enabled) {
            return;
        }

        const notification = this._createNotification(
            NotificationType.SUMMARY,
            '📊 Meeting Summary Ready',
            summary.summary || 'Your meeting summary is ready',
            NotificationPriority.LOW,
            { summary }
        );

        this._processNotification(notification);
    }

    /**
     * Check if insight should trigger notification based on filters
     * @private
     */
    _shouldNotify(insight) {
        const typeFilterMap = {
            blocker: 'blockers',
            deadline: 'deadlines',
            decision: 'decisions',
            suggestion: 'suggestions',
            question: 'questions',
            topic_change: 'topicChanges'
        };

        const filterKey = typeFilterMap[insight.type];
        if (filterKey && this.preferences.filters[filterKey] !== undefined) {
            return this.preferences.filters[filterKey];
        }

        // Default: notify for unmapped types
        return true;
    }

    /**
     * Calculate notification priority based on insight
     * @private
     */
    _calculateNotificationPriority(insight) {
        // Blockers and urgent sentiment are critical
        if (insight.type === 'blocker' || insight.sentiment === 'urgent') {
            return NotificationPriority.CRITICAL;
        }

        // High priority insights get high notifications
        if (insight.priority === 'high') {
            return NotificationPriority.HIGH;
        }

        // Deadlines are high priority
        if (insight.type === 'deadline') {
            return NotificationPriority.HIGH;
        }

        // Medium priority insights
        if (insight.priority === 'medium' || insight.type === 'decision') {
            return NotificationPriority.MEDIUM;
        }

        // Everything else is low
        return NotificationPriority.LOW;
    }

    /**
     * Create notification object
     * @private
     */
    _createNotification(type, title, body, priority, metadata = {}) {
        const notification = {
            id: this._generateId(),
            type,
            title,
            body,
            priority,
            timestamp: Date.now(),
            read: false,
            metadata
        };

        return notification;
    }

    /**
     * Process and dispatch notification
     * @private
     */
    _processNotification(notification) {
        // Add to notifications list
        this.notifications.unshift(notification);
        this.unreadCount++;

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        // Emit in-app notification event
        if (this.preferences.inApp.enabled) {
            this.emit('notification', notification);
        }

        // Show desktop notification for high/critical priority
        if (this.preferences.desktop.enabled) {
            const shouldShowDesktop =
                notification.priority === NotificationPriority.CRITICAL ||
                (notification.priority === NotificationPriority.HIGH && !this.preferences.desktop.highPriorityOnly);

            if (shouldShowDesktop) {
                this._showDesktopNotification(notification);
            }
        }

        // Auto-expire if enabled
        // FIX MEDIUM: Store timer ID for proper cleanup
        if (this.preferences.inApp.autoExpire && notification.priority !== NotificationPriority.CRITICAL) {
            const timerId = setTimeout(() => {
                this._expireTimers.delete(notification.id);
                this._expireNotification(notification.id);
            }, this.preferences.inApp.expireDuration);
            this._expireTimers.set(notification.id, timerId);
        }

        console.log(`[NotificationService] ${notification.priority.toUpperCase()}: ${notification.title}`);
    }

    /**
     * Show desktop notification using Electron
     * @private
     */
    _showDesktopNotification(notification) {
        try {
            const desktopNotification = new Notification({
                title: notification.title,
                body: notification.body,
                icon: this._getNotificationIcon(notification.type),
                silent: !this.preferences.desktop.sound || notification.priority === NotificationPriority.LOW,
                urgency: this._getUrgency(notification.priority),
                timeoutType: notification.priority === NotificationPriority.CRITICAL ? 'never' : 'default'
            });

            desktopNotification.on('click', () => {
                this.emit('notification-clicked', notification);
                this.markAsRead(notification.id);
            });

            desktopNotification.show();

            console.log(`[NotificationService] Desktop notification shown: ${notification.title}`);
        } catch (error) {
            console.error('[NotificationService] Failed to show desktop notification:', error);
        }
    }

    /**
     * Get notification icon path
     * @private
     */
    _getNotificationIcon(type) {
        // This would point to actual icon files
        // For now, return undefined to use default
        return undefined;
    }

    /**
     * Get urgency level for notification
     * @private
     */
    _getUrgency(priority) {
        switch (priority) {
            case NotificationPriority.CRITICAL:
                return 'critical';
            case NotificationPriority.HIGH:
                return 'normal';
            case NotificationPriority.MEDIUM:
            case NotificationPriority.LOW:
            default:
                return 'low';
        }
    }

    /**
     * Mark notification as read
     */
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.emit('notification-read', notification);
            console.log(`[NotificationService] Marked as read: ${notificationId}`);
        }
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.unreadCount = 0;
        this.emit('all-notifications-read');
        console.log('[NotificationService] All notifications marked as read');
    }

    /**
     * Expire (remove) a notification
     * @private
     */
    _expireNotification(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            const notification = this.notifications[index];
            if (!notification.read) {
                this.unreadCount = Math.max(0, this.unreadCount - 1);
            }
            this.notifications.splice(index, 1);
            this.emit('notification-expired', notificationId);
        }
    }

    /**
     * Clear a specific notification
     */
    clearNotification(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            this._expireNotification(notificationId);
            console.log(`[NotificationService] Cleared: ${notificationId}`);
        }
    }

    /**
     * Clear all notifications
     * FIX MEDIUM: Also clear all expiration timers
     */
    clearAll() {
        this.clearAllTimers(); // Prevent timer accumulation
        this.notifications = [];
        this.unreadCount = 0;
        this.emit('all-notifications-cleared');
        console.log('[NotificationService] All notifications cleared');
    }

    /**
     * Get all notifications
     */
    getAllNotifications() {
        return this.notifications;
    }

    /**
     * Get unread notifications
     */
    getUnreadNotifications() {
        return this.notifications.filter(n => !n.read);
    }

    /**
     * Get unread count
     */
    getUnreadCount() {
        return this.unreadCount;
    }

    /**
     * Get notifications by type
     */
    getNotificationsByType(type) {
        return this.notifications.filter(n => n.type === type);
    }

    /**
     * Get notifications by priority
     */
    getNotificationsByPriority(priority) {
        return this.notifications.filter(n => n.priority === priority);
    }

    /**
     * Reset service
     * FIX MEDIUM: Also clear all expiration timers
     */
    reset() {
        this.clearAllTimers(); // Prevent timer accumulation
        this.notifications = [];
        this.unreadCount = 0;
        console.log('[NotificationService] Reset');
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
const notificationService = new NotificationService();

// Export types
notificationService.NotificationType = NotificationType;
notificationService.NotificationPriority = NotificationPriority;

module.exports = notificationService;
