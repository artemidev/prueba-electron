/**
 * Thermal Printer Demo Component
 * 
 * This component provides a simple UI to test the thermal printer functionality
 * with the CBX POS 89E printer through Electron IPC.
 */

import React, { useState, useEffect } from 'react';
import './ThermalPrinterDemo.scss';

interface PrinterInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  isConnected: boolean;
}

interface IpcResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const ThermalPrinterDemo: React.FC = () => {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('');
  const [customText, setCustomText] = useState<string>('Hello from Electron App!');

  // Load available printers on component mount
  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    try {
      setIsLoading(true);
      const result = await window.electron.ipcRenderer.invoke('printer:list');
      setPrinters(result || []);
      setLastMessage(`Found ${result?.length || 0} printer(s)`);
    } catch (error) {
      setLastMessage(`Error loading printers: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintHelloWorld = async () => {
    try {
      setIsLoading(true);
      setLastMessage('Printing Hello World...');
      
      const result: IpcResponse = await window.electron.ipcRenderer.invoke('printer:hello-world');
      
      if (result.success) {
        setLastMessage(result.message || 'Hello World printed successfully!');
      } else {
        setLastMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setLastMessage(`Print failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrint = async () => {
    try {
      setIsLoading(true);
      setLastMessage('Printing custom text...');
      
      const result: IpcResponse = await window.electron.ipcRenderer.invoke('printer:quick-print', customText);
      
      if (result.success) {
        setLastMessage(result.message || 'Custom text printed successfully!');
      } else {
        setLastMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setLastMessage(`Print failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscoverPrinters = async () => {
    try {
      setIsLoading(true);
      setLastMessage('Discovering printers...');
      
      const result = await window.electron.ipcRenderer.invoke('printer:discover');
      
      if (result && result.length > 0) {
        setLastMessage(`Discovered ${result.length} printer(s)`);
        // Refresh the printer list
        await loadPrinters();
      } else {
        setLastMessage('No printers discovered');
      }
    } catch (error) {
      setLastMessage(`Discovery failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestPrinter = async (printerId: string) => {
    try {
      setIsLoading(true);
      setLastMessage(`Testing printer ${printerId}...`);
      
      const result: boolean = await window.electron.ipcRenderer.invoke('printer:test', printerId);
      
      if (result) {
        setLastMessage(`Printer ${printerId} test passed!`);
      } else {
        setLastMessage(`Printer ${printerId} test failed`);
      }
    } catch (error) {
      setLastMessage(`Test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCbxHelloWorld = async () => {
    try {
      setIsLoading(true);
      setLastMessage('Printing Hello World to CBX POS 89E...');
      
      const result: IpcResponse = await window.electron.ipcRenderer.invoke('printer-cbx-hello');
      
      if (result.success) {
        setLastMessage(result.message || 'CBX Hello World printed successfully!');
      } else {
        setLastMessage(`CBX Error: ${result.error}`);
      }
    } catch (error) {
      setLastMessage(`CBX Print failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="thermal-printer-demo">
      <div className="demo-header">
        <h2>🖨️ Thermal Printer Control</h2>
        <p>CBX POS 89E Printer Demo</p>
      </div>

      <div className="demo-section">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            onClick={handleCbxHelloWorld}
            disabled={isLoading}
            className="btn-primary"
          >
            CBX Hello World
          </button>
          
          <button 
            onClick={handlePrintHelloWorld}
            disabled={isLoading}
            className="btn-secondary"
          >
            Print Hello World
          </button>
          
          <button 
            onClick={handleDiscoverPrinters}
            disabled={isLoading}
            className="btn-secondary"
          >
            Discover Printers
          </button>
          
          <button 
            onClick={loadPrinters}
            disabled={isLoading}
            className="btn-secondary"
          >
            Refresh List
          </button>
        </div>
      </div>

      <div className="demo-section">
        <h3>Custom Text Print</h3>
        <div className="custom-print">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Enter text to print..."
            className="text-input"
          />
          <button 
            onClick={handleQuickPrint}
            disabled={isLoading || !customText.trim()}
            className="btn-primary"
          >
            Print Text
          </button>
        </div>
      </div>

      <div className="demo-section">
        <h3>Available Printers ({printers.length})</h3>
        {printers.length === 0 ? (
          <p className="no-printers">No printers configured. Click "Discover Printers" to find available printers.</p>
        ) : (
          <div className="printer-list">
            {printers.map((printer) => (
              <div key={printer.id} className="printer-item">
                <div className="printer-info">
                  <h4>{printer.name}</h4>
                  <p>Type: {printer.type}</p>
                  <p>Status: <span className={`status ${printer.status}`}>{printer.status}</span></p>
                  <p>Connected: {printer.isConnected ? '✅' : '❌'}</p>
                </div>
                <div className="printer-actions">
                  <button 
                    onClick={() => handleTestPrinter(printer.id)}
                    disabled={isLoading}
                    className="btn-small"
                  >
                    Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="demo-section">
        <h3>Status</h3>
        <div className={`status-message ${isLoading ? 'loading' : ''}`}>
          {isLoading ? (
            <div className="loading-indicator">
              <span className="spinner"></span>
              Processing...
            </div>
          ) : (
            <p>{lastMessage || 'Ready'}</p>
          )}
        </div>
      </div>

      <div className="demo-section">
        <h3>Instructions</h3>
        <div className="instructions">
          <ol>
            <li><strong>Connect your CBX POS 89E printer</strong> via USB or network</li>
            <li><strong>Click "CBX Hello World"</strong> for quick testing (auto-configures the printer)</li>
            <li><strong>Click "Discover Printers"</strong> to find available printers on your system</li>
            <li><strong>Use "Print Text"</strong> to print custom messages</li>
            <li><strong>Test individual printers</strong> using the Test button</li>
          </ol>
          
          <div className="tips">
            <h4>Tips:</h4>
            <ul>
              <li>Make sure your CBX POS 89E printer is powered on and connected</li>
              <li>The printer should appear in your system's printer list</li>
              <li>Try "CBX Hello World" first - it automatically configures the printer</li>
              <li>Check the Status section for detailed feedback</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThermalPrinterDemo;