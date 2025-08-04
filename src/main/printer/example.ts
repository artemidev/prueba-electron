/**
 * Thermal Printer Control System - Hello World Example
 * 
 * This module demonstrates how to use the thermal printer control system
 * with a simple "Hello World" example for the CBX POS 89E printer.
 */

import {
  initializePrinterService,
  createCbxPos89eConfig,
  createTestPrintContent,
  PrinterConnectionType,
  PaperSize
} from './index';

/**
 * Hello World example function
 * This demonstrates the basic usage of the thermal printer system
 */
export async function printHelloWorldExample(): Promise<void> {
  try {
    console.log('🖨️  Initializing thermal printer service...');
    
    // Initialize the printer service
    const printerService = await initializePrinterService();
    
    // Create a configuration for CBX POS 89E printer
    // Note: You'll need to replace 'CBX POS 89E Printer' with your actual printer name
    const printerConfig = createCbxPos89eConfig(
      'CBX POS 89E - Main Printer',
      'CBX POS 89E Printer', // This should be the actual printer name from your system
      {
        connectionType: PrinterConnectionType.USB,
        paperSize: PaperSize.MM_80,
        isDefault: true
      }
    );
    
    console.log('📝 Adding printer configuration...');
    
    // Add the printer to the service
    const printerId = await printerService.addPrinter(printerConfig);
    console.log(`✅ Printer added with ID: ${printerId}`);
    
    // Print Hello World
    console.log('🚀 Printing Hello World...');
    const jobId = await printerService.printHelloWorld(printerId);
    console.log(`✅ Print job submitted with ID: ${jobId}`);
    
    console.log('🎉 Hello World printed successfully!');
    
  } catch (error) {
    console.error('❌ Error printing Hello World:', error);
    throw error;
  }
}

/**
 * Printer discovery example
 * This demonstrates how to discover available printers
 */
export async function discoverPrintersExample(): Promise<void> {
  try {
    console.log('🔍 Discovering available printers...');
    
    const printerService = await initializePrinterService();
    const discoveredPrinters = await printerService.discoverPrinters();
    
    if (discoveredPrinters.length === 0) {
      console.log('📭 No printers discovered');
      return;
    }
    
    console.log(`📍 Found ${discoveredPrinters.length} printer(s):`);
    
    for (const printer of discoveredPrinters) {
      console.log(`  - ${printer.name}`);
      console.log(`    Type: ${printer.type}`);
      console.log(`    Connection: ${printer.connectionType}`);
      console.log(`    Available: ${printer.isAvailable ? '✅' : '❌'}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error discovering printers:', error);
  }
}

/**
 * Test printer functionality
 * This demonstrates how to test if a printer is working correctly
 */
export async function testPrinterExample(printerId?: string): Promise<void> {
  try {
    console.log('🧪 Testing printer functionality...');
    
    const printerService = await initializePrinterService();
    
    if (!printerId) {
      // Use default printer
      const printers = printerService.listPrinters();
      if (printers.length === 0) {
        console.log('❌ No printers available for testing');
        return;
      }
      printerId = printers[0].id;
    }
    
    console.log(`🔧 Testing printer: ${printerId}`);
    
    // Test printer connection
    const isWorking = await printerService.testPrinter(printerId);
    
    if (!isWorking) {
      console.log('❌ Printer test failed - printer may be offline or disconnected');
      return;
    }
    
    console.log('✅ Printer connection test passed');
    
    // Print test page
    const testContent = createTestPrintContent('CBX POS 89E Test');
    const jobId = await printerService.print(printerId, testContent);
    
    console.log(`✅ Test page printed with job ID: ${jobId}`);
    console.log('🎉 Printer test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing printer:', error);
  }
}

/**
 * Quick print example
 * This demonstrates the simplest way to print text
 */
export async function quickPrintExample(text: string = 'Hello from Electron!'): Promise<void> {
  try {
    console.log('⚡ Quick printing text...');
    
    const printerService = await initializePrinterService();
    const jobId = await printerService.quickPrint(text);
    
    console.log(`✅ Quick print completed with job ID: ${jobId}`);
    
  } catch (error) {
    console.error('❌ Error in quick print:', error);
  }
}

/**
 * Comprehensive example that demonstrates multiple features
 */
export async function comprehensiveExample(): Promise<void> {
  console.log('🚀 Starting comprehensive thermal printer example...');
  console.log('===============================================');
  
  try {
    // Step 1: Discover printers
    await discoverPrintersExample();
    
    // Step 2: Print Hello World
    await printHelloWorldExample();
    
    // Step 3: Test printer functionality
    await testPrinterExample();
    
    // Step 4: Quick print
    await quickPrintExample('This is a quick print test!');
    
    console.log('===============================================');
    console.log('🎉 Comprehensive example completed successfully!');
    
  } catch (error) {
    console.error('❌ Comprehensive example failed:', error);
  }
}

// Export a function to run from main process
export function setupPrinterExamples(): void {
  // This can be called from the main Electron process to set up printer examples
  console.log('📋 Thermal printer examples available:');
  console.log('  - printHelloWorldExample()');
  console.log('  - discoverPrintersExample()');
  console.log('  - testPrinterExample()');
  console.log('  - quickPrintExample()');
  console.log('  - comprehensiveExample()');
}

// For debugging - expose examples globally in development
if (process.env.NODE_ENV === 'development') {
  (global as any).printerExamples = {
    printHelloWorld: printHelloWorldExample,
    discoverPrinters: discoverPrintersExample,
    testPrinter: testPrinterExample,
    quickPrint: quickPrintExample,
    comprehensive: comprehensiveExample
  };
}