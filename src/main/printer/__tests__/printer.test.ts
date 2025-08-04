/**
 * Thermal Printer Control System - Basic Tests
 * 
 * This module contains basic tests for the thermal printer control system.
 * These tests focus on configuration validation and service initialization.
 */

import {
  PrinterFactory,
  ConfigManager,
  PrinterService,
  createCbxPos89eConfig,
  PrinterType,
  PrinterConnectionType,
  PaperSize
} from '../index';

describe('Thermal Printer Control System', () => {
  describe('PrinterFactory', () => {
    let factory: PrinterFactory;

    beforeEach(() => {
      factory = new PrinterFactory();
    });

    test('should support CBX POS 89E printer type', () => {
      const supportedTypes = factory.getSupportedTypes();
      expect(supportedTypes).toContain(PrinterType.CBX_POS_89E);
    });

    test('should validate valid CBX POS 89E configuration', () => {
      const config = createCbxPos89eConfig(
        'Test Printer',
        'CBX POS 89E Printer',
        {
          connectionType: PrinterConnectionType.USB,
          paperSize: PaperSize.MM_80
        }
      );

      expect(factory.validateConfig(config)).toBe(true);
    });

    test('should reject invalid configuration', () => {
      const invalidConfig = {
        id: '',
        name: '',
        type: 'invalid_type' as PrinterType,
        connectionType: PrinterConnectionType.USB,
        connectionString: '',
        paperSize: PaperSize.MM_80
      };

      expect(factory.validateConfig(invalidConfig)).toBe(false);
    });

    test('should create printer instance for valid configuration', () => {
      const config = createCbxPos89eConfig(
        'Test Printer',
        'CBX POS 89E Printer'
      );

      expect(() => factory.createPrinter(config)).not.toThrow();
    });
  });

  describe('Configuration Helper', () => {
    test('should create valid CBX POS 89E configuration', () => {
      const config = createCbxPos89eConfig(
        'Test Printer',
        'CBX POS 89E Printer',
        {
          paperSize: PaperSize.MM_58,
          timeout: 5000,
          isDefault: true
        }
      );

      expect(config.name).toBe('Test Printer');
      expect(config.type).toBe(PrinterType.CBX_POS_89E);
      expect(config.connectionString).toBe('CBX POS 89E Printer');
      expect(config.paperSize).toBe(PaperSize.MM_58);
      expect(config.timeout).toBe(5000);
      expect(config.isDefault).toBe(true);
      expect(config.id).toBeDefined();
    });

    test('should use default values for optional parameters', () => {
      const config = createCbxPos89eConfig(
        'Default Printer',
        'CBX POS 89E Printer'
      );

      expect(config.connectionType).toBe(PrinterConnectionType.USB);
      expect(config.paperSize).toBe(PaperSize.MM_80);
      expect(config.characterSet).toBe('UTF-8');
      expect(config.timeout).toBe(3000);
      expect(config.retryAttempts).toBe(3);
      expect(config.isDefault).toBe(false);
    });
  });

  describe('PrinterService', () => {
    let service: PrinterService;

    beforeEach(() => {
      service = new PrinterService();
    });

    afterEach(async () => {
      try {
        await service.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    });

    test('should initialize without errors', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    test('should create configuration templates', () => {
      const template = service.createConfigTemplate(PrinterType.CBX_POS_89E);

      expect(template.type).toBe(PrinterType.CBX_POS_89E);
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.connectionType).toBeDefined();
      expect(template.paperSize).toBeDefined();
    });

    test('should list printers after initialization', async () => {
      await service.initialize();
      const printers = service.listPrinters();
      
      expect(Array.isArray(printers)).toBe(true);
      // Initially should be empty since no printers are configured
      expect(printers.length).toBe(0);
    });

    test('should handle discovery request without errors', async () => {
      await service.initialize();
      
      // Discovery might fail if no printers are available, but shouldn't throw
      await expect(service.discoverPrinters()).resolves.toBeDefined();
    });
  });

  describe('ConfigManager', () => {
    let configManager: ConfigManager;

    beforeEach(() => {
      configManager = new ConfigManager();
    });

    test('should create configuration templates', () => {
      const template = configManager.getConfigTemplate(PrinterType.CBX_POS_89E);

      expect(template.type).toBe(PrinterType.CBX_POS_89E);
      expect(template.name).toContain('CBX POS 89E');
      expect(template.paperSize).toBe(PaperSize.MM_80);
      expect(template.timeout).toBe(3000);
    });

    test('should validate configuration correctly', async () => {
      const validConfig = createCbxPos89eConfig(
        'Test Printer',
        'CBX POS 89E Printer'
      );

      await expect(configManager.validateConfig(validConfig)).resolves.toBe(true);
    });

    test('should reject invalid configuration', async () => {
      const invalidConfig = {
        id: '',
        name: '',
        type: 'invalid' as PrinterType,
        connectionType: PrinterConnectionType.USB,
        connectionString: '',
        paperSize: PaperSize.MM_80
      };

      await expect(configManager.validateConfig(invalidConfig)).resolves.toBe(false);
    });

    test('should export empty configuration as JSON', async () => {
      const exported = await configManager.exportConfigs();
      const parsed = JSON.parse(exported);

      expect(parsed.version).toBe('1.0');
      expect(parsed.configurations).toEqual([]);
      expect(parsed.exportDate).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should create complete printer workflow', async () => {
      const service = new PrinterService();

      try {
        // Initialize service
        await service.initialize();

        // Create configuration
        const config = createCbxPos89eConfig(
          'Integration Test Printer',
          'CBX POS 89E Printer',
          { isDefault: true }
        );

        // Add printer (will fail if no actual printer, but should validate config)
        // This test verifies the workflow without requiring actual hardware
        expect(() => service.createConfigTemplate(PrinterType.CBX_POS_89E)).not.toThrow();
        
        // Test discovery
        const discoveredPrinters = await service.discoverPrinters();
        expect(Array.isArray(discoveredPrinters)).toBe(true);

        // Test configuration export
        const exported = await service.exportConfigurations();
        expect(typeof exported).toBe('string');
        expect(() => JSON.parse(exported)).not.toThrow();

      } finally {
        await service.shutdown();
      }
    });
  });
});

// Mock tests for scenarios that require actual hardware
describe('Hardware Mock Tests', () => {
  test('should handle printer not found gracefully', async () => {
    const service = new PrinterService();
    await service.initialize();

    try {
      // This should fail gracefully when no printer is available
      await expect(service.quickPrint('test')).rejects.toThrow();
    } finally {
      await service.shutdown();
    }
  });

  test('should handle printer test failure gracefully', async () => {
    const service = new PrinterService();
    await service.initialize();

    try {
      // This should return false when no printer is available
      const result = await service.testPrinter('nonexistent-printer');
      expect(result).toBe(false);
    } finally {
      await service.shutdown();
    }
  });
});