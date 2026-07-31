import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Scan, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose }) {
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const scannerId = "barcode-scanner-viewport";
    
    // Create new instance of the low-level scanner
    const html5QrCode = new Html5Qrcode(scannerId);
    html5QrCodeRef.current = html5QrCode;

    // Start scanning
    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: (width, height) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size };
        }
      },
      (decodedText) => {
        setScanResult(decodedText);
        onScan(decodedText);
      },
      () => {
        // Verbose scan output: ignore to prevent console clutter
      }
    )
    .then(() => {
      setIsScanning(true);
      setCameraError('');
    })
    .catch((err) => {
      console.error("Camera scan start error:", err);
      setCameraError("Camera access failed. Please ensure permissions are granted and no other app is using it.");
      setIsScanning(false);
    });

    // Clean up on component unmount
    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop()
            .then(() => {
              html5QrCodeRef.current.clear();
            })
            .catch((err) => console.error("Error stopping scanner on unmount:", err));
        } else {
          try {
            html5QrCodeRef.current.clear();
          } catch (e) {
            // Ignore if already cleared
          }
        }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            <Scan className="w-5 h-5 text-primary-600 animate-pulse" />
            Scan Barcode / QR Code
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Scanner Viewport */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video shadow-inner flex items-center justify-center">
            <div id="barcode-scanner-viewport" className="w-full h-full"></div>
            
            {/* Custom Overlay Scanning Animation */}
            {isScanning && !scanResult && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 border border-white/20 rounded-lg">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl"></div>
                  <div className="w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr"></div>
                </div>
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-bounce"></div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl"></div>
                  <div className="w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br"></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {cameraError && (
              <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center p-6 text-center text-white">
                <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                <p className="font-semibold text-sm">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Manual input fallback */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Or enter code manually</p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter barcode or medicine code"
                className="input flex-1 focus:ring-primary-500 focus:border-primary-500"
              />
              <button type="submit" className="btn-primary px-5 shadow-sm">
                Search
              </button>
            </form>
          </div>

          {scanResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
              <p className="text-sm text-green-800 font-medium">
                <strong>Scanned:</strong> {scanResult}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
