const { app, BrowserWindow } = require('electron');
console.log(app);
const path = require('path')

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1544,
        height: 768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // preload: path.join(__dirname, 'preload.js'),
        }
    });

    win.loadFile('./index.html');
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});


