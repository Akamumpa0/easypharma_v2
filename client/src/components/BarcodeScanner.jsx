import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Scan } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose }) {
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeScannerRef = useRef(null);

  useEffect(() => {
    if (scannerRef.current && !html5QrCodeScannerRef.current) {
      html5QrCodeScannerRef.current = new Html5QrcodeScanner(
        'barcode-scanner',
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [0, 1, 2], // QR, barcode, both
        },
        false
      );

      html5QrCodeScannerRef.current.render(
        (decodedText) => {
          setScanResult(decodedText);
          onScan(decodedText);
        },
        (error) => {
          // Ignore scan errors (continuous scanning)
        }
      );
    }

    return () => {
      if (html5QrCodeScannerRef.current) {
        html5QrCodeScannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Scan Barcode or QR Code
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Scanner */}
          <div id="barcode-scanner" ref={scannerRef} className="mb-4"></div>

          {/* Manual input fallback */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Or enter code manually:</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter barcode or medicine code"
                className="input flex-1"
              />
              <button type="submit" className="btn-primary">
                Search
              </button>
            </form>
          </div>

          {scanResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Scanned:</strong> {scanResult}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
