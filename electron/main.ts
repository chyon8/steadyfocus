import { app, BrowserWindow, ipcMain, screen, powerSaveBlocker, powerMonitor } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let originalBounds: Electron.Rectangle | null = null;
import { SimpleStore } from './store';

const store = new SimpleStore({
  configName: 'user-preferences',
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    isFocusMode: false,
    focusMinimized: false,
    focusBounds: null
  }
});

let powerSaveBlockerId: number | null = null;

function createWindow() {
  const isFocusMode = store.get('isFocusMode');
  const savedBounds = store.get('windowBounds');
  const focusBounds = store.get('focusBounds');

  let width = savedBounds?.width || 1200;
  let height = savedBounds?.height || 800;
  let x = savedBounds?.x;
  let y = savedBounds?.y;

  // If launching in focus mode, use focus bounds
  if (isFocusMode && focusBounds) {
    width = focusBounds.width;
    height = focusBounds.height;
    x = focusBounds.x;
    y = focusBounds.y;
  }

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: isFocusMode ? 300 : 800,
    minHeight: isFocusMode ? 45 : 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // Ensure timers run in background
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    show: false,
    resizable: true,
    alwaysOnTop: isFocusMode,
  });

  if (isFocusMode) {
    if (process.platform === 'darwin') {
      mainWindow.setWindowButtonVisibility(false);
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Save bounds on resize/move
  const saveBounds = () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    const isFocus = store.get('isFocusMode');
    if (isFocus) {
      store.set('focusBounds', bounds);
    } else {
      store.set('windowBounds', bounds);
    }
  };

  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

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

    store.set('isFocusMode', enable);
    store.set('focusMinimized', minimized);

    if (enable) {
      console.log('Enabling focus mode...');
      
      // Prevent App Nap when in Focus Mode (essential for timer accuracy when hidden)
      if (powerSaveBlockerId === null) {
        powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
        console.log('PowerSaveBlocker started:', powerSaveBlockerId);
      }
      
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
      let focusHeight = 45;
      let isResizable = false;

      if (minimized) {
        // Minimized Focus Mode: Resizable thin bar
        // Allow width resizing 300+, but LOCK height at 60
        focusWidth = 500;
        focusHeight = 45;
        isResizable = true;
        mainWindow.setMinimumSize(300, 45);
        mainWindow.setMaximumSize(800, 45); // Max width 800, Max height 45
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
      
      // Stop preventing App Nap
      if (powerSaveBlockerId !== null) {
        powerSaveBlocker.stop(powerSaveBlockerId);
        console.log('PowerSaveBlocker stopped:', powerSaveBlockerId);
        powerSaveBlockerId = null;
      }

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

  // Background Mode - Hide window but keep running
  ipcMain.on('set-background-mode', (_event, enable: boolean) => {
    if (!mainWindow) return;
    
    if (enable) {
      mainWindow.hide();
      // On macOS, we might want to hide from dock too? 
      // User said "open time is recorded", implies app is still running.
      // Keeping it in dock allows easy restore.
    } else {
      mainWindow.show();
    }
  });

  // Get initial app state for renderer
  ipcMain.handle('get-app-state', () => {
    return {
      isFocusMode: store.get('isFocusMode'),
      focusMinimized: store.get('focusMinimized')
    };
  });

  // Handle system suspend (sleep)
  powerMonitor.on('suspend', () => {
    console.log('System suspending...');
    // Ensure state is saved
    if (mainWindow) {
        const isFocus = store.get('isFocusMode');
        // We can't really "flush" the renderer here easily without IPC, 
        // but the renderer should handle its own saving via periodic flushes.
        // Main process state is already saved.
    }
  });

  powerMonitor.on('resume', () => {
    console.log('System resuming...');
    // If we are in focus mode, ensure we are still blocking app suspension if needed
    // (though powerSaveBlocker usually handles this across sleeps)
    if (store.get('isFocusMode') && powerSaveBlockerId === null) {
        powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension');
    }
    
    // Potentially force reload or refresh if UI is glitched? 
    // For now, reliance on store-based restoration on reload is safer.
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
  } else if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.show();
  }
});
