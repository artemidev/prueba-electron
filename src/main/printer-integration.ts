/**
 * Thermal Printer Integration for Electron Main Process
 * 
 * This module provides integration functions to use the thermal printer system
 * from the main Electron process and expose it to the renderer via IPC.
 */

import { ipcMain } from 'electron';
import {
  initializePrinterService,
  shutdownPrinterService,
  PrinterService,
  PrinterConfig,
  PrinterType,
  PrinterConnectionType,
  PaperSize,
  createCbxPos89eConfig
} from './printer';
import { printHelloWorldExample, comprehensiveExample } from './printer/example';

let printerService: PrinterService | null = null;

/**
 * Initialize the thermal printer system
 */
export async function initializeThermalPrinters(): Promise<void> {
  try {
    console.log('🖨️  Initializing thermal printer system...');
    printerService = await initializePrinterService();
    console.log('✅ Thermal printer system initialized');
  } catch (error) {
    console.error('❌ Failed to initialize thermal printer system:', error);
    throw error;
  }
}

/**
 * Shutdown the thermal printer system
 */
export async function shutdownThermalPrinters(): Promise<void> {
  try {
    if (printerService) {
      await shutdownPrinterService();
      printerService = null;
      console.log('✅ Thermal printer system shutdown');
    }
  } catch (error) {
    console.error('❌ Error shutting down thermal printer system:', error);
  }
}

/**
 * Setup IPC handlers for printer operations
 */
export function setupPrinterIPC(): void {
  // Print Hello World
  ipcMain.handle('printer:hello-world', async (event, printerId?: string) => {
    try {
      if (!printerService) {
        throw new Error('Printer service not initialized');
      }
      return await printerService.printHelloWorld(printerId);
    } catch (error) {
      console.error('IPC - Hello World print failed:', error);
      throw error;
    }
  });

  // Quick print text
  ipcMain.handle('printer:quick-print', async (event, text: string, printerId?: string) => {
    try {
      if (!printerService) {
        throw new Error('Printer service not initialized');
      }
      return await printerService.quickPrint(text, printerId);
    } catch (error) {
      console.error('IPC - Quick print failed:', error);
      throw error;
    }
  });

  // Add printer
  ipcMain.handle('printer:add', async (event, config: PrinterConfig) => {
    try {
      if (!printerService) {
        throw new Error('Printer service not initialized');
      }
      return await printerService.addPrinter(config);
    } catch (error) {
      console.error('IPC - Add printer failed:', error);
      throw error;
    }
  });

  // Remove printer
  ipcMain.handle('printer:remove', async (event, printerId: string) => {
    try {
      if (!printerService) {
        throw new Error('Printer service not initialized');
      }
      await printerService.removePrinter(printerId);
    } catch (error) {
      console.error('IPC - Remove printer failed:', error);
      throw error;
    }
  });

  // List printers
  ipcMain.handle('printer:list', async () => {
    try {
      if (!printerService) {
        throw new Error('Printer service not initialized');
      }
      return printerService.listPrinters();
    } catch (error) {
      console.error('IPC - List printers failed:', error);
      throw error;
    }
  });

  // Discover printers
  ipcMain.handle('printer:discover', async () => {
    try {
      if (!printerService) {
        throw new Error('Printer service not initialized');
      }
      return await printerService.discoverPrinters();
    } catch (error) {
      console.error('IPC - Discover printers failed:', error);
      throw error;
    }
  });

  // Test printer
  ipcMain.handle('printer:test', async (event, printerId: string) => {
    try {
      if (!printerService) {
        throw new Error('Printer service not initialized');
      }
      return await printerService.testPrinter(printerId);
    } catch (error) {
      console.error('IPC - Test printer failed:', error);
      throw error;
    }
  });

  // Get printer configuration templates
  ipcMain.handle('printer:get-templates', async () => {
    return {
      cbxPos89e: createCbxPos89eConfig(
        'CBX POS 89E Template',
        'CBX POS 89E Printer',
        {
          connectionType: PrinterConnectionType.USB,
          paperSize: PaperSize.MM_80,
          isDefault: false
        }
      ),
      generic: {
        id: `template_generic_${Date.now()}`,
        name: 'Generic Thermal Printer',
        type: PrinterType.GENERIC_ESC_POS,
        connectionType: PrinterConnectionType.USB,
        connectionString: '',
        paperSize: PaperSize.MM_80,
        characterSet: 'UTF-8',
        timeout: 5000,
        retryAttempts: 3,
        isDefault: false
      }
    };
  });

  console.log('📡 Thermal printer IPC handlers registered');
}

/**
 * Run the Hello World example
 */
export async function runHelloWorldExample(): Promise<void> {
  try {
    await printHelloWorldExample();
  } catch (error) {
    console.error('❌ Hello World example failed:', error);
    throw error;
  }
}

/**
 * Run the comprehensive example
 */
export async function runComprehensiveExample(): Promise<void> {
  try {
    await comprehensiveExample();
  } catch (error) {
    console.error('❌ Comprehensive example failed:', error);
    throw error;
  }
}

/**
 * Quick setup for CBX POS 89E printer
 * This is a convenience function for quick testing
 */
export async function quickSetupCbxPos89e(printerName: string = 'CBX POS 89E Printer'): Promise<string> {
  try {
    if (!printerService) {
      printerService = await initializePrinterService();
    }

    const config = createCbxPos89eConfig(
      'CBX POS 89E - Default',
      printerName,
      {
        connectionType: PrinterConnectionType.USB,
        paperSize: PaperSize.MM_80,
        isDefault: true
      }
    );

    const printerId = await printerService.addPrinter(config);
    console.log(`✅ CBX POS 89E printer configured with ID: ${printerId}`);
    
    return printerId;
  } catch (error) {
    console.error('❌ Failed to setup CBX POS 89E printer:', error);
    throw error;
  }
}

/**
 * Print Hello World to CBX POS 89E (Quick function for testing)
 */
export async function printHelloToCbx(): Promise<void> {
  try {
    console.log('🚀 Quick Hello World to CBX POS 89E...');
    
    // Setup printer if not already done
    const printerId = await quickSetupCbxPos89e();
    
    // Print Hello World
    if (!printerService) {
      throw new Error('Printer service not initialized');
    }
    
    const jobId = await printerService.printHelloWorld(printerId);
    console.log(`✅ Hello World printed to CBX POS 89E! Job ID: ${jobId}`);
    
  } catch (error) {
    console.error('❌ Failed to print Hello World to CBX:', error);
    throw error;
  }
}

// Development helper functions - exposed globally in development mode
if (process.env.NODE_ENV === 'development') {
  (global as any).thermalPrinter = {
    init: initializeThermalPrinters,
    shutdown: shutdownThermalPrinters,
    helloWorld: runHelloWorldExample,
    comprehensive: runComprehensiveExample,
    quickSetup: quickSetupCbxPos89e,
    printHello: printHelloToCbx,
    service: () => printerService
  };
  
  console.log('🛠️  Development thermal printer helpers available globally:');
  console.log('  - global.thermalPrinter.init()');
  console.log('  - global.thermalPrinter.helloWorld()');
  console.log('  - global.thermalPrinter.quickSetup("Printer Name")');
  console.log('  - global.thermalPrinter.printHello()');
}