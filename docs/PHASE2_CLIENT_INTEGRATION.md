# 📱 Phase 2 - Client Integration Guide

How to integrate cloud sync into Lucide Electron app.

## 🎯 Overview

This guide shows how to use the `SyncService` in your Lucide application to enable:
- **Multi-device sync**: Access your data from any device
- **Offline-first**: Works seamlessly offline
- **Automatic sync**: Syncs every 30 seconds
- **Manual sync**: Trigger sync on-demand

---

## 🚀 Quick Start

### 1. Configure Backend URL

Add to your `.env` or config:

```env
LUCIDE_API_URL=http://localhost:3001
```

Or for production:

```env
LUCIDE_API_URL=https://api.lucide.ai
```

### 2. Import SyncService

```javascript
const syncService = require('./features/common/services/syncService');
```

### 3. Start Sync After Login

```javascript
// After successful login/signup
const { user, session } = await authenticateUser(email, password);

// Start automatic sync
await syncService.start(user.id, session.access_token);

console.log('✅ Sync enabled - your data is now syncing to cloud');
```

### 4. Stop Sync on Logout

```javascript
// On logout
syncService.stop();

console.log('🛑 Sync stopped');
```

---

## 📋 Complete Integration Example

### In Your Auth Flow

```javascript
// src/features/auth/authService.js

const syncService = require('../common/services/syncService');

class AuthService {
    async login(email, password) {
        try {
            // Call backend auth
            const response = await fetch(`${process.env.LUCIDE_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const { user, session, accessToken } = await response.json();

            // Store token locally (encrypted storage recommended)
            await this.storeAuthToken(accessToken);

            // Start cloud sync
            await syncService.start(user.id, accessToken);

            console.log('[Auth] ✅ Logged in and sync started');

            return { user, session };
        } catch (error) {
            console.error('[Auth] Login error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            // Stop sync first
            syncService.stop();

            // Call backend logout
            const token = await this.getAuthToken();
            await fetch(`${process.env.LUCIDE_API_URL}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Clear local token
            await this.clearAuthToken();

            console.log('[Auth] ✅ Logged out');
        } catch (error) {
            console.error('[Auth] Logout error:', error);
        }
    }

    async signup(email, password, displayName) {
        try {
            const response = await fetch(`${process.env.LUCIDE_API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, displayName })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Signup failed');
            }

            const { user, session } = await response.json();

            // Store token and start sync
            await this.storeAuthToken(session.access_token);
            await syncService.start(user.id, session.access_token);

            return { user, session };
        } catch (error) {
            console.error('[Auth] Signup error:', error);
            throw error;
        }
    }
}
```

---

## 🔄 Manual Sync

Trigger manual sync (e.g., on button click):

```javascript
// In your UI component
async function handleSyncButton() {
    try {
        const result = await syncService.syncNow();

        if (result.success) {
            showNotification('✅ Sync completed', {
                pushed: result.pushed.totalPushed,
                pulled: result.pulled.totalPulled
            });
        } else {
            showNotification('❌ Sync failed: ' + result.error);
        }
    } catch (error) {
        console.error('Manual sync error:', error);
        showNotification('❌ Sync error');
    }
}
```

---

## 📊 Show Sync Status

Display sync status in your UI:

```javascript
// Get sync statistics
const stats = syncService.getStats();

console.log('Sync Stats:', {
    isEnabled: stats.isEnabled,        // true/false
    isOnline: stats.isOnline,          // true/false
    isSyncing: stats.isSyncing,        // true/false
    lastSyncTime: stats.lastSyncTime,  // timestamp
    lastSyncAgo: stats.lastSyncAgo,    // milliseconds
    totalSyncs: stats.totalSyncs,
    successfulSyncs: stats.successfulSyncs,
    failedSyncs: stats.failedSyncs
});

// Example UI component
function SyncStatusIndicator() {
    const stats = syncService.getStats();

    return (
        <div className="sync-status">
            {stats.isSyncing && <Spinner />}
            {!stats.isOnline && <OfflineIcon />}

            <span>
                Last synced: {formatTimeAgo(stats.lastSyncAgo)}
            </span>

            <button onClick={handleSyncButton}>
                Sync Now
            </button>
        </div>
    );
}
```

---

## 🔔 Listen to Sync Events

```javascript
// Custom event emitter (add to SyncService if needed)
syncService.on('sync:start', () => {
    console.log('🔄 Sync started');
    updateUI({ syncing: true });
});

syncService.on('sync:complete', (result) => {
    console.log('✅ Sync completed', result);
    updateUI({ syncing: false, lastSync: Date.now() });
});

syncService.on('sync:error', (error) => {
    console.error('❌ Sync error', error);
    updateUI({ syncing: false, error });
});

syncService.on('offline', () => {
    console.log('📴 Device offline - sync paused');
    showNotification('You are offline. Changes will sync when online.');
});

syncService.on('online', () => {
    console.log('🌐 Device online - resuming sync');
    showNotification('Back online! Syncing...');
});
```

---

## 🛠️ Advanced Configuration

### Custom Sync Interval

```javascript
// Change sync interval to 60 seconds
syncService.config.syncIntervalMs = 60000;

// Restart sync with new interval
syncService.stop();
await syncService.start(userId, authToken);
```

### Retry Configuration

```javascript
// Configure retry attempts and delay
syncService.config.retryAttempts = 5;
syncService.config.retryDelayMs = 3000; // 3 seconds
```

### API URL Configuration

```javascript
// Use different backend URL
syncService.config.apiUrl = 'https://api-eu.lucide.ai';
```

---

## 🔐 Token Refresh

When your access token expires, refresh it and update SyncService:

```javascript
async function refreshAuthToken() {
    try {
        const refreshToken = await getStoredRefreshToken();

        const response = await fetch(`${process.env.LUCIDE_API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        const { session } = await response.json();

        // Update SyncService with new token
        syncService.updateAuthToken(session.access_token);

        // Store new token
        await storeAuthToken(session.access_token);

        console.log('[Auth] Token refreshed');
    } catch (error) {
        console.error('[Auth] Token refresh failed:', error);
        // Handle error (e.g., force re-login)
    }
}

// Refresh token before expiration (e.g., every 6 hours)
setInterval(refreshAuthToken, 6 * 60 * 60 * 1000);
```

---

## 🧪 Testing Sync

### Test Offline Functionality

```javascript
// Simulate offline mode
window.dispatchEvent(new Event('offline'));

// Make changes locally
await createSession({ title: 'Offline Session' });

// Simulate coming back online
window.dispatchEvent(new Event('online'));

// Sync should automatically trigger
// Verify data appears in cloud (check Supabase dashboard)
```

### Test Multi-Device Sync

1. **Device A**: Create a session
2. Wait for sync (30s or manual)
3. **Device B**: Login with same account
4. Verify session appears on Device B
5. **Device B**: Modify session
6. **Device A**: Verify changes appear

---

## 📝 Database Schema Changes

When adding sync to existing tables:

1. **Add `sync_state` column:**
```sql
ALTER TABLE your_table ADD COLUMN sync_state TEXT DEFAULT 'clean';
```

2. **Mark records as dirty on UPDATE:**
```javascript
db.prepare(`
    UPDATE your_table
    SET field = ?, sync_state = 'dirty'
    WHERE id = ?
`).run(newValue, id);
```

3. **Mark records as dirty on INSERT:**
```javascript
db.prepare(`
    INSERT INTO your_table (id, field, sync_state)
    VALUES (?, ?, 'dirty')
`).run(id, value);
```

---

## 🐛 Troubleshooting

### Sync Not Working

**Check authentication:**
```javascript
const stats = syncService.getStats();
console.log('Sync enabled?', stats.isEnabled);
console.log('Token exists?', !!syncService.authToken);
```

**Check connectivity:**
```javascript
console.log('Online?', stats.isOnline);
console.log('Backend reachable?', await checkBackendHealth());
```

**Check for errors:**
```javascript
const stats = syncService.getStats();
console.log('Last error:', stats.lastError);
console.log('Failed syncs:', stats.failedSyncs);
```

### Conflicts and Data Loss

The current implementation uses **last-write-wins** strategy:
- Latest timestamp wins
- No conflict resolution UI (future enhancement)
- Generally safe for single-user scenarios

For production multi-user scenarios, consider:
- Operational Transformation (OT)
- Conflict-free Replicated Data Types (CRDTs)
- User-facing conflict resolution UI

---

## 🎨 UI Integration Examples

### Sync Button Component (React)

```jsx
import { useState, useEffect } from 'react';
const syncService = require('../services/syncService');

function SyncButton() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncService.syncNow();
            if (result.success) {
                setLastSync(Date.now());
            }
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const stats = syncService.getStats();
            setLastSync(stats.lastSyncTime);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? '⏳ Syncing...' : '🔄 Sync'}
            {lastSync && (
                <span className="last-sync">
                    {formatTimeAgo(Date.now() - lastSync)}
                </span>
            )}
        </button>
    );
}
```

### Offline Indicator

```jsx
function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="offline-banner">
            📴 You are offline. Changes will sync when online.
        </div>
    );
}
```

---

## 📚 Next Steps

1. ✅ Integrate SyncService into your auth flow
2. ✅ Add UI indicators for sync status
3. ✅ Test offline functionality
4. ✅ Test multi-device sync
5. ⏭️ Move to Phase 3: API Gateway for enterprise databases

---

## 🤝 Support

Questions? Issues?
- Check the [Backend README](../lucide-backend/README.md)
- See [Supabase docs](https://supabase.com/docs)
- Open a [GitHub issue](https://github.com/roblucci9302/Lucide-101214/issues)

---

Built with ❤️ for seamless multi-device experiences
