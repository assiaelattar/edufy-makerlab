const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the React App
contextBridge.exposeInMainWorld('electronAPI', {
    // Listen for focus changes (from main.js)
    onFocusChange: (callback) => ipcRenderer.on('app-focus-change', (_event, value) => callback(value)),

    // Future: Add Hardware Serial Port access here
    // listPorts: () => ipcRenderer.invoke('list-serial-ports'),
});
