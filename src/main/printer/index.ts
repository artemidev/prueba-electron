/**
 * Thermal Printer Control System - Main Entry Point
 * 
 * This module provides a unified export for the thermal printer control system.
 * It exports all necessary types, interfaces, and the main service class for
 * easy integration into Electron applications.
 */

// Export all types and interfaces
export * from './types';
export * from './interfaces';

// Import classes first for internal use
import { PrinterService } from './PrinterService';

// Export concrete implementations
export { PrinterService } from './PrinterService';
export { PrinterFactory } from './PrinterFactory';
export { PrinterRegistry } from './PrinterRegistry';
export { ConfigManager } from './ConfigManager';
export { CbxPos89ePrinter } from './printers/CbxPos89ePrinter';

// Export convenience functions
export {
  createPrinterService,
  createCbxPos89eConfig,
  createQuickPrintFunction
} from './utils';

/**
 * Default printer service instance (singleton pattern)
 */
let defaultService: PrinterService | null = null;

/**
 * Get or create the default printer service instance
 */
export function getDefaultPrinterService(): PrinterService {
  if (!defaultService) {
    defaultService = new PrinterService();
  }
  return defaultService;
}

/**
 * Initialize the default printer service
 */
export async function initializePrinterService(): Promise<PrinterService> {
  const service = getDefaultPrinterService();
  await service.initialize();
  return service;
}

/**
 * Shutdown the default printer service
 */
export async function shutdownPrinterService(): Promise<void> {
  if (defaultService) {
    await defaultService.shutdown();
    defaultService = null;
  }
}