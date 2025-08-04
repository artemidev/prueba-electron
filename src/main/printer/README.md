# 🖨️ Thermal Printer Control System

A comprehensive thermal printer control system for Electron applications with first-class support for the **CBX POS 89E** thermal printer.

## 🌟 Features

- **Multi-Printer Support**: Built with extensibility in mind - supports CBX POS 89E and can be extended for other thermal printers
- **Design Patterns**: Uses Strategy, Factory, Registry, and Facade patterns for clean architecture
- **Dual Library Support**: 
  - `electron-pos-printer` for high-level operations
  - `node-thermal-printer` for low-level ESC/POS commands
- **Connection Types**: USB, Serial, Network, and Bluetooth support
- **Paper Sizes**: 80mm, 78mm, 76mm, 58mm, 57mm, 44mm
- **Rich Content**: Text formatting, barcodes, QR codes, images, tables
- **Error Handling**: Comprehensive error handling with detailed error codes
- **TypeScript**: Full TypeScript support with detailed type definitions

## 🚀 Quick Start

### 1. Basic Usage

```typescript
import { initializePrinterService, createCbxPos89eConfig } from './printer';

// Initialize the service
const printerService = await initializePrinterService();

// Quick Hello World (auto-configures CBX POS 89E)
await printerService.printHelloWorld();
```

### 2. CBX POS 89E Setup

```typescript
// Create configuration for CBX POS 89E
const config = createCbxPos89eConfig(
  'CBX POS 89E - Main',
  'CBX POS 89E Printer', // System printer name
  {
    connectionType: PrinterConnectionType.USB,
    paperSize: PaperSize.MM_80,
    isDefault: true
  }
);

// Add printer
const printerId = await printerService.addPrinter(config);

// Print Hello World
await printerService.printHelloWorld(printerId);
```

### 3. Advanced Printing

```typescript
const printContent = [
  {
    type: 'text',
    content: 'RECEIPT HEADER',
    format: { 
      alignment: TextAlignment.CENTER, 
      style: FontStyle.BOLD,
      size: FontSize.LARGE 
    }
  },
  { type: 'line', character: '=', length: 32 },
  { type: 'text', content: 'Item 1 ............ $10.00' },
  { type: 'text', content: 'Item 2 ............ $15.00' },
  { type: 'line', character: '-' },
  { 
    type: 'text', 
    content: 'TOTAL: $25.00',
    format: { style: FontStyle.BOLD }
  },
  { type: 'qrcode', data: 'https://example.com/receipt/123' },
  { type: 'feed', lines: 2 },
  { type: 'cut', partial: false }
];

await printerService.print(printerId, printContent);
```

## 🏗️ Architecture

The system is built using several design patterns:

### Strategy Pattern
- **IPrinter Interface**: Common contract for all printer types
- **CbxPos89ePrinter**: Concrete implementation for CBX POS 89E
- **BasePrinter**: Abstract base class with common functionality

### Factory Pattern
- **PrinterFactory**: Creates printer instances based on configuration
- **Auto-detection**: Automatically selects the correct printer implementation

### Registry Pattern
- **PrinterRegistry**: Manages multiple printer instances
- **Default Printer**: Supports setting and using default printers
- **Discovery**: Automatic printer discovery

### Facade Pattern
- **PrinterService**: Simplified interface for all printer operations
- **Configuration Management**: Unified configuration handling
- **Event System**: Centralized event handling

## 📁 Project Structure

```
src/main/printer/
├── index.ts                 # Main entry point
├── interfaces.ts            # Core interfaces and types
├── types.ts                 # Type definitions
├── PrinterService.ts        # Main service facade
├── PrinterFactory.ts        # Printer factory implementation
├── PrinterRegistry.ts       # Printer registry implementation
├── ConfigManager.ts         # Configuration persistence
├── utils.ts                 # Utility functions
├── example.ts              # Usage examples
├── printers/
│   └── CbxPos89ePrinter.ts # CBX POS 89E implementation
└── __tests__/
    └── printer.test.ts     # Unit tests
```

## 🎯 Printer-Specific Features

### CBX POS 89E Support
- **ESC/POS Compatible**: Uses ESC/POS command set
- **Auto-Configuration**: Automatic setup with sensible defaults
- **Connection Options**: USB, Serial, Network support
- **Paper Sizes**: Optimized for 80mm thermal paper
- **Error Recovery**: Robust error handling and recovery

### Content Types Supported
- **Text**: With formatting (bold, underline, alignment, sizes)
- **Lines**: Decorative lines with custom characters
- **Barcodes**: Code128, UPC-A, UPC-E, EAN13, Code39, etc.
- **QR Codes**: With error correction levels
- **Images**: PNG, JPG support with positioning
- **Tables**: Structured data with styling
- **Feed**: Paper feed control
- **Cut**: Full and partial paper cutting

## 🔧 Configuration

### Printer Configuration
```typescript
interface PrinterConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  type: PrinterType;             // Printer type (CBX_POS_89E, EPSON, etc.)
  connectionType: PrinterConnectionType; // USB, SERIAL, NETWORK, BLUETOOTH
  connectionString: string;      // Connection details
  paperSize: PaperSize;         // Paper size (MM_80, MM_58, etc.)
  characterSet: string;         // Character encoding
  timeout: number;              // Connection timeout
  retryAttempts: number;        // Retry attempts
  isDefault: boolean;           // Default printer flag
}
```

### Connection Examples
```typescript
// USB Connection
connectionType: PrinterConnectionType.USB
connectionString: "CBX POS 89E Printer"

// Network Connection  
connectionType: PrinterConnectionType.NETWORK
connectionString: "192.168.1.100:9100"

// Serial Connection
connectionType: PrinterConnectionType.SERIAL
connectionString: "COM1" // Windows
connectionString: "/dev/ttyUSB0" // Linux
```

## 🎮 Integration with Electron

### Main Process Integration
```typescript
// main.ts
import { initializeThermalPrinters, setupPrinterIPC } from './printer-integration';

app.whenReady().then(async () => {
  await initializeThermalPrinters();
  setupPrinterIPC();
});
```

### Renderer Process Usage
```typescript
// From renderer process
const result = await window.electron.ipcRenderer.invoke('printer:hello-world');
const jobId = await window.electron.ipcRenderer.invoke('printer:quick-print', 'Hello World!');
```

## 🧪 Testing

### Development Helpers
In development mode, global helpers are available:

```javascript
// In Electron's main process console
global.thermalPrinter.init()                    // Initialize system
global.thermalPrinter.quickSetup("Printer Name") // Quick setup CBX
global.thermalPrinter.printHello()              // Print Hello World
global.thermalPrinter.helloWorld()              // Run full example
```

### Example Functions
```typescript
import { 
  printHelloWorldExample,
  discoverPrintersExample,
  testPrinterExample,
  quickPrintExample,
  comprehensiveExample
} from './printer/example';

// Run examples
await printHelloWorldExample();
await discoverPrintersExample();
await testPrinterExample();
await comprehensiveExample();
```

## 🛠️ Troubleshooting

### Common Issues

1. **Printer Not Found**
   - Ensure printer is connected and powered on
   - Check system printer list
   - Try discovery: `printerService.discoverPrinters()`

2. **Connection Failed**
   - Verify connection string matches system printer name
   - Check USB/network connection
   - Ensure printer drivers are installed

3. **Print Job Failed**
   - Check printer status: `printer.getStatus()`
   - Verify paper is loaded
   - Check for paper jams or errors

4. **CBX POS 89E Specific**
   - Use correct system printer name
   - Default paper size is 80mm
   - Supports ESC/POS commands

### Debug Mode
Enable debug logging:
```typescript
process.env.NODE_ENV = 'development';
// Additional logging will be available
```

## 📚 API Reference

### PrinterService Methods
- `initialize()`: Initialize the service
- `printHelloWorld(printerId?)`: Quick Hello World test
- `quickPrint(text, printerId?)`: Print simple text
- `addPrinter(config)`: Add new printer
- `removePrinter(id)`: Remove printer
- `listPrinters()`: Get all printers
- `discoverPrinters()`: Find available printers
- `testPrinter(id)`: Test printer connection

### Event System
```typescript
printerService.on('printer_added', (event) => {
  console.log('Printer added:', event.data.config.name);
});

printerService.on('job_completed', (event) => {
  console.log('Print job completed:', event.data.jobId);
});
```

## 🔮 Future Enhancements

- Support for more thermal printer brands
- Print job queuing and scheduling
- Template system for receipts
- Network printer auto-discovery
- Print preview functionality
- Batch printing operations
- Advanced error recovery

## 🤝 Contributing

The system is designed for extensibility. To add support for new printers:

1. Create new printer class extending `BasePrinter`
2. Implement required abstract methods
3. Add printer type to `PrinterType` enum
4. Update factory to handle new type
5. Add configuration template

## 📄 License

MIT License - see LICENSE file for details.