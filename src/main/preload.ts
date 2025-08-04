// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  // Thermal Printer API
  printer: {
    // Basic printing operations
    helloWorld: (printerId?: string) => ipcRenderer.invoke('printer:hello-world', printerId),
    quickPrint: (text: string, printerId?: string) => ipcRenderer.invoke('printer:quick-print', text, printerId),
    
    // Printer discovery and testing
    discover: () => ipcRenderer.invoke('printer:discover'),
    test: (printerId: string) => ipcRenderer.invoke('printer:test', printerId),
    
    // Printer management
    add: (config: any) => ipcRenderer.invoke('printer:add', config),
    remove: (printerId: string) => ipcRenderer.invoke('printer:remove', printerId),
    list: () => ipcRenderer.invoke('printer:list'),
    
    // Printer configuration templates
    getTemplates: () => ipcRenderer.invoke('printer:get-templates'),
    
    // CBX POS 89E specific quick test
    cbxHello: () => ipcRenderer.invoke('printer:cbx-hello'),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
