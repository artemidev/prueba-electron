/**
 * Thermal Printer Control System - Core Interfaces
 *
 * This module defines the core interfaces for the printer abstraction layer.
 * It implements the Strategy pattern to support different printer types and
 * provides a unified API for printer operations.
 */

import { EventEmitter } from 'events';
import {
  FontStyle,
  PrintContent,
  PrintJob,
  PrintJobConfig,
  PrinterConfig,
  PrinterDiscoveryResult,
  PrinterError,
  PrinterEvent,
  PrinterEventCallback,
  PrinterInfo,
  PrinterStatus,
  TextAlignment,
} from './types';

// Re-export all types for convenience
export * from './types';

/**
 * Core printer interface - defines the contract that all printer implementations must follow
 * This is the Strategy interface in the Strategy pattern
 */
export interface IPrinter {
  readonly id: string;
  readonly config: PrinterConfig;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Status and information
  getStatus(): Promise<PrinterStatus>;
  getInfo(): Promise<PrinterInfo>;

  // Printing operations
  print(content: PrintContent[], config?: PrintJobConfig): Promise<string>; // Returns job ID
  printText(text: string, config?: PrintJobConfig): Promise<string>;

  // Hardware operations
  cutPaper(partial?: boolean): Promise<void>;
  openCashDrawer(): Promise<void>;
  feedPaper(lines: number): Promise<void>;

  // Testing and diagnostics
  printTestPage(): Promise<void>;
  selfTest(): Promise<boolean>;

  // Event handling
  on(event: string, callback: PrinterEventCallback): void;
  off(event: string, callback: PrinterEventCallback): void;

  // Cleanup
  dispose(): Promise<void>;
}

/**
 * Printer factory interface - implements the Factory pattern
 * Creates printer instances based on configuration
 */
export interface IPrinterFactory {
  createPrinter(config: PrinterConfig): IPrinter;
  getSupportedTypes(): string[];
  validateConfig(config: PrinterConfig): boolean;
}

/**
 * Printer registry interface - manages multiple printer instances
 * Implements the Registry pattern for printer management
 */
export interface IPrinterRegistry {
  // Printer management
  registerPrinter(config: PrinterConfig): Promise<string>; // Returns printer ID
  unregisterPrinter(id: string): Promise<void>;
  getPrinter(id: string): IPrinter | null;
  getAllPrinters(): IPrinter[];
  getAvailablePrinters(): IPrinter[];

  // Default printer management
  setDefaultPrinter(id: string): Promise<void>;
  getDefaultPrinter(): IPrinter | null;

  // Configuration management
  updatePrinterConfig(
    id: string,
    config: Partial<PrinterConfig>,
  ): Promise<void>;
  getPrinterConfig(id: string): PrinterConfig | null;

  // Discovery
  discoverPrinters(): Promise<PrinterDiscoveryResult[]>;

  // Validation
  validatePrinter(id: string): Promise<boolean>;

  // Events
  on(event: string, callback: PrinterEventCallback): void;
  off(event: string, callback: PrinterEventCallback): void;
}

/**
 * Print job manager interface - handles print job queuing and execution
 * Implements the Command pattern for print operations
 */
export interface IPrintJobManager {
  // Job management
  submitJob(
    job: Omit<PrintJob, 'id' | 'timestamp' | 'status'>,
  ): Promise<string>; // Returns job ID
  cancelJob(jobId: string): Promise<void>;
  getJob(jobId: string): PrintJob | null;
  getAllJobs(): PrintJob[];
  getPendingJobs(): PrintJob[];

  // Queue management
  clearQueue(): Promise<void>;
  pauseQueue(): void;
  resumeQueue(): void;
  isQueuePaused(): boolean;

  // Processing
  processNextJob(): Promise<void>;
  retryJob(jobId: string): Promise<void>;

  // Events
  on(event: string, callback: (job: PrintJob) => void): void;
  off(event: string, callback: (job: PrintJob) => void): void;
}

/**
 * Configuration manager interface - handles printer configuration persistence
 * Implements the Repository pattern for configuration storage
 */
export interface IConfigManager {
  initialize(): Promise<void>;
  // Configuration CRUD operations
  saveConfig(config: PrinterConfig): Promise<void>;
  loadConfig(id: string): Promise<PrinterConfig | null>;
  loadAllConfigs(): Promise<PrinterConfig[]>;
  deleteConfig(id: string): Promise<void>;

  // Default configuration
  getDefaultConfig(): Promise<PrinterConfig | null>;
  setDefaultConfig(id: string): Promise<void>;

  // Configuration validation
  validateConfig(config: PrinterConfig): Promise<boolean>;

  // Configuration templates
  getConfigTemplate(type: string): PrinterConfig;

  // Import/Export
  exportConfigs(): Promise<string>; // Returns JSON string
  importConfigs(data: string): Promise<void>;
}

/**
 * Printer service interface - main service facade
 * Implements the Facade pattern to provide a simplified interface
 */
export interface IPrinterService {
  // Initialization
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Quick operations
  quickPrint(text: string, printerId?: string): Promise<string>; // Uses default printer if not specified
  printHelloWorld(printerId?: string): Promise<string>;

  // Printer management
  addPrinter(config: PrinterConfig): Promise<string>;
  removePrinter(id: string): Promise<void>;
  listPrinters(): PrinterInfo[];
  testPrinter(id: string): Promise<boolean>;

  // Print operations
  print(
    printerId: string,
    content: PrintContent[],
    config?: PrintJobConfig,
  ): Promise<string>;
  printText(
    printerId: string,
    text: string,
    config?: PrintJobConfig,
  ): Promise<string>;

  // Job management
  getJobStatus(jobId: string): PrintJob | null;
  cancelJob(jobId: string): Promise<void>;

  // Discovery and configuration
  discoverPrinters(): Promise<PrinterDiscoveryResult[]>;
  autoConfigurePrinter(
    discoveryResult: PrinterDiscoveryResult,
  ): Promise<string>;

  // Events
  on(event: string, callback: PrinterEventCallback): void;
  off(event: string, callback: PrinterEventCallback): void;
}

/**
 * Base printer class - provides common functionality for all printer implementations
 * This is an abstract base class that implements common printer behaviors
 */
export abstract class BasePrinter extends EventEmitter implements IPrinter {
  protected _isConnected = false;
  protected _status: PrinterStatus = PrinterStatus.OFFLINE;

  constructor(
    public readonly id: string,
    public readonly config: PrinterConfig,
  ) {
    super();
  }

  // Abstract methods that must be implemented by concrete classes
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract print(
    content: PrintContent[],
    config?: PrintJobConfig,
  ): Promise<string>;
  abstract getStatus(): Promise<PrinterStatus>;
  abstract cutPaper(partial?: boolean): Promise<void>;
  abstract openCashDrawer(): Promise<void>;
  abstract feedPaper(lines: number): Promise<void>;
  abstract selfTest(): Promise<boolean>;

  // Common implementations
  isConnected(): boolean {
    return this._isConnected;
  }

  async getInfo(): Promise<PrinterInfo> {
    const status = await this.getStatus();
    return {
      id: this.id,
      name: this.config.name,
      type: this.config.type,
      status,
      isConnected: this._isConnected,
    };
  }

  async printText(text: string, config?: PrintJobConfig): Promise<string> {
    return this.print([{ type: 'text', content: text }], config);
  }

  async printTestPage(): Promise<void> {
    await this.print([
      {
        type: 'text',
        content: '=== PRINTER TEST PAGE ===',
        format: { alignment: TextAlignment.CENTER, style: FontStyle.BOLD },
      },
      { type: 'feed', lines: 1 },
      { type: 'text', content: `Printer: ${this.config.name}` },
      { type: 'text', content: `Type: ${this.config.type}` },
      { type: 'text', content: `Paper Size: ${this.config.paperSize}` },
      { type: 'feed', lines: 1 },
      {
        type: 'text',
        content: 'Test completed successfully!',
        format: { alignment: TextAlignment.CENTER },
      },
      { type: 'feed', lines: 2 },
      { type: 'cut', partial: false },
    ]);
  }

  async dispose(): Promise<void> {
    if (this._isConnected) {
      await this.disconnect();
    }
    this.removeAllListeners();
  }

  // Protected helper methods for subclasses
  protected emitEvent(type: string, data?: any): void {
    const event: PrinterEvent = {
      type: type as any,
      printerId: this.id,
      timestamp: new Date(),
      data,
    };
    this.emit(type, event);
  }

  protected setStatus(status: PrinterStatus): void {
    if (this._status !== status) {
      const oldStatus = this._status;
      this._status = status;
      this.emitEvent('status_changed', { oldStatus, newStatus: status });
    }
  }

  protected handleError(error: Error | PrinterError): void {
    this.emitEvent('error', error);
    throw error;
  }
}
