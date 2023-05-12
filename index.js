const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const ftp = require('./ftp')

app.disableHardwareAcceleration()

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    frame: false,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  });

  mainWindow.loadFile('index.html');

  // Open the DevTools when the user presses Ctrl+Shift+I
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', async function () {
  const ftpclient = await ftp.client();

  createWindow();

  // Watch the specified folder for changes
  const watcher = chokidar.watch('my-folder', {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  // When a file is added, modified or deleted, update the UI
  watcher.on('all', async (event, filePath) => {
    if (event === 'change' || event === 'unlink') {
      await ftp.syncLocalFiles(ftpclient, filePath, event);
    }
    if (event === 'add' || event === 'change') {
      mainWindow.webContents.send('file-modified', { filePath, event });
    } else if (event === 'unlink') {
      mainWindow.webContents.send('file-deleted', filePath);
    }
  });

  // When the sync is complete, update the UI
  watcher.on('ready', () => {
    mainWindow.webContents.send('sync-complete');
  });

  ipcMain.on('btn-remote-sync', async () => {
    await ftp.syncRemoteFiles(ftpclient, mainWindow);
    mainWindow.webContents.send('sync-complete');
  });

  ipcMain.on('btn-local-sync', async () => {
    traverseDirectory('my-folder', async (filePath) => {
      await ftp.syncLocalFiles(ftpclient, filePath, 'change');
    });
    mainWindow.webContents.send('sync-complete');
  });

  // When a file is requested from the UI, read it and send it back
  ipcMain.on('read-file', (event, fileData) => {
    const { filePath } = fileData;
    console.log(`File ${filePath} has been requested`);
    fs.readFile(path.join(__dirname, filePath), 'utf-8', (err, data) => {
      if (err) {
        console.error(err);
        event.reply('file-read-error', filePath);
      } else {
        // ftp.syncLocalFiles(ftpclient, filePath);
        event.reply('file-read-success', fileData, data);
      }
    });
  });

  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });
});

// Recursively traverse the directory
function traverseDirectory(directoryPath, callback) {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(err);
    } else {
      files.forEach((file) => {
        const filePath = path.join(directoryPath, file);
        fs.stat(filePath, (err, stat) => {
          if (err) {
            console.error(err);
          } else {
            if (stat.isFile()) {
              callback(filePath);
            } else if (stat.isDirectory()) {
              traverseDirectory(filePath, callback);
            }
          }
        });
      });
    }
  });
}