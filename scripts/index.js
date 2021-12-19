const { app, BrowserWindow, ipcMain, dialog } = require('electron');
var fs = require('fs');
const path = require('path');

// File dialog
ipcMain.on('save-file', (event, arg) => {
    dialog.showSaveDialog({
        title: 'Select the File Path to save',
        defaultPath: path.join(__dirname, `${arg[0]}.json`),
        buttonLabel: 'Save',
        // Restricting the user to only Text Files.
        filters: [
            {
                name: 'JSON file',
                extensions: ['json']
            }, ],
        properties: []
    }).then(file => {
        // Stating whether dialog operation was cancelled or not.
        if (!file.canceled) {
            // Creating and writing file
            fs.writeFile(file.filePath.toString(), JSON.stringify(arg[1]), 
                (err) => { if (err) throw err; });
        }
    }).catch((err) => {
        console.log(err)
    });
});

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
        if (BrowserRenderer.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
