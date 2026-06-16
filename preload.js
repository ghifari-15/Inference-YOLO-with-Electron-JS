import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('apiConfig', {
  baseUrl: 'http://127.0.0.1:8000',
  wsUrl: 'ws://127.0.0.1:8000/ws/inference',
});
