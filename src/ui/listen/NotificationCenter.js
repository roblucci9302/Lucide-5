import { html, css, LitElement } from '../assets/lit-core-2.7.4.min.js';

/**
 * Notification Center - Phase 3.3
 * In-app notification center for displaying real-time alerts
 */
export class NotificationCenter extends LitElement {
    static properties = {
        notifications: { type: Array },
        unreadCount: { type: Number },
        isOpen: { type: Boolean },
        filter: { type: String } // 'all', 'unread'
    };

    static styles = css`
        :host {
            display: block;
            position: relative;
        }

        .notification-bell {
            position: relative;
            background: transparent;
            border: none;
            color: var(--color-white-80);
            font-size: 20px;
            cursor: pointer;
            padding: var(--padding-xs);
            border-radius: var(--radius-md);
            transition: all 0.2s ease;
        }

        .notification-bell:hover {
            background: var(--color-white-10);
            color: var(--color-white-100);
        }

        .unread-badge {
            position: absolute;
            top: 2px;
            right: 2px;
            background: #ef4444;
            color: white;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 5px;
            border-radius: 10px;
            min-width: 16px;
            text-align: center;
        }

        .notification-panel {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            width: 380px;
            max-height: 600px;
            background: var(--color-black-80);
            border: 1px solid var(--color-white-10);
            border-radius: var(--radius-lg);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition: all 0.2s ease;
            z-index: 1000;
        }

        .notification-panel.open {
            opacity: 1;
            transform: translateY(0);
            pointer-events: all;
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--padding-sm) var(--padding-md);
            border-bottom: 1px solid var(--color-white-10);
        }

        .panel-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--color-white-90);
        }

        .header-actions {
            display: flex;
            gap: var(--space-1);
        }

        .header-btn {
            background: transparent;
            border: none;
            color: var(--color-white-60);
            font-size: 11px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            transition: all 0.2s ease;
        }

        .header-btn:hover {
            background: var(--color-white-10);
            color: var(--color-white-90);
        }

        .filter-tabs {
            display: flex;
            gap: var(--space-1);
            padding: var(--padding-xs) var(--padding-md);
            background: var(--color-black-70);
            border-bottom: 1px solid var(--color-white-10);
        }

        .filter-tab {
            padding: 4px 12px;
            border-radius: var(--radius-sm);
            border: 1px solid transparent;
            background: transparent;
            color: var(--color-white-70);
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .filter-tab:hover {
            background: var(--color-white-10);
            color: var(--color-white-90);
        }

        .filter-tab.active {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: white;
        }

        .notifications-list {
            max-height: 450px;
            overflow-y: auto;
            padding: var(--padding-xs);
        }

        .notification-item {
            padding: var(--padding-sm);
            margin-bottom: var(--margin-xs);
            background: var(--color-black-60);
            border-left: 3px solid;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        }

        .notification-item:hover {
            background: var(--color-black-50);
        }

        .notification-item.unread {
            background: var(--color-black-70);
        }

        .notification-item.priority-critical {
            border-left-color: #dc2626;
        }

        .notification-item.priority-high {
            border-left-color: #f59e0b;
        }

        .notification-item.priority-medium {
            border-left-color: #3b82f6;
        }

        .notification-item.priority-low {
            border-left-color: #6b7280;
        }

        .notification-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: var(--margin-xs);
        }

        .notification-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-white-90);
            line-height: 1.3;
            flex: 1;
        }

        .notification-actions {
            display: flex;
            gap: 4px;
            margin-left: var(--space-2);
        }

        .notification-btn {
            background: transparent;
            border: none;
            color: var(--color-white-50);
            font-size: 12px;
            cursor: pointer;
            padding: 2px 4px;
            border-radius: var(--radius-sm);
            transition: all 0.2s ease;
        }

        .notification-btn:hover {
            background: var(--color-white-10);
            color: var(--color-white-90);
        }

        .notification-body {
            font-size: 12px;
            color: var(--color-white-70);
            line-height: 1.4;
            margin-bottom: var(--margin-xs);
        }

        .notification-meta {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            font-size: 10px;
            color: var(--color-white-50);
        }

        .notification-type {
            padding: 2px 6px;
            border-radius: var(--radius-sm);
            background: var(--color-white-10);
        }

        .notification-time {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .unread-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--color-primary);
        }

        .empty-state {
            text-align: center;
            padding: var(--padding-xl);
            color: var(--color-white-50);
        }

        .empty-icon {
            font-size: 48px;
            opacity: 0.3;
            margin-bottom: var(--margin-sm);
        }

        .empty-text {
            font-size: 13px;
        }

        /* Scrollbar */
        .notifications-list::-webkit-scrollbar {
            width: 6px;
        }

        .notifications-list::-webkit-scrollbar-track {
            background: var(--color-black-80);
        }

        .notifications-list::-webkit-scrollbar-thumb {
            background: var(--color-white-20);
            border-radius: 3px;
        }
    `;

    constructor() {
        super();
        this.notifications = [];
        this.unreadCount = 0;
        this.isOpen = false;
        this.filter = 'all';
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadNotifications();
        this.setupListeners();

        // Close panel when clicking outside
        document.addEventListener('click', this.handleOutsideClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeListeners();
        document.removeEventListener('click', this.handleOutsideClick);
    }

    setupListeners() {
        this.notificationHandler = (notification) => {
            this.notifications = [notification, ...this.notifications];
            this.loadUnreadCount();
            this.requestUpdate();
        };

        this.notificationReadHandler = () => {
            this.loadNotifications();
        };

        this.allReadHandler = () => {
            this.loadNotifications();
        };

        this.notificationClearedHandler = () => {
            this.loadNotifications();
        };

        this.allClearedHandler = () => {
            this.loadNotifications();
        };

        window.api.notifications.onNotification(this.notificationHandler);
        window.api.notifications.onNotificationRead(this.notificationReadHandler);
        window.api.notifications.onAllRead(this.allReadHandler);
        window.api.notifications.onNotificationCleared(this.notificationClearedHandler);
        window.api.notifications.onAllCleared(this.allClearedHandler);
    }

    removeListeners() {
        if (this.notificationHandler) {
            window.api.notifications.removeOnNotification(this.notificationHandler);
        }
        if (this.notificationReadHandler) {
            window.api.notifications.removeOnNotificationRead(this.notificationReadHandler);
        }
        if (this.allReadHandler) {
            window.api.notifications.removeOnAllRead(this.allReadHandler);
        }
        if (this.notificationClearedHandler) {
            window.api.notifications.removeOnNotificationCleared(this.notificationClearedHandler);
        }
        if (this.allClearedHandler) {
            window.api.notifications.removeOnAllCleared(this.allClearedHandler);
        }
    }

    async loadNotifications() {
        try {
            this.notifications = await window.api.notifications.getAll();
            await this.loadUnreadCount();
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    async loadUnreadCount() {
        try {
            this.unreadCount = await window.api.notifications.getUnreadCount();
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    }

    togglePanel(e) {
        e.stopPropagation();
        this.isOpen = !this.isOpen;
    }

    handleOutsideClick = (e) => {
        if (!this.shadowRoot.contains(e.target) && this.isOpen) {
            this.isOpen = false;
            this.requestUpdate();
        }
    }

    setFilter(filter) {
        this.filter = filter;
    }

    async markAllAsRead() {
        try {
            await window.api.notifications.markAllAsRead();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }

    async clearAll() {
        try {
            await window.api.notifications.clearAll();
        } catch (error) {
            console.error('Failed to clear all:', error);
        }
    }

    async handleNotificationClick(notification) {
        if (!notification.read) {
            await window.api.notifications.markAsRead(notification.id);
        }
    }

    async handleClearNotification(e, notificationId) {
        e.stopPropagation();
        try {
            await window.api.notifications.clear(notificationId);
        } catch (error) {
            console.error('Failed to clear notification:', error);
        }
    }

    getFilteredNotifications() {
        if (this.filter === 'unread') {
            return this.notifications.filter(n => !n.read);
        }
        return this.notifications;
    }

    getNotificationIcon(type) {
        const icons = {
            insight: '💡',
            suggestion: '🤖',
            blocker: '⛔',
            deadline: '⏰',
            summary: '📊'
        };
        return icons[type] || '🔔';
    }

    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    render() {
        const filteredNotifications = this.getFilteredNotifications();

        return html`
            <button class="notification-bell" @click="${this.togglePanel}">
                🔔
                ${this.unreadCount > 0 ? html`
                    <span class="unread-badge">${this.unreadCount}</span>
                ` : ''}
            </button>

            <div class="notification-panel ${this.isOpen ? 'open' : ''}">
                <div class="panel-header">
                    <div class="panel-title">Notifications</div>
                    <div class="header-actions">
                        <button class="header-btn" @click="${this.markAllAsRead}">Mark all read</button>
                        <button class="header-btn" @click="${this.clearAll}">Clear all</button>
                    </div>
                </div>

                <div class="filter-tabs">
                    <button
                        class="filter-tab ${this.filter === 'all' ? 'active' : ''}"
                        @click="${() => this.setFilter('all')}">
                        All
                    </button>
                    <button
                        class="filter-tab ${this.filter === 'unread' ? 'active' : ''}"
                        @click="${() => this.setFilter('unread')}">
                        Unread
                    </button>
                </div>

                <div class="notifications-list">
                    ${filteredNotifications.length > 0 ? filteredNotifications.map(notification => this.renderNotification(notification)) : this.renderEmptyState()}
                </div>
            </div>
        `;
    }

    renderNotification(notification) {
        return html`
            <div
                class="notification-item priority-${notification.priority} ${notification.read ? '' : 'unread'}"
                @click="${() => this.handleNotificationClick(notification)}">
                <div class="notification-header">
                    <div class="notification-title">
                        ${this.getNotificationIcon(notification.type)} ${notification.title}
                    </div>
                    <div class="notification-actions">
                        ${!notification.read ? html`
                            <span class="unread-indicator"></span>
                        ` : ''}
                        <button
                            class="notification-btn"
                            @click="${(e) => this.handleClearNotification(e, notification.id)}"
                            title="Clear">
                            ✕
                        </button>
                    </div>
                </div>

                ${notification.body ? html`
                    <div class="notification-body">${notification.body}</div>
                ` : ''}

                <div class="notification-meta">
                    <span class="notification-type">${notification.type}</span>
                    <span class="notification-time">
                        <span>🕐</span>
                        <span>${this.formatTime(notification.timestamp)}</span>
                    </span>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return html`
            <div class="empty-state">
                <div class="empty-icon">🔕</div>
                <div class="empty-text">
                    ${this.filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </div>
            </div>
        `;
    }
}

customElements.define('notification-center', NotificationCenter);
