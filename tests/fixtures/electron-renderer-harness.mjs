import { app, BrowserWindow } from 'electron'
import process from 'node:process'

if (process.env.NEXUS_RENDERER_USER_DATA) app.setPath('userData', process.env.NEXUS_RENDERER_USER_DATA)

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    show: false,
    backgroundColor: '#091015',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  window.once('ready-to-show', () => window.show())
  await window.loadURL(process.env.NEXUS_RENDERER_FIXTURE_URL || 'http://127.0.0.1:4173/tests/fixtures/renderer.html')
})

app.on('window-all-closed', () => app.quit())
