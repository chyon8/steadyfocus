import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let originalBounds: Electron.Rectangle | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset', // Better for macOS focus mode transition
    trafficLightPosition: { x: 15, y: 15 },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Start Focus Mode - shrink window to a minimal bar
  ipcMain.on('set-focus-mode', (_event, enable: boolean) => {
    console.log('IPC: set-focus-mode received', enable);
    if (!mainWindow) {
      console.log('Error: mainWindow is null');
      return;
    }

    if (enable) {
      console.log('Enabling focus mode...');
      // Save current bounds for later restoration
      originalBounds = mainWindow.getBounds();
      console.log('Saved original bounds:', originalBounds);

      // Get primary display dimensions
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

      // Focus mode window dimensions
      const focusWidth = 500;
      const focusHeight = 60;

      // Position at bottom center of screen
      const focusX = Math.round((screenWidth - focusWidth) / 2);
      const focusY = screenHeight - focusHeight - 50; // 50px from bottom

      console.log(`Resizing to: ${focusWidth}x${focusHeight} at (${focusX}, ${focusY})`);

      // CRITICAL: Remove minimum size constraints BEFORE resizing
      mainWindow.setMinimumSize(focusWidth, focusHeight);

      // Use setBounds to set both size AND position with smooth animation
      mainWindow.setBounds({
        x: focusX,
        y: focusY,
        width: focusWidth,
        height: focusHeight,
      }, true); // Enable animation for smooth transition

      // Make window float on top
      mainWindow.setAlwaysOnTop(true, 'floating');

      // Hide traffic lights on macOS
      if (process.platform === 'darwin') {
        console.log('Hiding traffic lights (macOS)');
        mainWindow.setWindowButtonVisibility(false);
      } else {
        console.log('Skipping traffic light hide (not macOS)');
      }

      // Prevent resizing in focus mode
      mainWindow.setResizable(false);
      console.log('Focus mode enabled successfully');

    } else {
      console.log('Disabling focus mode...');
      // Restore original window bounds
      if (originalBounds) {
        console.log('Restoring bounds:', originalBounds);
        // Restore min size before restoring bounds
        mainWindow.setMinimumSize(800, 600);
        mainWindow.setBounds(originalBounds, true); // Enable animation for smooth transition
      }

      // Disable always on top
      mainWindow.setAlwaysOnTop(false);

      // Show traffic lights on macOS
      if (process.platform === 'darwin') {
        mainWindow.setWindowButtonVisibility(true);
      }

      // Allow resizing again
      mainWindow.setResizable(true);
      console.log('Focus mode disabled successfully');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
