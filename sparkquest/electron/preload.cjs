const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the React App
// Expose safe APIs to the React App
contextBridge.exposeInMainWorld('sparkquest', {
    // Listen for focus changes (from main.js)
    onFocusChange: (callback) => ipcRenderer.on('app-focus-change', (_event, value) => callback(value)),

    // Session Control
    startSession: (url) => ipcRenderer.send('start-session', url),
    endSession: () => ipcRenderer.send('end-session'),
    sessionControl: (action) => ipcRenderer.send('session-control', action),
    captureSession: () => ipcRenderer.invoke('capture-session'),

    // Configuration Management
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),

    // System Control
    shutdown: () => ipcRenderer.invoke('shutdown-system'),
    forceFocus: () => ipcRenderer.invoke('bw-focus'),
});
