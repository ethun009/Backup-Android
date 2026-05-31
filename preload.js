const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adbAPI', {
  // Phase 3: Device connection
  getDevices: () => ipcRenderer.invoke('adb:get-devices'),
  getDeviceInfo: (serial) => ipcRenderer.invoke('adb:get-device-info', serial),
  onDeviceConnected: (callback) => ipcRenderer.on('adb:device-connected', (_event, value) => callback(value)),
  onDeviceDisconnected: (callback) => ipcRenderer.on('adb:device-disconnected', (_event, value) => callback(value)),
  removeDeviceListeners: () => {
    ipcRenderer.removeAllListeners('adb:device-connected');
    ipcRenderer.removeAllListeners('adb:device-disconnected');
  },

  // Phase 4: Media discovery
  scanMediaFolders: (serial, mediaType, skipAndroid) => ipcRenderer.invoke('adb:scan-media-folders', serial, mediaType, skipAndroid),
  listFolderContents: (serial, folderPath, mediaType) => ipcRenderer.invoke('adb:list-folder-contents', serial, folderPath, mediaType),

  // Phase 8 & 9: Transfer
  selectDestination: () => ipcRenderer.invoke('dialog:select-destination'),
  startTransfer: (data) => ipcRenderer.invoke('transfer:start', data),
  abortTransfer: () => ipcRenderer.invoke('transfer:abort'),
  openFolder: (path) => ipcRenderer.invoke('shell:open-folder', path),
  openUrl: (url) => ipcRenderer.invoke('shell:open-url', url),

  onTransferProgress: (callback) => ipcRenderer.on('transfer:progress', (_event, data) => callback(data)),
  onTransferFileStart: (callback) => ipcRenderer.on('transfer:file-start', (_event, data) => callback(data)),
  onTransferFileError: (callback) => ipcRenderer.on('transfer:file-error', (_event, data) => callback(data)),
  onTransferComplete: (callback) => ipcRenderer.on('transfer:complete', (_event, data) => callback(data)),
  onTransferAborted: (callback) => ipcRenderer.on('transfer:aborted', () => callback()),

  removeTransferListeners: () => {
    ipcRenderer.removeAllListeners('transfer:progress');
    ipcRenderer.removeAllListeners('transfer:file-start');
    ipcRenderer.removeAllListeners('transfer:file-error');
    ipcRenderer.removeAllListeners('transfer:complete');
    ipcRenderer.removeAllListeners('transfer:aborted');
  }
});
