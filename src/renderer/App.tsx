import { useState } from 'react';
import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';

function Hello() {
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [quickPrintText, setQuickPrintText] = useState<string>(
    'Hello from Thermal Printer!',
  );

  const handlePrinterAction = async (
    action: () => Promise<any>,
    actionName: string,
  ) => {
    setIsLoading(true);
    setMessage(`${actionName} in progress...`);

    try {
      const result = await action();
      if (result.success) {
        setMessage(`✅ ${result.message}`);
      } else {
        setMessage(`❌ ${actionName} failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ ${actionName} error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHelloWorld = () => {
    handlePrinterAction(
      () => window.electron.printer.helloWorld(),
      'Hello World Print',
    );
  };

  const handleDiscoverPrinters = () => {
    handlePrinterAction(
      () => window.electron.printer.discover(),
      'Printer Discovery',
    );
  };

  const handleTestPrinter = () => {
    handlePrinterAction(() => window.electron.printer.test(), 'Printer Test');
  };

  const handleQuickPrint = () => {
    handlePrinterAction(
      () => window.electron.printer.quickPrint(quickPrintText),
      'Quick Print',
    );
  };

  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>Thermal Printer Control System</h1>
      <p>CBX POS 89E Printer Integration</p>

      <div className="Hello">
        <div style={{ marginBottom: '20px' }}>
          <h3>🖨️ Printer Controls</h3>

          <button
            type="button"
            onClick={handleHelloWorld}
            disabled={isLoading}
            style={{ margin: '5px', padding: '10px 15px' }}
          >
            <span role="img" aria-label="wave">
              👋
            </span>
            Print Hello World
          </button>

          <button
            type="button"
            onClick={handleDiscoverPrinters}
            disabled={isLoading}
            style={{ margin: '5px', padding: '10px 15px' }}
          >
            <span role="img" aria-label="search">
              🔍
            </span>
            Discover Printers
          </button>

          <button
            type="button"
            onClick={handleTestPrinter}
            disabled={isLoading}
            style={{ margin: '5px', padding: '10px 15px' }}
          >
            <span role="img" aria-label="test">
              🧪
            </span>
            Test Printer
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>✍️ Quick Print</h4>
          <input
            type="text"
            value={quickPrintText}
            onChange={(e) => setQuickPrintText(e.target.value)}
            placeholder="Enter text to print"
            style={{
              margin: '5px',
              padding: '8px',
              width: '250px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <button
            type="button"
            onClick={handleQuickPrint}
            disabled={isLoading || !quickPrintText.trim()}
            style={{ margin: '5px', padding: '8px 15px' }}
          >
            <span role="img" aria-label="print">
              🖨️
            </span>
            Quick Print
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: '20px',
              padding: '10px',
              backgroundColor: message.includes('❌') ? '#ffe6e6' : '#e6f7ff',
              border: `1px solid ${message.includes('❌') ? '#ffccc4' : '#b3e0ff'}`,
              borderRadius: '4px',
              maxWidth: '400px',
              wordWrap: 'break-word',
            }}
          >
            {message}
          </div>
        )}

        {isLoading && (
          <div style={{ marginTop: '10px' }}>
            <span>⏳ Processing...</span>
          </div>
        )}
      </div>

      <div
        className="Hello"
        style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}
      >
        <p>
          <strong>Setup Instructions:</strong>
        </p>
        <ol style={{ textAlign: 'left', maxWidth: '400px' }}>
          <li>Connect your CBX POS 89E thermal printer via USB</li>
          <li>Make sure the printer is powered on and has paper loaded</li>
          <li>Click "Discover Printers" to find available printers</li>
          <li>Click "Test Printer" to verify the connection</li>
          <li>Use "Print Hello World" for a complete test print</li>
        </ol>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
