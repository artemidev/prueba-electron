/**
 * Printer Service - Main Facade
 * 
 * This module implements the Facade pattern to provide a simplified interface
 * for all printer operations. It coordinates between the registry, factory,
 * and configuration manager to provide a unified API.
 */

import { EventEmitter } from 'events';
import {
  IPrinterService,
  IPrinterRegistry,
  IConfigManager,
  PrinterConfig,
  PrintContent,
  PrintJobConfig,
  PrinterInfo,
  PrintJob,
  PrinterDiscoveryResult,
  PrinterError,
  PrinterErrorCode,
  PrinterType,
  PaperSize,
  PrinterConnectionType,
  TextAlignment,
  FontStyle
} from './interfaces';
import { PrinterRegistry } from './PrinterRegistry';
import { ConfigManager } from './ConfigManager';
import { PrinterFactory } from './PrinterFactory';

export class PrinterService extends EventEmitter implements IPrinterService {
  private registry: IPrinterRegistry;
  private configManager: IConfigManager;
  private initialized = false;

  constructor(
    registry?: IPrinterRegistry,
    configManager?: IConfigManager
  ) {
    super();
    
    this.registry = registry || new PrinterRegistry(new PrinterFactory());
    this.configManager = configManager || new ConfigManager();
    
    this.setupEventForwarding();
  }

  /**
   * Initialize the printer service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize configuration manager
      await this.configManager.initialize();

      // Load existing printer configurations
      const configs = await this.configManager.loadAllConfigs();
      
      // Register loaded printers
      for (const config of configs) {
        try {
          await this.registry.registerPrinter(config);
        } catch (error) {
          console.warn(`Failed to register printer ${config.id}:`, error);
        }
      }

      this.initialized = true;
      this.emit('service_initialized');
    } catch (error) {
      throw new PrinterError(
        `Failed to initialize printer service: ${error instanceof Error ? error.message : String(error)}`,
        PrinterErrorCode.INVALID_CONFIG,
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Shutdown the printer service
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Dispose of registry (which disposes all printers)
      if (this.registry && 'dispose' in this.registry) {
        await (this.registry as any).dispose();
      }

      // Dispose of config manager
      if (this.configManager && 'dispose' in this.configManager) {
        await (this.configManager as any).dispose();
      }

      this.initialized = false;
      this.removeAllListeners();
      this.emit('service_shutdown');
    } catch (error) {
      console.warn('Error during printer service shutdown:', error);
    }
  }

  /**
   * Quick print text to default printer
   */
  async quickPrint(text: string, printerId?: string): Promise<string> {
    this.ensureInitialized();

    const targetPrinter = printerId 
      ? this.registry.getPrinter(printerId)
      : this.registry.getDefaultPrinter();

    if (!targetPrinter) {
      throw new PrinterError(
        printerId ? `Printer '${printerId}' not found` : 'No default printer configured',
        PrinterErrorCode.PRINTER_NOT_FOUND,
        printerId
      );
    }

    // Connect if not already connected
    if (!targetPrinter.isConnected()) {
      await targetPrinter.connect();
    }

    return await targetPrinter.printText(text);
  }

  /**
   * Print "Hello World" to specified or default printer
   */
  async printHelloWorld(printerId?: string): Promise<string> {
    this.ensureInitialized();

    const helloWorldContent: PrintContent[] = [
      {
        type: 'text',
        content: '================================',
        format: { alignment: TextAlignment.CENTER }
      },
      {
        type: 'text',
        content: 'HELLO WORLD!',
        format: { 
          alignment: TextAlignment.CENTER,
          style: FontStyle.BOLD 
        }
      },
      {
        type: 'text',
        content: 'Thermal Printer Test',
        format: { alignment: TextAlignment.CENTER }
      },
      {
        type: 'text',
        content: '================================',
        format: { alignment: TextAlignment.CENTER }
      },
      { type: 'feed', lines: 1 },
      {
        type: 'text',
        content: `Printed at: ${new Date().toLocaleString()}`
      },
      {
        type: 'text',
        content: `Printer ID: ${printerId || 'default'}`
      },
      { type: 'feed', lines: 2 },
      { type: 'cut', partial: false }
    ];

    return await this.print(
      printerId || this.getDefaultPrinterId(),
      helloWorldContent
    );
  }

  /**
   * Add a new printer
   */
  async addPrinter(config: PrinterConfig): Promise<string> {
    this.ensureInitialized();

    try {
      // Save configuration
      await this.configManager.saveConfig(config);

      // Register with registry
      const printerId = await this.registry.registerPrinter(config);

      this.emit('printer_added', {
        type: 'printer_added',
        printerId,
        timestamp: new Date(),
        data: { config }
      });

      return printerId;
    } catch (error) {
      throw new PrinterError(
        `Failed to add printer: ${error instanceof Error ? error.message : String(error)}`,
        PrinterErrorCode.INVALID_CONFIG,
        config.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Remove a printer
   */
  async removePrinter(id: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Unregister from registry
      await this.registry.unregisterPrinter(id);

      // Delete configuration
      await this.configManager.deleteConfig(id);

      this.emit('printer_removed', {
        type: 'printer_removed',
        printerId: id,
        timestamp: new Date()
      });
    } catch (error) {
      throw new PrinterError(
        `Failed to remove printer: ${error instanceof Error ? error.message : String(error)}`,
        PrinterErrorCode.PRINTER_NOT_FOUND,
        id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * List all registered printers
   */
  listPrinters(): PrinterInfo[] {
    this.ensureInitialized();

    return this.registry.getAllPrinters().map(printer => ({
      id: printer.id,
      name: printer.config.name,
      type: printer.config.type,
      status: printer.isConnected() ? 'idle' : 'offline',
      isConnected: printer.isConnected()
    })) as PrinterInfo[];
  }

  /**
   * Test a printer connection
   */
  async testPrinter(id: string): Promise<boolean> {
    this.ensureInitialized();

    return await this.registry.validatePrinter(id);
  }

  /**
   * Print content to a specific printer
   */
  async print(printerId: string, content: PrintContent[], config?: PrintJobConfig): Promise<string> {
    this.ensureInitialized();

    const printer = this.registry.getPrinter(printerId);
    
    if (!printer) {
      throw new PrinterError(
        `Printer '${printerId}' not found`,
        PrinterErrorCode.PRINTER_NOT_FOUND,
        printerId
      );
    }

    // Connect if not already connected
    if (!printer.isConnected()) {
      await printer.connect();
    }

    return await printer.print(content, config);
  }

  /**
   * Print text to a specific printer
   */
  async printText(printerId: string, text: string, config?: PrintJobConfig): Promise<string> {
    return await this.print(printerId, [{ type: 'text', content: text }], config);
  }

  /**
   * Get job status (placeholder - would need job manager implementation)
   */
  getJobStatus(_jobId: string): PrintJob | null {
    // In a full implementation, this would query a job manager
    return null;
  }

  /**
   * Cancel a print job (placeholder - would need job manager implementation)
   */
  async cancelJob(_jobId: string): Promise<void> {
    // In a full implementation, this would cancel via job manager
    throw new PrinterError(
      'Job cancellation not implemented',
      PrinterErrorCode.UNSUPPORTED_OPERATION
    );
  }

  /**
   * Discover available printers
   */
  async discoverPrinters(): Promise<PrinterDiscoveryResult[]> {
    this.ensureInitialized();

    return await this.registry.discoverPrinters();
  }

  /**
   * Auto-configure a printer from discovery result
   */
  async autoConfigurePrinter(discoveryResult: PrinterDiscoveryResult): Promise<string> {
    this.ensureInitialized();

    const config: PrinterConfig = {
      id: discoveryResult.id,
      name: discoveryResult.name,
      type: discoveryResult.type,
      connectionType: discoveryResult.connectionType,
      connectionString: discoveryResult.connectionString,
      paperSize: PaperSize.MM_80, // Default paper size
      characterSet: 'UTF-8',
      timeout: 5000,
      retryAttempts: 3,
      isDefault: false
    };

    return await this.addPrinter(config);
  }

  /**
   * Get default printer ID
   */
  private getDefaultPrinterId(): string {
    const defaultPrinter = this.registry.getDefaultPrinter();
    
    if (!defaultPrinter) {
      throw new PrinterError(
        'No default printer configured',
        PrinterErrorCode.PRINTER_NOT_FOUND
      );
    }

    return defaultPrinter.id;
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new PrinterError(
        'Printer service not initialized',
        PrinterErrorCode.INVALID_CONFIG
      );
    }
  }

  /**
   * Set up event forwarding from registry
   */
  private setupEventForwarding(): void {
    // Forward all registry events
    const forwardEvent = (eventName: string) => {
      this.registry.on(eventName, (event) => {
        this.emit(eventName, event);
      });
    };

    // Standard printer events
    forwardEvent('printer_registered');
    forwardEvent('printer_unregistered');
    forwardEvent('default_printer_changed');
    forwardEvent('printer_config_updated');
    forwardEvent('status_changed');
    forwardEvent('job_started');
    forwardEvent('job_completed');
    forwardEvent('job_failed');
    forwardEvent('connection_lost');
    forwardEvent('connection_restored');
    forwardEvent('error');
  }

  /**
   * Create configuration template
   */
  createConfigTemplate(type: PrinterType): PrinterConfig {
    return this.configManager.getConfigTemplate(type);
  }

  /**
   * Get connection examples for UI
   */
  getConnectionExamples(): Array<{type: PrinterConnectionType, examples: string[]}> {
    if ('getConnectionTemplates' in this.configManager) {
      return (this.configManager as any).getConnectionTemplates();
    }
    
    // Fallback examples
    return [
      {
        type: PrinterConnectionType.USB,
        examples: ['CBX POS 89E Printer', 'Generic USB Printer']
      },
      {
        type: PrinterConnectionType.SERIAL,
        examples: ['COM1', '/dev/ttyUSB0']
      },
      {
        type: PrinterConnectionType.NETWORK,
        examples: ['192.168.1.100:9100']
      }
    ];
  }

  /**
   * Export printer configurations
   */
  async exportConfigurations(): Promise<string> {
    this.ensureInitialized();
    return await this.configManager.exportConfigs();
  }

  /**
   * Import printer configurations
   */
  async importConfigurations(data: string): Promise<void> {
    this.ensureInitialized();
    
    await this.configManager.importConfigs(data);
    
    // Reload printers from updated configurations
    const configs = await this.configManager.loadAllConfigs();
    
    // Clear current registry
    if (this.registry && 'dispose' in this.registry) {
      await (this.registry as any).dispose();
      this.registry = new PrinterRegistry(new PrinterFactory());
      this.setupEventForwarding();
    }
    
    // Re-register printers
    for (const config of configs) {
      try {
        await this.registry.registerPrinter(config);
      } catch (error) {
        console.warn(`Failed to register imported printer ${config.id}:`, error);
      }
    }
  }
}