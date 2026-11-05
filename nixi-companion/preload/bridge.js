'use strict';

const { contextBridge, ipcRenderer, clipboard, shell } = require('electron');

const wrapped = new Map();

function channelName(channel) {
  const name = String(channel || '');
  if (!name || name.length > 160 || /[\r\n]/.test(name)) throw new Error('invalid IPC channel');
  return name;
}

function listenersFor(name, create) {
  let map = wrapped.get(name);
  if (!map && create) {
    map = new WeakMap();
    wrapped.set(name, map);
  }
  return map;
}

function on(channel, listener) {
  const name = channelName(channel);
  if (typeof listener !== 'function') throw new Error('listener must be a function');
  const fn = (_event, ...args) => listener({}, ...args);
  listenersFor(name, true).set(listener, fn);
  ipcRenderer.on(name, fn);
  return () => removeListener(name, listener);
}

function once(channel, listener) {
  const name = channelName(channel);
  if (typeof listener !== 'function') throw new Error('listener must be a function');
  const map = listenersFor(name, true);
  const fn = (_event, ...args) => {
    map.delete(listener);
    listener({}, ...args);
  };
  map.set(listener, fn);
  ipcRenderer.once(name, fn);
  return () => removeListener(name, listener);
}

function removeListener(channel, listener) {
  const name = channelName(channel);
  const map = listenersFor(name, false);
  const fn = map && map.get(listener);
  if (fn) {
    ipcRenderer.removeListener(name, fn);
    map.delete(listener);
  }
  return undefined;
}

function removeAllListeners(channel) {
  if (channel == null) {
    ipcRenderer.removeAllListeners();
    wrapped.clear();
    return undefined;
  }
  const name = channelName(channel);
  ipcRenderer.removeAllListeners(name);
  wrapped.delete(name);
  return undefined;
}

contextBridge.exposeInMainWorld('fulBridge', {
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channelName(channel), ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channelName(channel), ...args),
    sendSync: (channel, ...args) => ipcRenderer.sendSync(channelName(channel), ...args),
    on,
    once,
    removeListener,
    removeAllListeners
  },
  clipboard: {
    readText: () => clipboard.readText(),
    writeText: text => clipboard.writeText(String(text == null ? '' : text)),
    readImage: () => clipboard.readImage(),
    availableFormats: () => clipboard.availableFormats()
  },
  shell: {
    openExternal: url => shell.openExternal(String(url)),
    openPath: target => shell.openPath(String(target)),
    showItemInFolder: target => shell.showItemInFolder(String(target))
  },
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
});
