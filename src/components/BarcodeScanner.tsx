import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scan, X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !scanning) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    try {
      setError(null);
      const scanner = new Html5Qrcode('barcode-scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {} // Ignore scan failures
      );
      setScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError(err.message || 'Failed to start camera. Please ensure camera permissions are granted.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Barcode Scanner
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            id="barcode-scanner-container" 
            ref={containerRef}
            className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden"
          >
            {!scanning && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Camera className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Initializing camera...</p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={startScanner}>
                Retry
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scan className="h-4 w-4" />
            <span>Position the barcode within the scanning area</span>
          </div>
          
          <Button variant="outline" className="w-full" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
