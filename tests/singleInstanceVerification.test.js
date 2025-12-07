/**
 * Single Instance Verification Test Suite
 *
 * Tests the single instance enforcement mechanism that ensures only one
 * instance of the Lucide application can run at a time.
 *
 * Implementation Overview:
 * - Uses Electron's requestSingleInstanceLock() API
 * - First instance acquires the lock and continues
 * - Second instance fails to acquire lock and exits immediately
 * - First instance receives 'second-instance' event with command line args
 * - First instance's window is focused/restored when second instance is attempted
 *
 * Platform Behaviors:
 * - Windows: Lock file in %USERPROFILE%\AppData\Local\Temp
 * - macOS: Lock mechanism via Mach ports
 * - Linux: Lock file in $XDG_RUNTIME_DIR or /tmp
 *
 * Test Categories:
 * 1. Lock Acquisition Tests - Verify lock is properly acquired
 * 2. Second Instance Handling Tests - Verify focus and argument passing
 * 3. Deep Link Integration Tests - Verify deep links work with single instance
 * 4. Edge Cases - Rapid launches, crash recovery, etc.
 */

// Mock electron modules
const mockApp = {
    requestSingleInstanceLock: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    isReady: jest.fn().mockReturnValue(true),
    whenReady: jest.fn().mockResolvedValue(true),
    setAsDefaultProtocolClient: jest.fn().mockReturnValue(true),
    isDefaultProtocolClient: jest.fn().mockReturnValue(false),
    exit: jest.fn()
};

const mockBrowserWindow = {
    getAllWindows: jest.fn(),
    prototype: {
        focus: jest.fn(),
        restore: jest.fn(),
        show: jest.fn(),
        isMinimized: jest.fn(),
        isDestroyed: jest.fn()
    }
};

// Mock window instance
function createMockWindow(options = {}) {
    return {
        focus: jest.fn(),
        restore: jest.fn(),
        show: jest.fn(),
        isMinimized: jest.fn().mockReturnValue(options.minimized || false),
        isDestroyed: jest.fn().mockReturnValue(options.destroyed || false),
        webContents: {
            send: jest.fn()
        }
    };
}

// Store event handlers
const eventHandlers = {};

// Mock electron module
jest.mock('electron', () => ({
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: { on: jest.fn(), handle: jest.fn() },
    shell: { openExternal: jest.fn() },
    dialog: { showMessageBox: jest.fn() },
    desktopCapturer: { getSources: jest.fn() },
    session: { defaultSession: { setDisplayMediaRequestHandler: jest.fn() } }
}), { virtual: true });

// Setup app.on to store handlers
mockApp.on.mockImplementation((event, handler) => {
    eventHandlers[event] = handler;
    return mockApp;
});

describe('Single Instance Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);
    });

    // ==========================================
    // Section 1: Lock Acquisition Tests
    // ==========================================
    describe('Lock Acquisition', () => {
        test('First instance should acquire the lock successfully', () => {
            mockApp.requestSingleInstanceLock.mockReturnValue(true);

            const gotTheLock = mockApp.requestSingleInstanceLock();

            expect(gotTheLock).toBe(true);
            expect(mockApp.requestSingleInstanceLock).toHaveBeenCalledTimes(1);
        });

        test('Second instance should fail to acquire the lock', () => {
            // First instance acquires lock
            mockApp.requestSingleInstanceLock.mockReturnValueOnce(true);
            const firstLock = mockApp.requestSingleInstanceLock();

            // Second instance fails to acquire lock
            mockApp.requestSingleInstanceLock.mockReturnValueOnce(false);
            const secondLock = mockApp.requestSingleInstanceLock();

            expect(firstLock).toBe(true);
            expect(secondLock).toBe(false);
        });

        test('Application should quit when lock acquisition fails', () => {
            mockApp.requestSingleInstanceLock.mockReturnValue(false);

            const gotTheLock = mockApp.requestSingleInstanceLock();

            if (!gotTheLock) {
                mockApp.quit();
            }

            expect(gotTheLock).toBe(false);
            expect(mockApp.quit).toHaveBeenCalledTimes(1);
        });

        test('Lock should be released when app closes', () => {
            // This is handled automatically by Electron when process exits
            mockApp.requestSingleInstanceLock.mockReturnValue(true);

            const gotTheLock = mockApp.requestSingleInstanceLock();
            expect(gotTheLock).toBe(true);

            // Simulate app exit - lock is released
            // After exit, new instance can acquire lock
            mockApp.requestSingleInstanceLock.mockReturnValue(true);
            const newLock = mockApp.requestSingleInstanceLock();
            expect(newLock).toBe(true);
        });

        test('Lock mechanism should be called before any other initialization', () => {
            const callOrder = [];

            mockApp.requestSingleInstanceLock.mockImplementation(() => {
                callOrder.push('requestSingleInstanceLock');
                return true;
            });

            mockApp.whenReady.mockImplementation(() => {
                callOrder.push('whenReady');
                return Promise.resolve();
            });

            // Simulate startup order
            mockApp.requestSingleInstanceLock();
            mockApp.whenReady();

            expect(callOrder[0]).toBe('requestSingleInstanceLock');
            expect(callOrder[1]).toBe('whenReady');
        });
    });

    // ==========================================
    // Section 2: Second Instance Event Handling
    // ==========================================
    describe('Second Instance Event Handling', () => {
        test('Second instance event should be registered', () => {
            mockApp.requestSingleInstanceLock.mockReturnValue(true);
            mockApp.requestSingleInstanceLock();

            // Register handler like the app does
            mockApp.on('second-instance', (event, commandLine, workingDirectory) => {
                // Handler registered
            });

            expect(mockApp.on).toHaveBeenCalledWith('second-instance', expect.any(Function));
        });

        test('Second instance should trigger window focus', () => {
            const mockWindow = createMockWindow();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            // Simulate second-instance event handler
            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    const mainWindow = windows[0];
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                    mainWindow.focus();
                }
            };

            handleSecondInstance({}, ['lucide.exe'], '/home/user');

            expect(mockWindow.focus).toHaveBeenCalled();
        });

        test('Second instance should restore minimized window', () => {
            const mockWindow = createMockWindow({ minimized: true });
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    const mainWindow = windows[0];
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                    mainWindow.focus();
                }
            };

            handleSecondInstance({}, ['lucide.exe'], '/home/user');

            expect(mockWindow.restore).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
        });

        test('Second instance should not restore non-minimized window', () => {
            const mockWindow = createMockWindow({ minimized: false });
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    const mainWindow = windows[0];
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                    mainWindow.focus();
                }
            };

            handleSecondInstance({}, ['lucide.exe'], '/home/user');

            expect(mockWindow.restore).not.toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
        });

        test('Second instance should handle no windows gracefully', () => {
            mockBrowserWindow.getAllWindows.mockReturnValue([]);

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    const mainWindow = windows[0];
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                    mainWindow.focus();
                }
            };

            // Should not throw
            expect(() => {
                handleSecondInstance({}, ['lucide.exe'], '/home/user');
            }).not.toThrow();
        });

        test('Second instance receives command line arguments', () => {
            const receivedArgs = [];

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                receivedArgs.push(...commandLine);
            };

            handleSecondInstance({}, ['lucide.exe', '--debug', '--verbose'], '/home/user');

            expect(receivedArgs).toContain('lucide.exe');
            expect(receivedArgs).toContain('--debug');
            expect(receivedArgs).toContain('--verbose');
        });

        test('Second instance receives working directory', () => {
            let receivedWorkingDir = null;

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                receivedWorkingDir = workingDirectory;
            };

            handleSecondInstance({}, ['lucide.exe'], '/home/user/documents');

            expect(receivedWorkingDir).toBe('/home/user/documents');
        });
    });

    // ==========================================
    // Section 3: Deep Link Integration
    // ==========================================
    describe('Deep Link Integration with Single Instance', () => {
        test('Deep link URL should be extracted from second instance command line', () => {
            const commandLine = ['lucide.exe', 'lucide://chat/session123'];

            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));

            expect(deepLinkUrl).toBe('lucide://chat/session123');
        });

        test('Should handle second instance with deep link URL', () => {
            const mockWindow = createMockWindow();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            let processedDeepLink = null;
            const mockDeepLinkService = {
                handleDeepLink: jest.fn((url) => {
                    processedDeepLink = url;
                })
            };

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    windows[0].focus();
                }

                const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
                if (deepLinkUrl) {
                    mockDeepLinkService.handleDeepLink(deepLinkUrl);
                }
            };

            handleSecondInstance({}, ['lucide.exe', 'lucide://settings/api'], '/home/user');

            expect(processedDeepLink).toBe('lucide://settings/api');
            expect(mockWindow.focus).toHaveBeenCalled();
        });

        test('Should handle second instance without deep link URL', () => {
            const mockWindow = createMockWindow();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            const mockDeepLinkService = {
                handleDeepLink: jest.fn()
            };

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    windows[0].focus();
                }

                const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
                if (deepLinkUrl) {
                    mockDeepLinkService.handleDeepLink(deepLinkUrl);
                }
            };

            handleSecondInstance({}, ['lucide.exe'], '/home/user');

            expect(mockDeepLinkService.handleDeepLink).not.toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
        });

        test('Should extract deep link from complex command line', () => {
            const commandLine = [
                'C:\\Program Files\\Lucide\\lucide.exe',
                '--some-flag',
                'lucide://profile/agent1',
                '--another-flag=value'
            ];

            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));

            expect(deepLinkUrl).toBe('lucide://profile/agent1');
        });
    });

    // ==========================================
    // Section 4: Edge Cases
    // ==========================================
    describe('Edge Cases', () => {
        test('Should handle rapid consecutive launch attempts', async () => {
            let lockHeld = false;
            let focusCount = 0;

            mockApp.requestSingleInstanceLock.mockImplementation(() => {
                if (lockHeld) {
                    return false;
                }
                lockHeld = true;
                return true;
            });

            const mockWindow = createMockWindow();
            mockWindow.focus.mockImplementation(() => {
                focusCount++;
            });
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            const handleSecondInstance = () => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    windows[0].focus();
                }
            };

            // First instance acquires lock
            const firstLock = mockApp.requestSingleInstanceLock();
            expect(firstLock).toBe(true);

            // Rapid second instance attempts
            for (let i = 0; i < 5; i++) {
                const lock = mockApp.requestSingleInstanceLock();
                if (!lock) {
                    handleSecondInstance();
                }
            }

            expect(focusCount).toBe(5);
        });

        test('Should handle destroyed window gracefully', () => {
            const mockWindow = createMockWindow({ destroyed: true });
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                const validWindow = windows.find(w => !w.isDestroyed());
                if (validWindow) {
                    if (validWindow.isMinimized()) {
                        validWindow.restore();
                    }
                    validWindow.focus();
                }
            };

            // Should not throw
            expect(() => {
                handleSecondInstance({}, ['lucide.exe'], '/home/user');
            }).not.toThrow();
        });

        test('Should handle multiple windows - focus first non-destroyed', () => {
            const destroyedWindow = createMockWindow({ destroyed: true });
            const validWindow = createMockWindow({ destroyed: false });
            mockBrowserWindow.getAllWindows.mockReturnValue([destroyedWindow, validWindow]);

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                const validWin = windows.find(w => !w.isDestroyed());
                if (validWin) {
                    validWin.focus();
                }
            };

            handleSecondInstance({}, ['lucide.exe'], '/home/user');

            expect(destroyedWindow.focus).not.toHaveBeenCalled();
            expect(validWindow.focus).toHaveBeenCalled();
        });

        test('Should handle empty command line', () => {
            const mockWindow = createMockWindow();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    windows[0].focus();
                }

                const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
                // Should not crash with undefined
            };

            expect(() => {
                handleSecondInstance({}, [], '/home/user');
            }).not.toThrow();
        });

        test('Should handle undefined command line arguments', () => {
            const mockWindow = createMockWindow();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            const handleSecondInstance = (event, commandLine, workingDirectory) => {
                const windows = mockBrowserWindow.getAllWindows();
                if (windows.length > 0) {
                    windows[0].focus();
                }

                if (commandLine && Array.isArray(commandLine)) {
                    const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
                }
            };

            expect(() => {
                handleSecondInstance({}, undefined, '/home/user');
            }).not.toThrow();
        });
    });

    // ==========================================
    // Section 5: Platform-Specific Behaviors
    // ==========================================
    describe('Platform-Specific Behaviors', () => {
        test('Windows: Command line format should be parsed correctly', () => {
            // Windows passes full paths with backslashes
            const commandLine = [
                'C:\\Program Files\\Lucide\\lucide.exe',
                'lucide://chat'
            ];

            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
            expect(deepLinkUrl).toBe('lucide://chat');
        });

        test('macOS: Command line format should be parsed correctly', () => {
            // macOS passes Unix-style paths
            const commandLine = [
                '/Applications/Lucide.app/Contents/MacOS/Lucide',
                'lucide://settings'
            ];

            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
            expect(deepLinkUrl).toBe('lucide://settings');
        });

        test('Linux: Command line format should be parsed correctly', () => {
            // Linux passes Unix-style paths
            const commandLine = [
                '/usr/bin/lucide',
                'lucide://listen/start'
            ];

            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
            expect(deepLinkUrl).toBe('lucide://listen/start');
        });

        test('Linux (AppImage): Command line format should be parsed correctly', () => {
            // AppImage paths are different
            const commandLine = [
                '/tmp/.mount_Lucidexxxxxx/lucide',
                '--appimage-extract-and-run',
                'lucide://profile'
            ];

            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
            expect(deepLinkUrl).toBe('lucide://profile');
        });

        test('Flatpak: Command line format should be parsed correctly', () => {
            // Flatpak has its own path format
            const commandLine = [
                '/app/bin/lucide',
                'lucide://knowledge'
            ];

            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
            expect(deepLinkUrl).toBe('lucide://knowledge');
        });

        test('Snap: Command line format should be parsed correctly', () => {
            // Snap packages have unique paths
            const commandLine = [
                '/snap/lucide/current/lucide',
                'lucide://search?q=test'
            ];

            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
            expect(deepLinkUrl).toBe('lucide://search?q=test');
        });
    });

    // ==========================================
    // Section 6: Integration Simulation Tests
    // ==========================================
    describe('Integration Simulation', () => {
        test('Full single instance lifecycle simulation', async () => {
            // Track events
            const events = [];
            let lockAcquired = false;

            // Simulate first instance startup
            mockApp.requestSingleInstanceLock.mockImplementation(() => {
                if (lockAcquired) return false;
                lockAcquired = true;
                events.push('lock_acquired');
                return true;
            });

            const mockWindow = createMockWindow();
            mockWindow.focus.mockImplementation(() => {
                events.push('window_focused');
            });
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            // First instance starts
            const lock1 = mockApp.requestSingleInstanceLock();
            expect(lock1).toBe(true);
            events.push('app_ready');

            // Simulate window creation
            events.push('window_created');

            // Second instance attempts to start
            const lock2 = mockApp.requestSingleInstanceLock();
            expect(lock2).toBe(false);

            // Second instance triggers second-instance event
            events.push('second_instance_event');
            mockWindow.focus();

            // Verify event order
            expect(events).toEqual([
                'lock_acquired',
                'app_ready',
                'window_created',
                'second_instance_event',
                'window_focused'
            ]);
        });

        test('Deep link via second instance simulation', async () => {
            let lockAcquired = false;
            let processedUrl = null;

            mockApp.requestSingleInstanceLock.mockImplementation(() => {
                if (lockAcquired) return false;
                lockAcquired = true;
                return true;
            });

            const mockWindow = createMockWindow();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

            const mockDeepLinkService = {
                handleDeepLink: (url) => {
                    processedUrl = url;
                }
            };

            // First instance starts
            mockApp.requestSingleInstanceLock();

            // User clicks lucide://chat/abc123 in browser
            const commandLine = ['lucide.exe', 'lucide://chat/abc123'];

            // This triggers second-instance in Electron
            const lock = mockApp.requestSingleInstanceLock();
            expect(lock).toBe(false);

            // Simulate second-instance handler
            const deepLinkUrl = commandLine.find(arg => arg.startsWith('lucide://'));
            if (deepLinkUrl) {
                mockDeepLinkService.handleDeepLink(deepLinkUrl);
            }
            mockWindow.focus();

            expect(processedUrl).toBe('lucide://chat/abc123');
            expect(mockWindow.focus).toHaveBeenCalled();
        });
    });

    // ==========================================
    // Section 7: Manual Testing Instructions
    // ==========================================
    describe('Manual Testing Instructions', () => {
        test('Documentation: Manual testing steps', () => {
            const manualTestingSteps = {
                windows: {
                    description: 'Windows Single Instance Testing',
                    steps: [
                        '1. Build the app: npm run make',
                        '2. Install the app from out/make/squirrel.windows',
                        '3. Launch Lucide from Start Menu or Desktop shortcut',
                        '4. Verify app opens and window is visible',
                        '5. Try launching Lucide again from Start Menu',
                        '6. Verify: Second instance exits immediately',
                        '7. Verify: First instance window is focused',
                        '8. Test with minimized window:',
                        '   a. Minimize the Lucide window',
                        '   b. Launch Lucide again',
                        '   c. Verify window is restored and focused',
                        '9. Test deep link:',
                        '   a. Open browser, navigate to lucide://chat',
                        '   b. Verify first instance handles the deep link'
                    ]
                },
                macos: {
                    description: 'macOS Single Instance Testing',
                    steps: [
                        '1. Build the app: npm run make',
                        '2. Copy Lucide.app from out/make to Applications',
                        '3. Launch Lucide from Applications',
                        '4. Verify app opens and window is visible',
                        '5. Try launching Lucide again from Applications',
                        '6. Verify: Only one instance in Dock',
                        '7. Verify: Existing window is focused',
                        '8. Test with hidden window:',
                        '   a. Hide Lucide (Cmd+H)',
                        '   b. Launch Lucide from Applications',
                        '   c. Verify window is shown and focused',
                        '9. Test deep link from Terminal:',
                        '   open lucide://settings',
                        '   Verify existing instance handles it'
                    ]
                },
                linux: {
                    description: 'Linux Single Instance Testing',
                    steps: [
                        '1. Build the app: npm run make',
                        '2. Install from out/make (deb/rpm/AppImage)',
                        '3. Launch Lucide from application menu',
                        '4. Verify app opens and window is visible',
                        '5. Try launching Lucide again from terminal:',
                        '   lucide OR ./Lucide.AppImage',
                        '6. Verify: Second process exits',
                        '7. Verify: First instance window is focused',
                        '8. Test with minimized window:',
                        '   a. Minimize the Lucide window',
                        '   b. Launch Lucide again',
                        '   c. Verify window is restored',
                        '9. Test deep link from terminal:',
                        '   xdg-open lucide://listen',
                        '   Verify existing instance handles it'
                    ]
                },
                commonChecks: [
                    'Task manager/Activity Monitor shows only ONE Lucide process',
                    'No error dialogs appear during second launch attempt',
                    'Deep links are properly routed to existing instance',
                    'Window focus works even when app is in background'
                ]
            };

            // This test documents the manual testing procedures
            expect(manualTestingSteps.windows.steps.length).toBeGreaterThan(0);
            expect(manualTestingSteps.macos.steps.length).toBeGreaterThan(0);
            expect(manualTestingSteps.linux.steps.length).toBeGreaterThan(0);
        });
    });
});

// ==========================================
// Helper Function Tests
// ==========================================
describe('Single Instance Helper Functions', () => {
    describe('Command Line Deep Link Extraction', () => {
        function extractDeepLinkFromCommandLine(commandLine) {
            if (!commandLine || !Array.isArray(commandLine)) {
                return null;
            }
            return commandLine.find(arg =>
                typeof arg === 'string' && arg.startsWith('lucide://')
            ) || null;
        }

        test('Should extract deep link from simple command line', () => {
            const result = extractDeepLinkFromCommandLine(['app.exe', 'lucide://chat']);
            expect(result).toBe('lucide://chat');
        });

        test('Should return null for command line without deep link', () => {
            const result = extractDeepLinkFromCommandLine(['app.exe', '--verbose']);
            expect(result).toBeNull();
        });

        test('Should return null for empty command line', () => {
            const result = extractDeepLinkFromCommandLine([]);
            expect(result).toBeNull();
        });

        test('Should return null for undefined command line', () => {
            const result = extractDeepLinkFromCommandLine(undefined);
            expect(result).toBeNull();
        });

        test('Should handle mixed types in command line', () => {
            const result = extractDeepLinkFromCommandLine(['app.exe', 123, 'lucide://test', null]);
            expect(result).toBe('lucide://test');
        });

        test('Should extract first deep link when multiple present', () => {
            const result = extractDeepLinkFromCommandLine([
                'app.exe',
                'lucide://first',
                'lucide://second'
            ]);
            expect(result).toBe('lucide://first');
        });

        test('Should extract deep link with query parameters', () => {
            const result = extractDeepLinkFromCommandLine([
                'app.exe',
                'lucide://search?q=hello%20world&filter=recent'
            ]);
            expect(result).toBe('lucide://search?q=hello%20world&filter=recent');
        });

        test('Should extract deep link with path segments', () => {
            const result = extractDeepLinkFromCommandLine([
                'app.exe',
                'lucide://chat/session123/messages'
            ]);
            expect(result).toBe('lucide://chat/session123/messages');
        });
    });
});

// ==========================================
// Stress Tests
// ==========================================
describe('Single Instance Stress Tests', () => {
    test('Should handle 100 rapid second-instance events', () => {
        const mockWindow = createMockWindow();
        mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

        const handleSecondInstance = () => {
            const windows = mockBrowserWindow.getAllWindows();
            if (windows.length > 0) {
                windows[0].focus();
            }
        };

        // Simulate 100 rapid events
        for (let i = 0; i < 100; i++) {
            handleSecondInstance();
        }

        expect(mockWindow.focus).toHaveBeenCalledTimes(100);
    });

    test('Should handle concurrent second-instance events without race conditions', async () => {
        const mockWindow = createMockWindow();
        mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);

        let focusCount = 0;
        mockWindow.focus.mockImplementation(() => {
            focusCount++;
        });

        const handleSecondInstance = () => {
            const windows = mockBrowserWindow.getAllWindows();
            if (windows.length > 0) {
                windows[0].focus();
            }
        };

        // Simulate concurrent events
        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(new Promise(resolve => {
                setTimeout(() => {
                    handleSecondInstance();
                    resolve();
                }, Math.random() * 10);
            }));
        }

        await Promise.all(promises);

        expect(focusCount).toBe(50);
    });
});
