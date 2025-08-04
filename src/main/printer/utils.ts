/**
 * Thermal Printer Control System - Utility Functions
 * 
 * This module provides convenience functions for common printer operations
 * and configuration creation.
 */

import {
  PrinterService,
  PrinterConfig,
  PrinterType,
  PrinterConnectionType,
  PaperSize,
  PrintContent,
  TextAlignment,
  FontStyle,
  FontSize
} from './interfaces';

/**
 * Create a new printer service with default configuration
 */
export function createPrinterService(): PrinterService {
  return new PrinterService();
}

/**
 * Create a CBX POS 89E printer configuration with sensible defaults
 */
export function createCbxPos89eConfig(
  name: string,
  connectionString: string,
  options: Partial<PrinterConfig> = {}
): PrinterConfig {
  return {
    id: options.id || `cbx_${Date.now()}`,
    name,
    type: PrinterType.CBX_POS_89E,
    connectionType: options.connectionType || PrinterConnectionType.USB,
    connectionString,
    paperSize: options.paperSize || PaperSize.MM_80,
    characterSet: options.characterSet || 'UTF-8',
    timeout: options.timeout || 3000,
    retryAttempts: options.retryAttempts || 3,
    isDefault: options.isDefault || false,
    ...options
  };
}

/**
 * Create a quick print function bound to a specific printer
 */
export function createQuickPrintFunction(
  service: PrinterService,
  printerId?: string
) {
  return async (text: string): Promise<string> => {
    return await service.quickPrint(text, printerId);
  };
}

/**
 * Create formatted receipt content
 */
export function createReceiptContent(
  title: string,
  items: Array<{ name: string; price: string; qty?: number }>,
  total: string,
  options: {
    storeName?: string;
    address?: string;
    phone?: string;
    footer?: string;
  } = {}
): PrintContent[] {
  const content: PrintContent[] = [];

  // Header
  if (options.storeName) {
    content.push({
      type: 'text',
      content: options.storeName,
      format: { alignment: TextAlignment.CENTER, style: FontStyle.BOLD, size: FontSize.LARGE }
    });
  }

  if (options.address) {
    content.push({
      type: 'text',
      content: options.address,
      format: { alignment: TextAlignment.CENTER }
    });
  }

  if (options.phone) {
    content.push({
      type: 'text',
      content: options.phone,
      format: { alignment: TextAlignment.CENTER }
    });
  }

  // Separator
  content.push({
    type: 'line',
    character: '=',
    length: 48
  });

  // Title
  content.push({
    type: 'text',
    content: title,
    format: { alignment: TextAlignment.CENTER, style: FontStyle.BOLD }
  });

  content.push({ type: 'feed', lines: 1 });

  // Items
  for (const item of items) {
    const qtyText = item.qty ? `${item.qty}x ` : '';
    const itemLine = `${qtyText}${item.name}`;
    const pricePadding = 48 - itemLine.length - item.price.length;
    const paddedLine = itemLine + ' '.repeat(Math.max(1, pricePadding)) + item.price;
    
    content.push({
      type: 'text',
      content: paddedLine
    });
  }

  // Total
  content.push({
    type: 'line',
    character: '-',
    length: 48
  });

  const totalLine = 'TOTAL:';
  const totalPadding = 48 - totalLine.length - total.length;
  const paddedTotal = totalLine + ' '.repeat(Math.max(1, totalPadding)) + total;

  content.push({
    type: 'text',
    content: paddedTotal,
    format: { style: FontStyle.BOLD }
  });

  // Footer
  content.push({ type: 'feed', lines: 1 });
  content.push({
    type: 'text',
    content: `Date: ${new Date().toLocaleString()}`,
    format: { alignment: TextAlignment.CENTER }
  });

  if (options.footer) {
    content.push({ type: 'feed', lines: 1 });
    content.push({
      type: 'text',
      content: options.footer,
      format: { alignment: TextAlignment.CENTER }
    });
  }

  // Cut paper
  content.push({ type: 'feed', lines: 3 });
  content.push({ type: 'cut', partial: false });

  return content;
}

/**
 * Create a test print content for printer verification
 */
export function createTestPrintContent(printerName: string): PrintContent[] {
  return [
    {
      type: 'text',
      content: '*** PRINTER TEST ***',
      format: { alignment: TextAlignment.CENTER, style: FontStyle.BOLD }
    },
    { type: 'feed', lines: 1 },
    {
      type: 'text',
      content: `Printer: ${printerName}`
    },
    {
      type: 'text',
      content: `Test Time: ${new Date().toLocaleString()}`
    },
    { type: 'feed', lines: 1 },
    {
      type: 'text',
      content: 'Text Formatting Tests:'
    },
    {
      type: 'text',
      content: 'Normal text'
    },
    {
      type: 'text',
      content: 'Bold text',
      format: { style: FontStyle.BOLD }
    },
    {
      type: 'text',
      content: 'Underlined text',
      format: { style: FontStyle.UNDERLINE }
    },
    {
      type: 'text',
      content: 'Large text',
      format: { size: FontSize.LARGE }
    },
    { type: 'feed', lines: 1 },
    {
      type: 'text',
      content: 'Alignment Tests:'
    },
    {
      type: 'text',
      content: 'Left aligned',
      format: { alignment: TextAlignment.LEFT }
    },
    {
      type: 'text',
      content: 'Center aligned',
      format: { alignment: TextAlignment.CENTER }
    },
    {
      type: 'text',
      content: 'Right aligned',
      format: { alignment: TextAlignment.RIGHT }
    },
    { type: 'feed', lines: 1 },
    {
      type: 'line',
      character: '=',
      length: 48
    },
    {
      type: 'text',
      content: 'Test completed successfully!',
      format: { alignment: TextAlignment.CENTER }
    },
    { type: 'feed', lines: 3 },
    { type: 'cut', partial: false }
  ];
}

/**
 * Validate connection string format
 */
export function validateConnectionString(
  connectionString: string,
  connectionType: PrinterConnectionType
): boolean {
  if (!connectionString || connectionString.length === 0) {
    return false;
  }

  switch (connectionType) {
    case PrinterConnectionType.USB:
      return connectionString.length > 0 && connectionString.length < 256;

    case PrinterConnectionType.SERIAL:
      const windowsPattern = /^COM\d+$/i;
      const unixPattern = /^\/dev\/(tty(USB|ACM|S)\d+|cu\..+)$/;
      return windowsPattern.test(connectionString) || unixPattern.test(connectionString);

    case PrinterConnectionType.NETWORK:
      const parts = connectionString.split(':');
      if (parts.length !== 2) return false;
      
      const [host, portStr] = parts;
      const port = parseInt(portStr, 10);
      
      return host.length > 0 && !isNaN(port) && port > 0 && port <= 65535;

    case PrinterConnectionType.BLUETOOTH:
      return connectionString.includes(':') || connectionString.toLowerCase().includes('bt');

    default:
      return false;
  }
}

/**
 * Get common printer connection examples
 */
export function getConnectionExamples(type: PrinterConnectionType): string[] {
  switch (type) {
    case PrinterConnectionType.USB:
      return [
        'CBX POS 89E Printer',
        'Generic USB Printer',
        'Thermal Receipt Printer'
      ];

    case PrinterConnectionType.SERIAL:
      return [
        'COM1',
        'COM2',
        '/dev/ttyUSB0',
        '/dev/ttyACM0'
      ];

    case PrinterConnectionType.NETWORK:
      return [
        '192.168.1.100:9100',
        '10.0.0.50:9100',
        'printer.local:9100'
      ];

    case PrinterConnectionType.BLUETOOTH:
      return [
        'Bluetooth:CBX-POS-89E',
        'BT:ThermalPrinter',
        'CBX-89E-BT'
      ];

    default:
      return [];
  }
}

/**
 * Format error message for user display
 */
export function formatPrinterError(error: any): string {
  if (error && typeof error === 'object') {
    if ('code' in error && 'message' in error) {
      return `${error.code}: ${error.message}`;
    }
    if ('message' in error) {
      return error.message;
    }
  }
  
  return String(error);
}

/**
 * Create a simple barcode content
 */
export function createBarcodeContent(
  data: string,
  format: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC_A' | 'UPC_E' = 'CODE128'
): PrintContent[] {
  return [
    { type: 'feed', lines: 1 },
    {
      type: 'barcode',
      data,
      format,
      height: 60,
      width: 2,
      includeText: true
    },
    { type: 'feed', lines: 2 }
  ];
}

/**
 * Create a QR code content
 */
export function createQRCodeContent(
  data: string,
  size: number = 6,
  errorLevel: 'L' | 'M' | 'Q' | 'H' = 'M'
): PrintContent[] {
  return [
    { type: 'feed', lines: 1 },
    {
      type: 'qrcode',
      data,
      size,
      errorLevel
    },
    { type: 'feed', lines: 2 }
  ];
}