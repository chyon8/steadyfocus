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
  ipcMain.on('set-focus-mode', (_event, enable: boolean, minimized: boolean = false) => {
    console.log('IPC: set-focus-mode received', enable, minimized);
    if (!mainWindow) {
      console.log('Error: mainWindow is null');
      return;
    }

    if (enable) {
      console.log('Enabling focus mode...');
      
      // Save current bounds ONLY if we haven't saved them yet OR if we are transitioning from normal app mode
      // If we are just toggling minimized state within focus mode, we don't want to overwrite originalBounds
      if (!originalBounds) {
        originalBounds = mainWindow.getBounds();
        console.log('Saved original bounds:', originalBounds);
      }

      // Get primary display dimensions
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

      let focusWidth = 500;
      let focusHeight = 60;
      let isResizable = false;

      if (minimized) {
        // Minimized Focus Mode: Resizable thin bar
        // Allow width resizing 300+, but LOCK height at 60
        focusWidth = 500;
        focusHeight = 60;
        isResizable = true;
        mainWindow.setMinimumSize(300, 60);
        mainWindow.setMaximumSize(800, 60); // Max width 800, Max height 60
      } else {
        // Normal Focus Mode: Resizable
        // TODO: Load saved width from store/file if available
        focusWidth = 600; // Default width
        focusHeight = 800; // Full height-ish (will be constrained by content/screen)
        isResizable = true;
        mainWindow.setMinimumSize(400, 600); // Min width 400
        mainWindow.setMaximumSize(800, screenHeight - 100); // Max width 800
      }

      // Position at bottom center of screen for minimized, or center for normal
      const focusX = Math.round((screenWidth - focusWidth) / 2);
      const focusY = minimized 
        ? screenHeight - focusHeight - 50 // Bottom for minimized
        : Math.round((screenHeight - focusHeight) / 2); // Center for normal

      console.log(`Resizing to: ${focusWidth}x${focusHeight} at (${focusX}, ${focusY})`);

      // Use setBounds to set both size AND position with smooth animation
      mainWindow.setBounds({
        x: focusX,
        y: focusY,
        width: focusWidth,
        height: focusHeight,
      }, true);

      // Make window float on top
      mainWindow.setAlwaysOnTop(true, 'floating');

      // Hide traffic lights on macOS
      if (process.platform === 'darwin') {
        mainWindow.setWindowButtonVisibility(false);
      }

      // Set resize capability
      mainWindow.setResizable(isResizable);
      
    } else {
      console.log('Disabling focus mode...');
      // Restore original window bounds
      if (originalBounds) {
        console.log('Restoring bounds:', originalBounds);
        // Restore min/max constraints before restoring bounds
        mainWindow.setMinimumSize(800, 600);
        mainWindow.setMaximumSize(10000, 10000); // Remove max constraints
        mainWindow.setBounds(originalBounds, true); // Enable animation for smooth transition
        originalBounds = null; // Reset saved bounds
      }

      // Disable always on top
      mainWindow.setAlwaysOnTop(false);

      // Show traffic lights on macOS
      if (process.platform === 'darwin') {
        mainWindow.setWindowButtonVisibility(true);
      }

      // Allow resizing again
      mainWindow.setResizable(true);
    }
  });

  // Save specific focus mode width preference
  ipcMain.on('save-focus-width', (_event, width: number) => {
    // Ideally we would save this to a file/store. 
    // For now we rely on the component to send the desired width when entering focus mode
    // or just let it reset to default 600
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
