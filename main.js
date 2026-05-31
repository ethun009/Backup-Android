import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import adbService from './src/main/adb_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#cbd5e1'
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // If dev server isn't ready yet, try again after a short delay
      setTimeout(() => mainWindow.loadURL('http://localhost:5173'), 1000);
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Set up ADB events
  adbService.on('device-connected', (device) => {
    mainWindow?.webContents.send('adb:device-connected', device);
  });
  
  adbService.on('device-disconnected', (device) => {
    mainWindow?.webContents.send('adb:device-disconnected', device);
  });
}

app.whenReady().then(() => {
  createWindow();
  adbService.startTracking();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── IPC Handlers ──────────────────────────────────────────────

ipcMain.handle('adb:get-devices', async () => {
  return await adbService.getDevices();
});

ipcMain.handle('adb:get-device-info', async (event, serial) => {
  return await adbService.getDeviceInfo(serial);
});

ipcMain.handle('adb:scan-media-folders', async (event, serial, mediaType, skipAndroid) => {
  return await adbService.scanMediaFolders(serial, mediaType, skipAndroid);
});

ipcMain.handle('adb:list-folder-contents', async (event, serial, folderPath, mediaType) => {
  return await adbService.listFolderContents(serial, folderPath, mediaType);
});

// ── Phase 8: Destination picker ───────────────────────────────

ipcMain.handle('dialog:select-destination', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Backup Destination',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Select Folder',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];

  // Check available disk space (Windows)
  let freeSpace = null;
  try {
    const drive = selectedPath.substring(0, 3); // e.g. "G:\"
    const stats = fs.statfsSync(drive);
    freeSpace = stats.bfree * stats.bsize;
  } catch {
    // fallback: can't determine
  }

  return { path: selectedPath, freeSpace };
});

// ── Phase 9: Transfer engine ──────────────────────────────────

let transferAborted = false;

ipcMain.handle('transfer:start', async (event, { serial, files, destinationDir, mediaType, phoneName }) => {
  transferAborted = false;

  // Create subfolder like "Samsung Galaxy S24_ImageBackup"
  const typeName = mediaType === 'image' ? 'ImageBackup' : 'VideoBackup';
  const folderName = `${phoneName}_${typeName}`;
  const backupDir = path.join(destinationDir, folderName);
  fs.mkdirSync(backupDir, { recursive: true });

  const totalFiles = files.length;
  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
  let completedFiles = 0;
  let bytesFromFinishedFiles = 0;
  let failedFiles = [];
  const startTime = Date.now();

  for (let i = 0; i < totalFiles; i++) {
    if (transferAborted) {
      mainWindow?.webContents.send('transfer:aborted');
      return { completed: completedFiles, failed: failedFiles, aborted: true };
    }

    const file = files[i];
    const localFilePath = path.join(backupDir, file.name);

    // Initial event for this file
    mainWindow?.webContents.send('transfer:file-start', {
      index: i,
      name: file.name,
      size: file.size,
      totalFiles,
    });

    // Smart Skip: If file exists and size matches, skip pulling
    if (fs.existsSync(localFilePath)) {
      try {
        const stats = fs.statSync(localFilePath);
        if (stats.size === file.size || (file.size === 0 && stats.size > 0)) {
          bytesFromFinishedFiles += file.size;
          completedFiles++;
          
          mainWindow?.webContents.send('transfer:progress', {
            fileIndex: i,
            fileName: file.name,
            fileBytesTransferred: file.size,
            fileSize: file.size,
            completedFiles,
            totalFiles,
            completedBytes: bytesFromFinishedFiles,
            totalBytes,
            speed: 0,
            eta: 0,
          });

          mainWindow?.webContents.send('transfer:file-done', {
            index: i,
            name: file.name,
            completedFiles,
            totalFiles,
          });
          
          continue; // Move directly to next file
        }
      } catch (e) {
        // Ignore stats error, just proceed with normal download
      }
    }

    try {
      let currentFileBytes = 0;

      await adbService.pullFile(serial, file.path, localFilePath, ({ bytesTransferred }) => {
        currentFileBytes = bytesTransferred;
        const totalSoFar = bytesFromFinishedFiles + currentFileBytes;
        
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? totalSoFar / elapsed : 0;
        const remaining = speed > 0 ? (totalBytes - totalSoFar) / speed : -1;

        mainWindow?.webContents.send('transfer:progress', {
          fileIndex: i,
          fileName: file.name,
          fileBytesTransferred: currentFileBytes,
          fileSize: file.size,
          completedFiles,
          totalFiles,
          completedBytes: totalSoFar,
          totalBytes,
          speed,
          eta: remaining,
        });
      });

      bytesFromFinishedFiles += file.size;
      completedFiles++;

      // Send definitive progress update for file completion
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = elapsed > 0 ? bytesFromFinishedFiles / elapsed : 0;
      const remaining = speed > 0 ? (totalBytes - bytesFromFinishedFiles) / speed : 1;

      mainWindow?.webContents.send('transfer:progress', {
        fileIndex: i,
        fileName: file.name,
        fileBytesTransferred: file.size,
        fileSize: file.size,
        completedFiles,
        totalFiles,
        completedBytes: bytesFromFinishedFiles,
        totalBytes,
        speed,
        eta: remaining,
      });

      mainWindow?.webContents.send('transfer:file-done', {
        index: i,
        name: file.name,
        completedFiles,
        totalFiles,
      });

    } catch (err) {
      console.error(`Failed to pull ${file.path}:`, err.message);
      failedFiles.push({ name: file.name, path: file.path, size: file.size, error: err.message });
      
      // Even if it fails, we should update bytesFromFinishedFiles to keep overall progress consistent? 
      // Actually, skip it for failed files if they didn't transfer.
      
      mainWindow?.webContents.send('transfer:file-error', {
        index: i,
        name: file.name,
        path: file.path,
        size: file.size,
        error: err.message,
      });
    }
  }

  mainWindow?.webContents.send('transfer:complete', {
    completedFiles,
    totalFiles,
    failedFiles,
    backupDir,
  });

  return { completed: completedFiles, failed: failedFiles, aborted: false, backupDir };
});

ipcMain.handle('transfer:abort', () => {
  transferAborted = true;
});

ipcMain.handle('shell:open-folder', async (event, folderPath) => {
  const { shell } = await import('electron');
  shell.openPath(folderPath);
});

ipcMain.handle('shell:open-url', async (event, url) => {
  const { shell } = await import('electron');
  shell.openExternal(url);
});
