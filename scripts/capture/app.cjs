const { app, ipcMain, nativeTheme } = require('electron');
const path = require('node:path');
app.setPath('appData', path.join(process.env.RIPPLE_CAPTURE_DIRECTORY, 'profile-root'));
app.requestSingleInstanceLock = () => true;
nativeTheme.themeSource = 'dark';
const original = ipcMain.handle.bind(ipcMain);
const caps = { previous: true, next: true, play: true, pause: true, toggle: true };
const art = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#173b68"/><stop offset="1" stop-color="#d58f85"/></linearGradient></defs><path fill="url(#g)" d="M0 0h400v400H0z"/><circle cx="220" cy="150" r="90" fill="#e9bf83"/><path d="M0 290L140 170l120 150 140-100v180H0" fill="#17293f"/></svg>').toString('base64')}`;
const media = {
  sessions: [
    {
      id: 'demo-player',
      name: 'A Quiet Horizon',
      artist: 'The Paper Satellites',
      album: 'Evening Sketches',
      artworkUrl: art,
      source: 'demo',
      playerName: 'Demo Player',
      state: 'playing',
      capabilities: caps,
      isCurrent: true,
    },
    {
      id: 'demo-radio',
      name: 'Soft Light',
      artist: 'Northbound',
      source: 'demo-radio',
      playerName: 'Demo Radio',
      state: 'paused',
      capabilities: caps,
    },
  ],
  activeSessionId: 'demo-player',
  manualSessionId: null,
  status: 'ready',
  error: null,
};
ipcMain.handle = (channel, handler) =>
  original(channel, async (...args) => {
    if (channel === 'get-system-media') return media;
    if (channel === 'control-system-media') return { snapshot: media, error: null };
    if (channel === 'read-clipboard-text') return 'git switch -c my-next-idea';
    if (channel === 'get-bluetooth-status') return false;
    if (channel === 'start-assistant') {
      const text =
        '## A little room to focus\n\n1. Open your reading workflow.\n2. Keep the next three tasks close at hand.\n3. Take a break when the music ends.\n\n```sh\ngit switch -c my-next-idea\n```';
      const event = args[0],
        requestId = args[1];
      for (const content of text.match(/.{1,24}|\n/g)) {
        event.sender.send('assistant-event', { requestId, content });
        await new Promise((r) => setTimeout(r, 20));
      }
      return { status: 'complete', text };
    }
    if (channel === 'get-camera-status' || channel === 'get-microphone-status') return false;
    return handler(...args);
  });
app.on('web-contents-created', (_, contents) => {
  const send = contents.send.bind(contents);
  contents.send = (channel, ...args) =>
    send(channel, ...(channel === 'media-snapshot-changed' ? [media] : args));
});
require(process.env.RIPPLE_CAPTURE_MAIN);
