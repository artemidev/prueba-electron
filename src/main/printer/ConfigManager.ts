/**
 * Configuration Manager Implementation
 * 
 * This module implements the Repository pattern for printer configuration persistence.
 * It handles saving, loading, and validating printer configurations with support for
 * file-based storage and configuration templates.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import {
  IConfigManager,
  PrinterConfig,
  PrinterError,
  PrinterErrorCode,
  PrinterType,
  PrinterConnectionType,
  PaperSize
} from './interfaces';

export class ConfigManager implements IConfigManager {
  private configDir: string;
  private configFile: string;
  private defaultConfigId: string | null = null;
  private configCache = new Map<string, PrinterConfig>();

  constructor() {
    // Use Electron's userData directory for configuration storage
    this.configDir = path.join(app.getPath('userData'), 'printer-configs');
    this.configFile = path.join(this.configDir, 'printers.json');
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });
      
      // Load existing configurations
      await this.loadConfigurationsFromFile();
    } catch (error) {
      throw new PrinterError(
        'Failed to initialize configuration manager',
        PrinterErrorCode.INVALID_CONFIG,
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Save printer configuration
   */
  async saveConfig(config: PrinterConfig): Promise<void> {
    try {
      // Validate configuration before saving
      if (!await this.validateConfig(config)) {
        throw new PrinterError(
          'Invalid printer configuration',
          PrinterErrorCode.INVALID_CONFIG,
          config.id
        );
      }

      // Update cache
      this.configCache.set(config.id, { ...config });

      // If this is marked as default, update default ID
      if (config.isDefault) {
        // Clear other default configs
        for (const [id, existingConfig] of this.configCache.entries()) {
          if (id !== config.id && existingConfig.isDefault) {
            existingConfig.isDefault = false;
          }
        }
        this.defaultConfigId = config.id;
      }

      // Save to file
      await this.saveConfigurationsToFile();
    } catch (error) {
      throw new PrinterError(
        `Failed to save printer configuration: ${error instanceof Error ? error.message : String(error)}`,
        PrinterErrorCode.INVALID_CONFIG,
        config.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Load printer configuration by ID
   */
  async loadConfig(id: string): Promise<PrinterConfig | null> {
    return this.configCache.get(id) || null;
  }

  /**
   * Load all printer configurations
   */
  async loadAllConfigs(): Promise<PrinterConfig[]> {
    return Array.from(this.configCache.values());
  }

  /**
   * Delete printer configuration
   */
  async deleteConfig(id: string): Promise<void> {
    try {
      if (!this.configCache.has(id)) {
        throw new PrinterError(
          `Configuration '${id}' not found`,
          PrinterErrorCode.PRINTER_NOT_FOUND,
          id
        );
      }

      // Remove from cache
      this.configCache.delete(id);

      // Update default if necessary
      if (this.defaultConfigId === id) {
        const nextKey = this.configCache.keys().next();
        this.defaultConfigId = this.configCache.size > 0 && !nextKey.done
          ? nextKey.value 
          : null;
      }

      // Save to file
      await this.saveConfigurationsToFile();
    } catch (error) {
      throw new PrinterError(
        `Failed to delete configuration: ${error instanceof Error ? error.message : String(error)}`,
        PrinterErrorCode.INVALID_CONFIG,
        id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get default printer configuration
   */
  async getDefaultConfig(): Promise<PrinterConfig | null> {
    return this.defaultConfigId ? this.configCache.get(this.defaultConfigId) || null : null;
  }

  /**
   * Set default printer configuration
   */
  async setDefaultConfig(id: string): Promise<void> {
    const config = this.configCache.get(id);
    
    if (!config) {
      throw new PrinterError(
        `Configuration '${id}' not found`,
        PrinterErrorCode.PRINTER_NOT_FOUND,
        id
      );
    }

    // Clear existing default
    if (this.defaultConfigId && this.defaultConfigId !== id) {
      const oldDefault = this.configCache.get(this.defaultConfigId);
      if (oldDefault) {
        oldDefault.isDefault = false;
      }
    }

    // Set new default
    config.isDefault = true;
    this.defaultConfigId = id;

    // Save changes
    await this.saveConfigurationsToFile();
  }

  /**
   * Validate printer configuration
   */
  async validateConfig(config: PrinterConfig): Promise<boolean> {
    try {
      // Required fields
      if (!config.id || !config.name || !config.type || !config.connectionString) {
        return false;
      }

      // Validate enums
      if (!Object.values(PrinterType).includes(config.type)) {
        return false;
      }

      if (!Object.values(PrinterConnectionType).includes(config.connectionType)) {
        return false;
      }

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
    } catch (error) {
      return false;
    }
  }

  /**
   * Get configuration template for a printer type
   */
  getConfigTemplate(type: string): PrinterConfig {
    const printerType = type as PrinterType;
    
    const baseTemplate: PrinterConfig = {
      id: `template_${printerType}_${Date.now()}`,
      name: `${printerType} Printer`,
      type: printerType,
      connectionType: PrinterConnectionType.USB,
      connectionString: '',
      paperSize: PaperSize.MM_80,
      characterSet: 'UTF-8',
      timeout: 5000,
      retryAttempts: 3,
      isDefault: false
    };

    // Type-specific customizations
    switch (printerType) {
      case PrinterType.CBX_POS_89E:
        return {
          ...baseTemplate,
          name: 'CBX POS 89E Thermal Printer',
          paperSize: PaperSize.MM_80,
          timeout: 3000
        };

      case PrinterType.EPSON:
        return {
          ...baseTemplate,
          name: 'Epson Thermal Printer',
          paperSize: PaperSize.MM_80,
          timeout: 4000
        };

      case PrinterType.STAR:
        return {
          ...baseTemplate,
          name: 'Star Thermal Printer',
          paperSize: PaperSize.MM_80,
          timeout: 4000
        };

      case PrinterType.GENERIC_ESC_POS:
        return {
          ...baseTemplate,
          name: 'Generic ESC/POS Printer',
          paperSize: PaperSize.MM_80,
          timeout: 5000
        };

      default:
        return baseTemplate;
    }
  }

  /**
   * Export all configurations as JSON string
   */
  async exportConfigs(): Promise<string> {
    const configs = Array.from(this.configCache.values());
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      defaultConfigId: this.defaultConfigId,
      configurations: configs
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configurations from JSON string
   */
  async importConfigs(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.configurations || !Array.isArray(importData.configurations)) {
        throw new Error('Invalid import data format');
      }

      // Validate all configurations before importing
      for (const config of importData.configurations) {
        if (!await this.validateConfig(config)) {
          throw new Error(`Invalid configuration: ${config.id || 'unknown'}`);
        }
      }

      // Clear existing configurations
      this.configCache.clear();

      // Import configurations
      for (const config of importData.configurations) {
        this.configCache.set(config.id, config);
      }

      // Set default configuration
      if (importData.defaultConfigId && this.configCache.has(importData.defaultConfigId)) {
        this.defaultConfigId = importData.defaultConfigId;
      } else if (this.configCache.size > 0) {
        // Set first configuration as default if no default specified
        const firstKey = this.configCache.keys().next();
        if (!firstKey.done) {
          this.defaultConfigId = firstKey.value;
          const defaultConfig = this.configCache.get(this.defaultConfigId);
          if (defaultConfig) {
            defaultConfig.isDefault = true;
          }
        }
      }

      // Save imported configurations
      await this.saveConfigurationsToFile();
    } catch (error) {
      throw new PrinterError(
        `Failed to import configurations: ${error instanceof Error ? error.message : String(error)}`,
        PrinterErrorCode.INVALID_CONFIG,
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Load configurations from file
   */
  private async loadConfigurationsFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.configFile, 'utf-8');
      const configData = JSON.parse(data);

      if (configData.configurations && Array.isArray(configData.configurations)) {
        this.configCache.clear();
        
        for (const config of configData.configurations) {
          this.configCache.set(config.id, config);
        }

        this.defaultConfigId = configData.defaultConfigId ?? null;
      }
    } catch (error) {
      // File doesn't exist or is invalid - start with empty configuration
      this.configCache.clear();
      this.defaultConfigId = null;
    }
  }

  /**
   * Save configurations to file
   */
  private async saveConfigurationsToFile(): Promise<void> {
    const configs = Array.from(this.configCache.values());
    const configData = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      defaultConfigId: this.defaultConfigId,
      configurations: configs
    };

    await fs.writeFile(this.configFile, JSON.stringify(configData, null, 2), 'utf-8');
  }

  /**
   * Get predefined connection templates
   */
  getConnectionTemplates(): Array<{type: PrinterConnectionType, examples: string[]}> {
    return [
      {
        type: PrinterConnectionType.USB,
        examples: [
          'CBX POS 89E Printer',
          'Generic USB Printer',
          'Thermal Printer USB'
        ]
      },
      {
        type: PrinterConnectionType.SERIAL,
        examples: [
          'COM1',
          'COM2',
          '/dev/ttyUSB0',
          '/dev/ttyACM0'
        ]
      },
      {
        type: PrinterConnectionType.NETWORK,
        examples: [
          '192.168.1.100:9100',
          '10.0.0.50:9100',
          'printer.local:9100'
        ]
      },
      {
        type: PrinterConnectionType.BLUETOOTH,
        examples: [
          'Bluetooth:CBX-POS-89E',
          'BT:ThermalPrinter'
        ]
      }
    ];
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    try {
      await this.saveConfigurationsToFile();
    } catch (error) {
      console.warn('Failed to save configurations during disposal:', error);
    }
    
    this.configCache.clear();
    this.defaultConfigId = null;
  }
}