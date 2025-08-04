/**
 * Printer Registry Implementation
 *
 * This module implements the Registry pattern for managing multiple printer instances.
 * It provides centralized printer management, configuration persistence, and discovery.
 */

import { EventEmitter } from 'events';
import {
  IPrinter,
  IPrinterFactory,
  IPrinterRegistry,
  PrinterConfig,
  PrinterConnectionType,
  PrinterDiscoveryResult,
  PrinterError,
  PrinterErrorCode,
  PrinterType,
} from './interfaces';
import { PrinterFactory } from './PrinterFactory';

export class PrinterRegistry extends EventEmitter implements IPrinterRegistry {
  private printers = new Map<string, IPrinter>();

  private configs = new Map<string, PrinterConfig>();

  private defaultPrinterId: string | null = null;

  private factory: IPrinterFactory;

  constructor(factory?: IPrinterFactory) {
    super();
    this.factory = factory || new PrinterFactory();
  }

  /**
   * Register a new printer with the registry
   */
  async registerPrinter(config: PrinterConfig): Promise<string> {
    try {
      // Validate configuration
      if (!this.factory.validateConfig(config)) {
        throw new PrinterError(
          'Invalid printer configuration',
          PrinterErrorCode.INVALID_CONFIG,
        );
      }

      // Check for duplicate IDs
      if (this.printers.has(config.id)) {
        throw new PrinterError(
          `Printer with ID '${config.id}' already exists`,
          PrinterErrorCode.INVALID_CONFIG,
        );
      }

      // Create printer instance
      const printer = this.factory.createPrinter(config);

      // Store printer and config
      this.printers.set(config.id, printer);

      this.configs.set(config.id, { ...config });

      // Set up event forwarding
      this.setupPrinterEventForwarding(printer);

      // Set as default if specified or if it's the first printer
      if (config.isDefault || this.printers.size === 1) {
        this.defaultPrinterId = config.id;
      }

      // Emit registration event
      this.emit('printer_registered', {
        type: 'printer_registered',
        printerId: config.id,
        timestamp: new Date(),
        data: { config },
      });

      return config.id;
    } catch (error) {
      throw new PrinterError(
        `Failed to register printer: ${error.message}`,
        PrinterErrorCode.INVALID_CONFIG,
        config.id,
        error,
      );
    }
  }

  /**
   * Unregister a printer from the registry
   */
  async unregisterPrinter(id: string): Promise<void> {
    const printer = this.printers.get(id);

    if (!printer) {
      throw new PrinterError(
        `Printer '${id}' not found`,
        PrinterErrorCode.PRINTER_NOT_FOUND,
        id,
      );
    }

    try {
      // Dispose of printer resources
      await printer.dispose();

      // Remove from collections
      this.printers.delete(id);
      this.configs.delete(id);

      // Update default printer if necessary
      if (this.defaultPrinterId === id) {
        this.defaultPrinterId =
          this.printers.size > 0 ? this.printers.keys().next().value : null;
      }

      // Emit unregistration event
      this.emit('printer_unregistered', {
        type: 'printer_unregistered',
        printerId: id,
        timestamp: new Date(),
      });
    } catch (error) {
      throw new PrinterError(
        `Failed to unregister printer: ${error.message}`,
        PrinterErrorCode.CONNECTION_FAILED,
        id,
        error,
      );
    }
  }

  /**
   * Get a printer instance by ID
   */
  getPrinter(id: string): IPrinter | null {
    return this.printers.get(id) || null;
  }

  /**
   * Get all registered printers
   */
  getAllPrinters(): IPrinter[] {
    return Array.from(this.printers.values());
  }

  /**
   * Get all available (connected) printers
   */
  getAvailablePrinters(): IPrinter[] {
    return Array.from(this.printers.values()).filter((printer) =>
      printer.isConnected(),
    );
  }

  /**
   * Set default printer
   */
  async setDefaultPrinter(id: string): Promise<void> {
    if (!this.printers.has(id)) {
      throw new PrinterError(
        `Printer '${id}' not found`,
        PrinterErrorCode.PRINTER_NOT_FOUND,
        id,
      );
    }

    const oldDefaultId = this.defaultPrinterId;
    this.defaultPrinterId = id;

    // Update config
    const config = this.configs.get(id);
    if (config) {
      config.isDefault = true;
    }

    // Clear old default
    if (oldDefaultId && oldDefaultId !== id) {
      const oldConfig = this.configs.get(oldDefaultId);
      if (oldConfig) {
        oldConfig.isDefault = false;
      }
    }

    this.emit('default_printer_changed', {
      type: 'default_printer_changed',
      printerId: id,
      timestamp: new Date(),
      data: { oldDefaultId, newDefaultId: id },
    });
  }

  /**
   * Get default printer
   */
  getDefaultPrinter(): IPrinter | null {
    return this.defaultPrinterId
      ? this.getPrinter(this.defaultPrinterId)
      : null;
  }

  /**
   * Update printer configuration
   */
  async updatePrinterConfig(
    id: string,
    updates: Partial<PrinterConfig>,
  ): Promise<void> {
    const currentConfig = this.configs.get(id);

    if (!currentConfig) {
      throw new PrinterError(
        `Printer '${id}' not found`,
        PrinterErrorCode.PRINTER_NOT_FOUND,
        id,
      );
    }

    // Create updated configuration
    const newConfig = { ...currentConfig, ...updates, id }; // Ensure ID cannot be changed

    // Validate new configuration
    if (!this.factory.validateConfig(newConfig)) {
      throw new PrinterError(
        'Invalid configuration update',
        PrinterErrorCode.INVALID_CONFIG,
        id,
      );
    }

    try {
      // Get current printer
      const currentPrinter = this.printers.get(id);

      if (currentPrinter) {
        // If printer is connected, disconnect it first
        const wasConnected = currentPrinter.isConnected();
        if (wasConnected) {
          await currentPrinter.disconnect();
        }

        // Dispose of old printer
        await currentPrinter.dispose();

        // Create new printer with updated config
        const newPrinter = this.factory.createPrinter(newConfig);
        this.printers.set(id, newPrinter);

        // Set up event forwarding for new printer
        this.setupPrinterEventForwarding(newPrinter);

        // Reconnect if it was connected before
        if (wasConnected) {
          await newPrinter.connect();
        }
      }

      // Update stored configuration
      this.configs.set(id, newConfig);

      this.emit('printer_config_updated', {
        type: 'printer_config_updated',
        printerId: id,
        timestamp: new Date(),
        data: { oldConfig: currentConfig, newConfig },
      });
    } catch (error) {
      throw new PrinterError(
        `Failed to update printer configuration: ${error.message}`,
        PrinterErrorCode.INVALID_CONFIG,
        id,
        error,
      );
    }
  }

  /**
   * Get printer configuration
   */
  getPrinterConfig(id: string): PrinterConfig | null {
    const config = this.configs.get(id);
    return config ? { ...config } : null; // Return copy to prevent modification
  }

  /**
   * Discover available printers
   */
  async discoverPrinters(): Promise<PrinterDiscoveryResult[]> {
    const results: PrinterDiscoveryResult[] = [];

    try {
      // USB printer discovery (CBX and other thermal printers)
      results.push(...(await this.discoverUSBPrinters()));

      // Platform-specific printer discovery
      if (process.platform === 'win32') {
        results.push(...(await this.discoverWindowsPrinters()));
      } else if (process.platform === 'darwin') {
        results.push(...(await this.discoverMacOSPrinters()));
      } else {
        results.push(...(await this.discoverLinuxPrinters()));
      }

      // Network printer discovery
      results.push(...(await this.discoverNetworkPrinters()));
    } catch (error) {
      console.warn('Printer discovery failed:', error);
    }

    return results;
  }

  /**
   * Validate a printer connection
   */
  async validatePrinter(id: string): Promise<boolean> {
    const printer = this.printers.get(id);

    if (!printer) {
      return false;
    }

    try {
      return await printer.selfTest();
    } catch (error) {
      return false;
    }
  }

  /**
   * Set up event forwarding from printer to registry
   */
  private setupPrinterEventForwarding(printer: IPrinter): void {
    const forwardEvent = (eventName: string) => {
      printer.on(eventName, (event) => {
        this.emit(eventName, event);
      });
    };

    // Forward all standard printer events
    forwardEvent('status_changed');
    forwardEvent('job_started');
    forwardEvent('job_completed');
    forwardEvent('job_failed');
    forwardEvent('connection_lost');
    forwardEvent('connection_restored');
    forwardEvent('error');
  }

  /**
   * USB printer discovery (Cross-platform)
   */
  private async discoverUSBPrinters(): Promise<PrinterDiscoveryResult[]> {
    const results: PrinterDiscoveryResult[] = [];

    try {
      const { execSync } = require('child_process');
      let usbDevices = '';

      if (process.platform === 'darwin') {
        // macOS: Use system_profiler to find USB devices
        try {
          usbDevices = execSync('system_profiler SPUSBDataType', {
            encoding: 'utf8',
          });

          // Look for CBX POS 89E or similar thermal printers
          const lines = usbDevices.split('\n');
          let currentDevice = '';
          let deviceInfo: any = {};

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.includes('Product ID:')) {
              deviceInfo.productId = trimmed.split(':')[1]?.trim();
            }
            if (trimmed.includes('Vendor ID:')) {
              deviceInfo.vendorId = trimmed.split(':')[1]?.trim();
            }
            if (
              trimmed.endsWith(':') &&
              !trimmed.includes('Product ID') &&
              !trimmed.includes('Vendor ID')
            ) {
              if (
                currentDevice &&
                this.isLikelyThermalPrinter(currentDevice, deviceInfo)
              ) {
                results.push({
                  id: `usb_${currentDevice.replace(/\s+/g, '_')}`,
                  name: currentDevice,
                  type: this.guessePrinterType(currentDevice),
                  connectionType: PrinterConnectionType.USB,
                  connectionString: currentDevice,
                  isAvailable: true,
                });
              }
              currentDevice = trimmed.replace(':', '');
              deviceInfo = {};
            }
          }

          // Check the last device
          if (
            currentDevice &&
            this.isLikelyThermalPrinter(currentDevice, deviceInfo)
          ) {
            results.push({
              id: `usb_${currentDevice.replace(/\s+/g, '_')}`,
              name: currentDevice,
              type: this.guessePrinterType(currentDevice),
              connectionType: PrinterConnectionType.USB,
              connectionString: currentDevice,
              isAvailable: true,
            });
          }
        } catch (error) {
          console.log('ℹ️  USB device enumeration not available');
        }
      } else if (process.platform === 'win32') {
        // Windows: Use PowerShell to find USB devices
        try {
          usbDevices = execSync(
            "powershell \"Get-WmiObject -Class Win32_PnPEntity | Where-Object {$_.Name -like '*printer*' -or $_.Name -like '*CBX*' -or $_.Name -like '*POS*'} | Select-Object Name, DeviceID\"",
            { encoding: 'utf8' },
          );

          const lines = usbDevices.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (
              trimmed &&
              !trimmed.startsWith('Name') &&
              !trimmed.startsWith('----') &&
              trimmed.length > 0
            ) {
              const parts = trimmed.split(/\s+/);
              const name = parts.slice(0, -1).join(' ');

              if (name && this.isLikelyThermalPrinter(name)) {
                results.push({
                  id: `usb_${name.replace(/\s+/g, '_')}`,
                  name,
                  type: this.guessePrinterType(name),
                  connectionType: PrinterConnectionType.USB,
                  connectionString: name,
                  isAvailable: true,
                });
              }
            }
          }
        } catch (error) {
          console.log('ℹ️  USB device enumeration not available on Windows');
        }
      } else {
        // Linux: Use lsusb to find USB devices
        try {
          usbDevices = execSync('lsusb', { encoding: 'utf8' });

          const lines = usbDevices.split('\n');
          for (const line of lines) {
            if (this.isLikelyThermalPrinter(line)) {
              const parts = line.split(' ');
              const name = parts.slice(6).join(' ');

              if (name) {
                results.push({
                  id: `usb_${name.replace(/\s+/g, '_')}`,
                  name,
                  type: this.guessePrinterType(name),
                  connectionType: PrinterConnectionType.USB,
                  connectionString: name,
                  isAvailable: true,
                });
              }
            }
          }
        } catch (error) {
          console.log('ℹ️  USB device enumeration not available on Linux');
        }
      }
    } catch (error) {
      console.log(
        'ℹ️  USB printer discovery completed (no USB printers found)',
      );
    }

    if (results.length > 0) {
      console.log(`🔌 Found ${results.length} USB printer(s)`);
    }

    return results;
  }

  /**
   * Check if a device name/description indicates it's likely a thermal printer
   */
  private isLikelyThermalPrinter(name: string, deviceInfo?: any): boolean {
    const nameLower = name.toLowerCase();

    // CBX POS 89E specific
    if (
      nameLower.includes('cbx') ||
      nameLower.includes('89e') ||
      nameLower.includes('pos')
    ) {
      return true;
    }

    // Common thermal printer brands/terms
    const thermalKeywords = [
      'thermal',
      'receipt',
      'pos',
      'epson',
      'star',
      'citizen',
      'zebra',
      'esc/pos',
      'tm-',
      'tsp',
      'rp',
      'ct-',
      'zd',
      'gk',
      'gx',
    ];

    return thermalKeywords.some((keyword) => nameLower.includes(keyword));
  }

  /**
   * Windows printer discovery
   */
  private async discoverWindowsPrinters(): Promise<PrinterDiscoveryResult[]> {
    const results: PrinterDiscoveryResult[] = [];

    try {
      // Use Windows WMI or registry to find printers
      // This is a simplified implementation - in practice, you'd use node-printer or similar
      const { execSync } = require('child_process');
      const output = execSync('wmic printer get name,portname', {
        encoding: 'utf8',
      });

      const lines = output.split('\n').slice(1); // Skip header

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[0];
          const port = parts[1];

          results.push({
            id: `discovered_${name.replace(/\s+/g, '_')}`,
            name,
            type: this.guessePrinterType(name),
            connectionType: this.guessConnectionType(port),
            connectionString: name,
            isAvailable: true,
          });
        }
      }
    } catch (error) {
      console.warn('Windows printer discovery failed:', error);
    }

    return results;
  }

  /**
   * macOS printer discovery
   */
  private async discoverMacOSPrinters(): Promise<PrinterDiscoveryResult[]> {
    const results: PrinterDiscoveryResult[] = [];

    try {
      const { execSync } = require('child_process');
      const output = execSync('lpstat -p', { encoding: 'utf8' });

      const lines = output.split('\n');

      for (const line of lines) {
        if (line.startsWith('printer ')) {
          const name = line.split(' ')[1];

          results.push({
            id: `discovered_${name}`,
            name,
            type: this.guessePrinterType(name),
            connectionType: PrinterConnectionType.USB,
            connectionString: name,
            isAvailable: true,
          });
        }
      }
    } catch (error: any) {
      // Handle "No destinations added" gracefully - this is normal when no printers are installed
      if (error.stderr && error.stderr.includes('No destinations added')) {
        console.log('ℹ️  No system printers found on macOS (this is normal)');
      } else {
        console.warn('macOS printer discovery failed:', error.message);
      }
    }

    return results;
  }

  /**
   * Linux printer discovery
   */
  private async discoverLinuxPrinters(): Promise<PrinterDiscoveryResult[]> {
    const results: PrinterDiscoveryResult[] = [];

    try {
      const { execSync } = require('child_process');
      const output = execSync('lpstat -p', { encoding: 'utf8' });

      const lines = output.split('\n');

      for (const line of lines) {
        if (line.startsWith('printer ')) {
          const name = line.split(' ')[1];

          results.push({
            id: `discovered_${name}`,
            name,
            type: this.guessePrinterType(name),
            connectionType: PrinterConnectionType.USB,
            connectionString: name,
            isAvailable: true,
          });
        }
      }
    } catch (error) {
      console.warn('Linux printer discovery failed:', error);
    }

    return results;
  }

  /**
   * Network printer discovery
   */
  private async discoverNetworkPrinters(): Promise<PrinterDiscoveryResult[]> {
    const results: PrinterDiscoveryResult[] = [];

    // This is a simplified implementation
    // In practice, you'd use network scanning, Bonjour/mDNS, or SNMP
    const commonIPs = [
      '192.168.1.100',
      '192.168.1.101',
      '192.168.0.100',
      '192.168.0.101',
    ];

    for (const ip of commonIPs) {
      try {
        // Simple port check for common printer ports
        const isAvailable = await this.checkNetworkPrinter(ip, 9100);

        if (isAvailable) {
          results.push({
            id: `network_${ip.replace(/\./g, '_')}`,
            name: `Network Printer (${ip})`,
            type: PrinterType.GENERIC_ESC_POS,
            connectionType: PrinterConnectionType.NETWORK,
            connectionString: `${ip}:9100`,
            isAvailable: true,
          });
        }
      } catch (error) {
        // Ignore individual failures
      }
    }

    return results;
  }

  /**
   * Check if a network printer is available
   */
  private async checkNetworkPrinter(
    ip: string,
    port: number,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 1000);

      socket.connect(port, ip, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  /**
   * Guess printer type from name
   */
  private guessePrinterType(name: string): PrinterType {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('cbx') || nameLower.includes('89e')) {
      return PrinterType.CBX_POS_89E;
    }

    if (nameLower.includes('epson')) {
      return PrinterType.EPSON;
    }

    if (nameLower.includes('star')) {
      return PrinterType.STAR;
    }

    return PrinterType.GENERIC_ESC_POS;
  }

  /**
   * Guess connection type from port information
   */
  private guessConnectionType(port: string): PrinterConnectionType {
    const portLower = port.toLowerCase();

    if (portLower.includes('usb') || portLower.includes('hid')) {
      return PrinterConnectionType.USB;
    }

    if (portLower.includes('com') || portLower.includes('tty')) {
      return PrinterConnectionType.SERIAL;
    }

    if (portLower.includes('ip') || /\d+\.\d+\.\d+\.\d+/.test(port)) {
      return PrinterConnectionType.NETWORK;
    }

    return PrinterConnectionType.USB; // Default assumption
  }

  /**
   * Clean up all resources
   */
  async dispose(): Promise<void> {
    const printers = Array.from(this.printers.values());

    // Dispose all printers in parallel
    await Promise.all(
      printers.map(async (printer) => {
        try {
          await printer.dispose();
        } catch (error) {
          console.warn(`Failed to dispose printer ${printer.id}:`, error);
        }
      }),
    );

    this.printers.clear();
    this.configs.clear();
    this.defaultPrinterId = null;
    this.removeAllListeners();
  }
}
