/**
 * Printer Factory Implementation
 * 
 * This module implements the Factory pattern for creating printer instances.
 * It supports multiple printer types and provides validation for printer configurations.
 * The factory uses a registry-based approach for extensibility.
 */

import {
  IPrinter,
  IPrinterFactory,
  PrinterConfig,
  PrinterType,
  PrinterError,
  PrinterErrorCode,
  PaperSize,
  PrinterConnectionType
} from './interfaces';
import { CbxPos89ePrinter } from './printers/CbxPos89ePrinter';

// Type definition for printer constructor
type PrinterConstructor = new (id: string, config: PrinterConfig) => IPrinter;

/**
 * Printer Factory Class
 * Implements the Factory pattern for creating printer instances
 */
export class PrinterFactory implements IPrinterFactory {
  private printerRegistry = new Map<PrinterType, PrinterConstructor>();
  private configValidators = new Map<PrinterType, (config: PrinterConfig) => boolean>();

  constructor() {
    this.registerDefaultPrinters();
  }

  /**
   * Register default printer implementations
   */
  private registerDefaultPrinters(): void {
    // Register CBX POS 89E printer
    this.registerPrinterType(
      PrinterType.CBX_POS_89E,
      CbxPos89ePrinter,
      this.validateCbxPos89eConfig
    );

    // Register generic ESC/POS printer (can be used as fallback)
    this.registerPrinterType(
      PrinterType.GENERIC_ESC_POS,
      CbxPos89ePrinter, // Reuse CBX implementation for now
      this.validateGenericEscPosConfig
    );
  }

  /**
   * Register a new printer type with the factory
   */
  registerPrinterType(
    type: PrinterType,
    constructor: PrinterConstructor,
    validator?: (config: PrinterConfig) => boolean
  ): void {
    this.printerRegistry.set(type, constructor);
    
    if (validator) {
      this.configValidators.set(type, validator);
    }
  }

  /**
   * Create a printer instance based on configuration
   */
  createPrinter(config: PrinterConfig): IPrinter {
    // Validate the configuration first
    if (!this.validateConfig(config)) {
      throw new PrinterError(
        `Invalid configuration for printer type: ${config.type}`,
        PrinterErrorCode.INVALID_CONFIG
      );
    }

    const PrinterClass = this.printerRegistry.get(config.type);
    
    if (!PrinterClass) {
      throw new PrinterError(
        `Unsupported printer type: ${config.type}`,
        PrinterErrorCode.UNSUPPORTED_OPERATION
      );
    }

    try {
      return new PrinterClass(config.id, config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new PrinterError(
        `Failed to create printer instance: ${errorMessage}`,
        PrinterErrorCode.INVALID_CONFIG,
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get all supported printer types
   */
  getSupportedTypes(): string[] {
    return Array.from(this.printerRegistry.keys());
  }

  /**
   * Validate printer configuration
   */
  validateConfig(config: PrinterConfig): boolean {
    try {
      // Basic validation
      if (!this.validateBasicConfig(config)) {
        return false;
      }

      // Type-specific validation
      const validator = this.configValidators.get(config.type);
      if (validator && !validator(config)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Config validation error:', error);
      return false;
    }
  }

  /**
   * Basic configuration validation that applies to all printer types
   */
  private validateBasicConfig(config: PrinterConfig): boolean {
    // Required fields
    if (!config.id || !config.name || !config.type || !config.connectionString) {
      return false;
    }

    // Validate printer type
    if (!Object.values(PrinterType).includes(config.type)) {
      return false;
    }

    // Validate connection type
    if (!Object.values(PrinterConnectionType).includes(config.connectionType)) {
      return false;
    }

    // Validate paper size
    if (!Object.values(PaperSize).includes(config.paperSize)) {
      return false;
    }

    // Validate numeric fields
    if (config.timeout && (config.timeout < 0 || config.timeout > 60000)) {
      return false;
    }

    if (config.retryAttempts && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
      return false;
    }

    return true;
  }

  /**
   * CBX POS 89E specific configuration validation
   */
  private validateCbxPos89eConfig = (config: PrinterConfig): boolean => {
    // CBX POS 89E supports specific paper sizes
    const supportedSizes = [
      PaperSize.MM_80,
      PaperSize.MM_58,
      PaperSize.MM_57
    ];

    if (!supportedSizes.includes(config.paperSize)) {
      return false;
    }

    // Validate connection string format based on connection type
    switch (config.connectionType) {
      case PrinterConnectionType.USB:
        // USB connection should be a printer name or device path
        return this.validateUSBConnection(config.connectionString);
      
      case PrinterConnectionType.SERIAL:
        // Serial connection should be a COM port (Windows) or device path (Unix)
        return this.validateSerialConnection(config.connectionString);
      
      case PrinterConnectionType.NETWORK:
        // Network connection should be IP:port format
        return this.validateNetworkConnection(config.connectionString);
      
      default:
        return false;
    }
  };

  /**
   * Generic ESC/POS printer configuration validation
   */
  private validateGenericEscPosConfig = (config: PrinterConfig): boolean => {
    // Generic ESC/POS printers are more flexible with paper sizes
    return true; // Basic validation is sufficient
  };

  /**
   * Validate USB connection string
   */
  private validateUSBConnection(connectionString: string): boolean {
    // Windows: Printer name or USB\VID_xxxx&PID_xxxx format
    // Unix: /dev/usb/lp0 or similar
    if (!connectionString || connectionString.length === 0) {
      return false;
    }

    // Allow printer names and device paths
    return connectionString.length > 0 && connectionString.length < 256;
  }

  /**
   * Validate serial connection string
   */
  private validateSerialConnection(connectionString: string): boolean {
    // Windows: COM1, COM2, etc.
    // Unix: /dev/ttyUSB0, /dev/ttyACM0, etc.
    if (!connectionString) {
      return false;
    }

    const windowsPattern = /^COM\d+$/i;
    const unixPattern = /^\/dev\/(tty(USB|ACM|S)\d+|cu\..+)$/;

    return windowsPattern.test(connectionString) || unixPattern.test(connectionString);
  }

  /**
   * Validate network connection string
   */
  private validateNetworkConnection(connectionString: string): boolean {
    // Format: IP:port or hostname:port
    if (!connectionString) {
      return false;
    }

    const parts = connectionString.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [host, portStr] = parts;
    const port = parseInt(portStr, 10);

    // Validate host (basic check)
    if (!host || host.length === 0) {
      return false;
    }

    // Validate port
    if (isNaN(port) || port < 1 || port > 65535) {
      return false;
    }

    return true;
  }

  /**
   * Create a default configuration template for a printer type
   */
  createDefaultConfig(type: PrinterType, overrides: Partial<PrinterConfig> = {}): PrinterConfig {
    const baseConfig: PrinterConfig = {
      id: overrides.id || `printer_${Date.now()}`,
      name: overrides.name || `${type} Printer`,
      type,
      connectionType: PrinterConnectionType.USB,
      connectionString: '',
      paperSize: PaperSize.MM_80,
      characterSet: 'UTF-8',
      timeout: 5000,
      retryAttempts: 3,
      isDefault: false,
      ...overrides
    };

    // Type-specific defaults
    switch (type) {
      case PrinterType.CBX_POS_89E:
        baseConfig.name = overrides.name || 'CBX POS 89E Printer';
        baseConfig.paperSize = overrides.paperSize || PaperSize.MM_80;
        break;

      case PrinterType.GENERIC_ESC_POS:
        baseConfig.name = overrides.name || 'Generic ESC/POS Printer';
        break;
    }

    return baseConfig;
  }

  /**
   * Get printer type recommendations based on connection string
   */
  detectPrinterType(connectionString: string): PrinterType[] {
    const recommendations: PrinterType[] = [];

    // Simple heuristics for printer type detection
    if (connectionString.toLowerCase().includes('cbx') || 
        connectionString.toLowerCase().includes('pos') ||
        connectionString.toLowerCase().includes('89e')) {
      recommendations.push(PrinterType.CBX_POS_89E);
    }

    // Always include generic as fallback
    recommendations.push(PrinterType.GENERIC_ESC_POS);

    return recommendations;
  }

  /**
   * Validate if a printer type is supported
   */
  isTypeSupported(type: PrinterType): boolean {
    return this.printerRegistry.has(type);
  }

  /**
   * Get detailed information about a printer type
   */
  getTypeInfo(type: PrinterType): any {
    const info: any = {
      type,
      supported: this.isTypeSupported(type),
      hasValidator: this.configValidators.has(type)
    };

    switch (type) {
      case PrinterType.CBX_POS_89E:
        info.description = 'CBX POS 89E Thermal Printer';
        info.supportedPaperSizes = [PaperSize.MM_80, PaperSize.MM_58, PaperSize.MM_57];
        info.supportedConnections = [
          PrinterConnectionType.USB,
          PrinterConnectionType.SERIAL,
          PrinterConnectionType.NETWORK
        ];
        break;

      case PrinterType.GENERIC_ESC_POS:
        info.description = 'Generic ESC/POS Compatible Printer';
        info.supportedPaperSizes = Object.values(PaperSize);
        info.supportedConnections = Object.values(PrinterConnectionType);
        break;
    }

    return info;
  }
}