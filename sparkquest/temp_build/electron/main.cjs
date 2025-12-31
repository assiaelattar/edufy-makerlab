const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    let mainWindow;

    const createWindow = () => {
        // get massive screen size for kiosk
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;

        mainWindow = new BrowserWindow({
            width,
            height,
            kiosk: true, // Kiosk Mode (Full screen, no exit buttons)
            fullscreen: true,
            frame: false,
            title: "SparkQuest Studio",
            icon: path.join(__dirname, '../public/favicon.ico'), // Fallback icon
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                nodeIntegration: false, // Security best practice
                contextIsolation: true,
            },
        });

        // Handle environment (Dev vs Prod)
        // In Dev: Load localhost
        // In Prod: Load built index.html
        const isDev = process.env.NODE_ENV === 'development';
        const startUrl = isDev
            ? 'http://localhost:3000'
            : `file://${path.join(__dirname, '../dist/index.html')}`;

        console.log("Loading URL:", startUrl);
        mainWindow.loadURL(startUrl);

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

        // Prevent new windows (security)
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            // Allow only specific domains if needed, or just open in default browser
            // For Kiosk, usually block or force internal.
            return { action: 'deny' };
        });
    };

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
}
