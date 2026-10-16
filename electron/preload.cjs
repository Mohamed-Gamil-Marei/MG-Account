const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronDesktop', {
  isDesktop: true,
  getInitialAdminCredentials: () => ipcRenderer.invoke('desktop:get-initial-admin'),
  chooseBackupFolder: () => ipcRenderer.invoke('desktop:choose-backup-folder'),
  chooseRestoreFile: () => ipcRenderer.invoke('desktop:choose-restore-file'),
  saveBackupToFile: (filePath) => ipcRenderer.invoke('desktop:save-backup-to-file', filePath),
  restoreFromFile: (filePath) => ipcRenderer.invoke('desktop:restore-from-file', filePath),
  getNetworkStatus: () => ipcRenderer.invoke('desktop:get-network-status'),
  setNetworkAccess: (allowLan) => ipcRenderer.invoke('desktop:set-network-access', allowLan),
  getUserDataPath: () => ipcRenderer.invoke('desktop:get-user-data-path'),
});
