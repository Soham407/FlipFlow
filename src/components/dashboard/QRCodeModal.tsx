import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface QRCodeModalProps {
  url: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRCodeModal({
  url,
  title,
  open,
  onOpenChange,
}: QRCodeModalProps) {
  const downloadQRCode = () => {
    const svg = document.getElementById("flipflow-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${title.replace(/[^a-z0-9]/gi, "_")}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success("QR code downloaded!");
      }
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Share via QR Code
          </DialogTitle>
          <DialogDescription>
            Scan this code to view the flipbook on any device.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-inner">
            <QRCodeSVG
              id="flipflow-qr-code"
              value={url}
              size={200}
              level="H"
              includeMargin={false}
              className="w-full h-full"
            />
          </div>
          <p className="text-sm font-medium text-center truncate max-w-full px-2 text-muted-foreground">
            {title}
          </p>
        </div>
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="ghost" className="gap-2" onClick={copyLink}>
            <LinkIcon className="h-4 w-4" />
            Copy Link
          </Button>
          <Button className="gap-2" onClick={downloadQRCode}>
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
