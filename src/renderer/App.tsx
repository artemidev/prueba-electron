import { useEffect, useState } from 'react';
import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';

interface PrinterStatus {
  connected: boolean;
  name?: string;
  lastAction?: string;
  lastActionTime?: Date;
}

function Hello() {
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [quickPrintText, setQuickPrintText] = useState<string>(
    'Hello from Thermal Printer!',
  );
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({
    connected: false,
  });
  const [printHistory, setPrintHistory] = useState<string[]>([]);

  useEffect(() => {
    // Check printer status on component mount
    const initializePrinter = async () => {
      try {
        await handleDiscoverPrinters();
      } catch (error) {
        console.warn('Failed to initialize printer:', error);
      }
    };
    initializePrinter();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setPrinterStatus((prev) => ({
          ...prev,
          connected: true,
          lastAction: actionName,
          lastActionTime: new Date(),
        }));

        // Add to print history if it's a print action
        if (actionName.includes('Print')) {
          setPrintHistory((prev) => [
            `${new Date().toLocaleTimeString()}: ${actionName}`,
            ...prev.slice(0, 4), // Keep last 5 entries
          ]);
        }
      } else {
        setMessage(`❌ ${actionName} failed: ${result.error}`);
        setPrinterStatus((prev) => ({ ...prev, connected: false }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setMessage(`❌ ${actionName} error: ${errorMessage}`);
      setPrinterStatus((prev) => ({ ...prev, connected: false }));
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
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        textarea:focus {
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        details[open] summary {
          margin-bottom: 15px;
        }



      `}</style>

      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img
            width="120"
            alt="icon"
            src={icon}
            style={{ marginBottom: '20px' }}
          />
          <h1
            style={{ color: '#2c3e50', margin: '0 0 10px 0', fontSize: '2rem' }}
          >
            Thermal Printer Control System
          </h1>
          <p style={{ color: '#7f8c8d', margin: 0, fontSize: '1.1rem' }}>
            CBX POS 89E Printer Integration
          </p>

          {/* Printer Status Indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginTop: '15px',
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: printerStatus.connected ? '#d4edda' : '#f8d7da',
              border: `1px solid ${printerStatus.connected ? '#c3e6cb' : '#f5c6cb'}`,
              color: printerStatus.connected ? '#155724' : '#721c24',
              fontSize: '0.9rem',
            }}
          >
            <span style={{ marginRight: '8px' }}>
              {printerStatus.connected ? '🟢' : '🔴'}
            </span>
            {printerStatus.connected
              ? 'Printer Connected'
              : 'Printer Disconnected'}
            {printerStatus.lastActionTime && (
              <span
                style={{ marginLeft: '10px', fontSize: '0.8rem', opacity: 0.8 }}
              >
                Last: {printerStatus.lastActionTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gap: '20px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          }}
        >
          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #dee2e6',
            }}
          >
            <h3
              style={{
                color: '#495057',
                marginTop: 0,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🖨️</span> Printer Controls
            </h3>

            <div style={{ display: 'grid', gap: '10px' }}>
              <button
                type="button"
                onClick={handleHelloWorld}
                disabled={isLoading}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseOver={(e) =>
                  !isLoading &&
                  (e.currentTarget.style.backgroundColor = '#0056b3')
                }
                onMouseOut={(e) =>
                  !isLoading &&
                  (e.currentTarget.style.backgroundColor = '#007bff')
                }
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
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseOver={(e) =>
                  !isLoading &&
                  (e.currentTarget.style.backgroundColor = '#1e7e34')
                }
                onMouseOut={(e) =>
                  !isLoading &&
                  (e.currentTarget.style.backgroundColor = '#28a745')
                }
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
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseOver={(e) =>
                  !isLoading &&
                  (e.currentTarget.style.backgroundColor = '#e0a800')
                }
                onMouseOut={(e) =>
                  !isLoading &&
                  (e.currentTarget.style.backgroundColor = '#ffc107')
                }
              >
                <span role="img" aria-label="test">
                  🧪
                </span>
                Test Printer
              </button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #dee2e6',
            }}
          >
            <h4
              style={{
                color: '#495057',
                marginTop: 0,
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>✍️</span> Quick Print
            </h4>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <textarea
                value={quickPrintText}
                onChange={(e) => setQuickPrintText(e.target.value)}
                placeholder="Enter text to print..."
                rows={3}
                style={{
                  padding: '12px',
                  border: '1px solid #ced4da',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#007bff')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#ced4da')}
              />
              <button
                type="button"
                onClick={handleQuickPrint}
                disabled={isLoading || !quickPrintText.trim()}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: !quickPrintText.trim()
                    ? '#6c757d'
                    : '#17a2b8',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor:
                    isLoading || !quickPrintText.trim()
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: isLoading || !quickPrintText.trim() ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseOver={(e) => {
                  if (!isLoading && quickPrintText.trim()) {
                    e.currentTarget.style.backgroundColor = '#138496';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isLoading && quickPrintText.trim()) {
                    e.currentTarget.style.backgroundColor = '#17a2b8';
                  }
                }}
              >
                <span role="img" aria-label="print">
                  🖨️
                </span>
                Quick Print
              </button>
            </div>
          </div>

          {/* Print History */}
          {printHistory.length > 0 && (
            <div
              style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #dee2e6',
                gridColumn: '1 / -1',
              }}
            >
              <h4
                style={{
                  color: '#495057',
                  marginTop: 0,
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>📋</span> Recent Print History
              </h4>
              <div>
                {printHistory.map((entry, index) => (
                  <div
                    key={`history-${Date.now()}-${index}`}
                    style={{
                      padding: '8px 12px',
                      borderBottom:
                        index < printHistory.length - 1
                          ? '1px solid #e9ecef'
                          : 'none',
                      fontSize: '13px',
                      color: '#6c757d',
                      wordBreak: 'break-word',
                    }}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {message && (
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: message.includes('❌')
                ? '#f8d7da'
                : message.includes('✅')
                  ? '#d4edda'
                  : '#fff3cd',
              border: `1px solid ${message.includes('❌') ? '#f5c6cb' : message.includes('✅') ? '#c3e6cb' : '#ffeaa7'}`,
              borderRadius: '8px',
              color: message.includes('❌')
                ? '#721c24'
                : message.includes('✅')
                  ? '#155724'
                  : '#856404',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {message}
          </div>
        )}

        {isLoading && (
          <div
            style={{
              marginTop: '15px',
              padding: '12px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #bbdefb',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#1565c0',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span
              className="spinner"
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTop: '2px solid #1565c0',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            Processing...
          </div>
        )}

        {/* Setup Instructions */}
        <details
          style={{
            marginTop: '30px',
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: '600',
              color: '#495057',
              fontSize: '16px',
              marginBottom: '10px',
            }}
          >
            📚 Setup Instructions
          </summary>
          <div style={{ paddingTop: '10px' }}>
            <ol
              style={{
                color: '#6c757d',
                fontSize: '14px',
                lineHeight: '1.6',

                paddingLeft: '20px',
              }}
            >
              <li style={{ marginBottom: '8px' }}>
                Connect your CBX POS 89E thermal printer via USB
              </li>
              <li style={{ marginBottom: '8px' }}>
                Make sure the printer is powered on and has paper loaded
              </li>
              <li style={{ marginBottom: '8px' }}>
                Click "Discover Printers" to find available printers
              </li>
              <li style={{ marginBottom: '8px' }}>
                Click "Test Printer" to verify the connection
              </li>
              <li style={{ marginBottom: '8px' }}>
                Use "Print Hello World" for a complete test print
              </li>
            </ol>
          </div>
        </details>
      </div>
    </>
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
