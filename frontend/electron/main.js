import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let pythonProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        title: 'Convertly',
        frame: true,
        backgroundColor: '#1a1a1a'
    });

    // Forced dev mode for now
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
}

function startPythonBackend() {
    const backendPath = path.join(__dirname, '../../backend/app.py');
    const pythonExe = path.join(__dirname, '../../venv/Scripts/python.exe');

    console.log('Starting Python backend...', pythonExe, backendPath);

    pythonProcess = spawn(pythonExe, [backendPath]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python Error: ${data}`);
    });
}

app.whenReady().then(() => {
    startPythonBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
});
