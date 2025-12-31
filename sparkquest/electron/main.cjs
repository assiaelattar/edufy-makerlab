const { app, BrowserWindow, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// NOTE: Firebase Admin disabled for now - React app handles cloud config
// const admin = require('firebase-admin');
// let db = null;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    let mainWindow;
    let appConfig = {
        kioskMode: false,
        fullscreen: false,
        showFrame: true,
        autoStart: false
    };

    const isDev = !app.isPackaged;

    // Load configuration from local file
    // Cloud config is handled by React app on startup
    const loadConfig = () => {
        try {
            const configPath = path.join(__dirname, 'config.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                appConfig = { ...appConfig, ...JSON.parse(configData) };
                console.log('Loaded config:', appConfig);
            }
        } catch (err) {
            console.error('Error loading config:', err);
        }
    };

    // Save configuration
    const saveConfig = (newConfig) => {
        try {
            const configPath = path.join(__dirname, 'config.json');
            const fs = require('fs');
            appConfig = { ...appConfig, ...newConfig };
            fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
            console.log('Saved config:', appConfig);
            return true;
        } catch (err) {
            console.error('Error saving config:', err);
            return false;
        }
    };

    // --- GLOBAL SHORTCUTS (Disable DevTools) ---
    const { globalShortcut } = require('electron');

    const registerGlobalShortcuts = () => {
        // Block F12
        globalShortcut.register('F12', () => {
            console.log('F12 is disabled');
        });
        // Block CommandOrControl+Shift+I
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            console.log('DevTools shortcut is disabled');
        });
    };

    const createWindow = () => {
        // Load config before creating window
        loadConfig();
        registerGlobalShortcuts();

        // get massive screen size for kiosk
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;

        // Kiosk mode should always disable frame
        const shouldShowFrame = appConfig.kioskMode ? false : appConfig.showFrame;

        mainWindow = new BrowserWindow({
            width,
            height,
            kiosk: appConfig.kioskMode,
            fullscreen: appConfig.fullscreen,
            frame: shouldShowFrame,
            title: "SparkQuest Studio",
            icon: path.join(__dirname, isDev ? '../public/icon.png' : '../dist/icon.png'),
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                nodeIntegration: false, // Security best practice
                contextIsolation: true,
                webviewTag: true, // Enable <webview> for robust session handling
                devTools: isDev // Disable DevTools in production
            },
        });

        // Handle environment (Dev vs Prod)
        // In Dev: Load localhost (checking !app.isPackaged is more reliable than NODE_ENV)
        // In Prod: Load built index.html
        const startUrl = isDev
            ? 'http://localhost:3000'
            : path.join(__dirname, '../dist/index.html');

        console.log("Loading URL/File:", startUrl);

        if (isDev) {
            mainWindow.loadURL(startUrl);
        } else {
            mainWindow.loadFile(startUrl);
        }

        // DEBUG: Force DevTools in Production to diagnose White Screen - DISABLED FOR PROD NOW
        console.log("Starting SparkQuest Studio");
        if (isDev) {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        }

        // --- FOCUS TRACKING (Anti-Cheat / Focus Mode) ---
        mainWindow.on('blur', () => {
            console.log('Student lost focus (Alt-Tab detected)');
            // Send event to React App (Renderer)
            mainWindow.webContents.send('app-focus-change', { focused: false });
        });

        mainWindow.on('focus', () => {
            console.log('Student returned to app');
            mainWindow.webContents.send('app-focus-change', { focused: true });
        });

        // Prevent new windows (security) but allow external links in system browser
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('http:') || url.startsWith('https:')) {
                require('electron').shell.openExternal(url);
            }
            return { action: 'deny' };
        });

        // --- CONFIG MANAGEMENT ---
        const { ipcMain } = require('electron');

        // Get current config
        ipcMain.handle('get-config', () => {
            return appConfig;
        });

        // Update config
        ipcMain.handle('update-config', (event, newConfig) => {
            const success = saveConfig(newConfig);
            if (success) {
                // Notify that restart is needed for some settings
                return { success: true, requiresRestart: true };
            }
            return { success: false };
        });

        // --- SESSION CONTROL (BrowserView) ---
        const { BrowserView } = require('electron');
        let sessionView = null;

        ipcMain.on('start-session', (event, url) => {
            if (sessionView) {
                // If a session is already running, just load the new URL
                sessionView.webContents.loadURL(url);
                sessionView.webContents.focus();
                return;
            }

            console.log("Starting Session with URL:", url);
            sessionView = new BrowserView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                }
            });

            mainWindow.setBrowserView(sessionView);

            // Set bounds: Leave 60px at the top for the React "Control Bar"
            // Use getContentSize to get dimensions WITHOUT the window frame/borders
            const [width, height] = mainWindow.getContentSize();
            console.log(`[Main] Setting Session View Bounds: x=0, y=60, w=${width}, h=${height - 60}`);

            sessionView.setBounds({ x: 0, y: 60, width: width, height: height - 60 });

            // Adjust resize options to maintain the top margin
            sessionView.setAutoResize({ width: true, height: true });

            sessionView.webContents.loadURL(url);
            sessionView.webContents.focus();
        });

        // Ensure view resizes correctly when window resizes
        mainWindow.on('resize', () => {
            if (sessionView) {
                const [w, h] = mainWindow.getContentSize();
                sessionView.setBounds({ x: 0, y: 60, width: w, height: h - 60 });
            }
        });

        ipcMain.on('session-control', (event, action) => {
            if (!sessionView) return;
            const wc = sessionView.webContents;
            if (action === 'zoom-in') wc.setZoomLevel(wc.getZoomLevel() + 0.5);
            if (action === 'zoom-out') wc.setZoomLevel(wc.getZoomLevel() - 0.5);
            if (action === 'zoom-reset') wc.setZoomLevel(0);
            if (action === 'devtools') wc.openDevTools({ mode: 'detach' });
            if (action === 'focus') wc.focus();
        });

        ipcMain.handle('capture-session', async () => {
            if (!sessionView) return null;
            try {
                // Capture the visible page
                const image = await sessionView.webContents.capturePage();
                // Return base64 data URL
                return image.toDataURL();
            } catch (err) {
                console.error("Screenshot failed:", err);
                return null;
            }
        });

        ipcMain.handle('shutdown-system', () => {
            console.log("⚠️ SYSTEM SHUTDOWN TRIGGERED");

            if (!app.isPackaged) {
                console.log("🛑 DEV MODE: Preventing actual shutdown.");
                const { dialog } = require('electron');
                dialog.showMessageBox(mainWindow, {
                    type: 'warning',
                    title: 'System Shutdown Triggered',
                    message: 'In PRODUCTION, the computer would shut down now!\n\n(Saved you from restarting your dev machine 😉)',
                    buttons: ['OK']
                });
                return;
            }

            const { exec } = require('child_process');
            // Windows shutdown command
            exec('shutdown /s /t 0');
        });

        ipcMain.handle('bw-focus', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
                mainWindow.setAlwaysOnTop(true);
                setTimeout(() => mainWindow.setAlwaysOnTop(false), 500); // Flash on top check
            }
        });

    };

    // --- AUTO UPDATER ---
    const setupAutoUpdater = () => {
        autoUpdater.logger = require("electron-log");
        if (autoUpdater.logger) {
            autoUpdater.logger.transports.file.level = "info";
        }

        console.log("Checking for updates...");

        autoUpdater.on('checking-for-update', () => {
            console.log('Checking for update...');
        });

        autoUpdater.on('update-available', (info) => {
            console.log('Update available.', info);
            // Optionally notify mainWindow
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: 'A new version is downloading in the background...',
                buttons: ['OK']
            });
        });

        autoUpdater.on('update-not-available', (info) => {
            console.log('Update not available.');
        });

        autoUpdater.on('error', (err) => {
            console.error('Error in auto-updater. ' + err);
        });

        autoUpdater.on('update-downloaded', (info) => {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Update Ready',
                message: 'A new version has been downloaded. Restart the app to apply updates.',
                buttons: ['Restart', 'Later']
            }).then((returnValue) => {
                if (returnValue.response === 0) autoUpdater.quitAndInstall();
            });
        });
    };

    app.whenReady().then(() => {
        // --- 🔓 UNBLOCK IFRAMES (X-Frame-Options Stripper) ---
        const { session } = require('electron');

        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            const responseHeaders = Object.assign({}, details.responseHeaders);

            // Remove blocking headers
            const headersToRemove = [
                'x-frame-options',
                'content-security-policy',
                'frame-options'
            ];

            headersToRemove.forEach(header => {
                delete responseHeaders[header];
                // Also handle case-insensitive versions if any weird casing exists
                const keys = Object.keys(responseHeaders);
                keys.forEach(key => {
                    if (key.toLowerCase() === header) {
                        delete responseHeaders[key];
                    }
                });
            });

            callback({
                cancel: false,
                responseHeaders: responseHeaders
            });
        });

        createWindow();
        setupAutoUpdater();

        // In dev mode, you can force check with:
        // if (!app.isPackaged) autoUpdater.checkForUpdates();

        if (app.isPackaged) {
            autoUpdater.checkForUpdatesAndNotify();
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
}
