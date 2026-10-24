const { app, BrowserWindow, session } = require('electron');
app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith('file:') }));
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  await window.loadFile(process.argv.find(arg => arg.startsWith('--fixture=' )).slice(10));
  const result = await window.webContents.executeJavaScript('window.runLifecycle()');
  console.log('RESULT:' + JSON.stringify(result));
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
