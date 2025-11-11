// app/my-events/[eventId]/_components/qr-scanner-modal.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { QrCode, Loader2, CheckCircle, Camera } from "lucide-react";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function QRScannerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("scan");
  const [manualCode, setManualCode] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const [error, setError] = useState(null);

  const { mutate: checkInAttendee, isLoading } = useConvexMutation(
    api.registrations.checkInAttendee
  );

  const handleCheckIn = async (qrCode) => {
    try {
      const result = await checkInAttendee({ qrCode });

      if (result.success) {
        toast.success("✅ Check-in successful!");
        onClose();
      } else {
        toast.error(result.message || "Check-in failed");
      }
    } catch (error) {
      toast.error(error.message || "Invalid QR code");
    }
  };

  // Initialize QR Scanner
  useEffect(() => {
    let scanner = null;
    let mounted = true;

    const initScanner = async () => {
      if (!isOpen || activeTab !== "scan") return;

      try {
        console.log("Initializing QR scanner...");

        // Check camera permissions first
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          console.log("Camera permission granted");
        } catch (permError) {
          console.error("Camera permission denied:", permError);
          setError("Camera permission denied. Please enable camera access.");
          return;
        }

        // Dynamically import the library
        const { Html5QrcodeScanner } = await import("html5-qrcode");

        if (!mounted) return;

        console.log("Creating scanner instance...");

        scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            videoConstraints: {
              facingMode: "environment", // Use back camera on mobile
            },
          },
          /* verbose= */ false
        );

        const onScanSuccess = (decodedText) => {
          console.log("QR Code detected:", decodedText);
          if (scanner) {
            scanner.clear().catch(console.error);
          }
          handleCheckIn(decodedText);
        };

        const onScanError = (error) => {
          // Only log actual errors, not "no QR code found" messages
          if (error && !error.includes("NotFoundException")) {
            console.debug("Scan error:", error);
          }
        };

        scanner.render(onScanSuccess, onScanError);
        setScannerReady(true);
        setError(null);
        console.log("Scanner rendered successfully");
      } catch (error) {
        console.error("Failed to initialize scanner:", error);
        setError(`Failed to start camera: ${error.message}`);
        toast.error("Camera failed. Please use manual entry.");
      }
    };

    initScanner();

    return () => {
      mounted = false;
      if (scanner) {
        console.log("Cleaning up scanner...");
        scanner.clear().catch(console.error);
      }
      setScannerReady(false);
    };
  }, [isOpen, activeTab]);

  const handleManualCheckIn = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error("Please enter a QR code");
      return;
    }
    handleCheckIn(manualCode.trim());
    setManualCode("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-purple-500" />
            Check-In Attendee
          </DialogTitle>
          <DialogDescription>
            Scan QR code or enter ticket ID manually
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan">
              <Camera className="w-4 h-4 mr-2" />
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          {/* QR Scanner Tab */}
          <TabsContent value="scan" className="space-y-4">
            {error ? (
              <div className="p-6 text-center space-y-4">
                <div className="text-red-500 text-sm">{error}</div>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("manual")}
                  className="w-full"
                >
                  Use Manual Entry Instead
                </Button>
              </div>
            ) : (
              <>
                <div
                  id="qr-reader"
                  className="w-full"
                  style={{ minHeight: "350px" }}
                ></div>
                {!scannerReady && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Starting camera...
                    </span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center">
                  {scannerReady
                    ? "Position the QR code within the frame"
                    : "Please allow camera access when prompted"}
                </p>
              </>
            )}
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual">
            <form onSubmit={handleManualCheckIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qrCode">Ticket ID / QR Code</Label>
                <Input
                  id="qrCode"
                  placeholder="EVT-1234567890-ABC"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the ticket ID shown on the attendee&apos;s ticket
                </p>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading || !manualCode.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Check In Attendee
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
