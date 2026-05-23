import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, ZoomIn, FlipHorizontal } from "lucide-react";

type Props = {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
};

const ASPECT_OPTIONS = [
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
  { label: "חופשי", value: 0 },
];

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation: number, flip: { h: boolean; v: boolean }): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = getRotatedSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.h ? -1 : 1, flip.v ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d")!;
  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;
  croppedCtx.drawImage(canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

  return new Promise((resolve) => {
    croppedCanvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.92);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

function getRotatedSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export default function ImageCropDialog({ open, imageSrc, onClose, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ h: false, v: false });
  const [aspect, setAspect] = useState(16 / 9);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, flip);
      onConfirm(blob);
    } catch {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-[#12121f] border-white/10 p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-white text-base">עריכת תמונה</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[350px] bg-black/40">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect || undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 0 },
            }}
          />
        </div>

        <div className="p-4 space-y-4">
          {/* Aspect ratio */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">יחס:</span>
            <div className="flex gap-1.5">
              {ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setAspect(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    aspect === opt.value
                      ? "bg-indigo-500 text-white"
                      : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-10 text-left">{Math.round(zoom * 100)}%</span>
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-3">
            <RotateCw className="w-4 h-4 text-gray-400 shrink-0" />
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={([v]) => setRotation(v)}
              className="flex-1"
            />
            <span className="text-xs text-gray-500 w-10 text-left">{rotation}°</span>
          </div>

          {/* Flip + actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setFlip((f) => ({ ...f, h: !f.h }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                flip.h ? "bg-indigo-500/20 text-indigo-300" : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]"
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              היפוך
            </button>

            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline" size="sm" className="border-white/10 text-gray-400 hover:text-white">
                ביטול
              </Button>
              <Button onClick={handleConfirm} disabled={saving} size="sm" className="bg-indigo-500 hover:bg-indigo-400 text-white">
                {saving ? "שומר..." : "אישור"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
