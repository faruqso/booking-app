"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Crop, Circle, Square, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageEditorProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImage: string) => void;
  aspectRatio?: number;
  shape?: "square" | "circle" | "rect";
}

export function ImageEditor({
  imageSrc,
  isOpen,
  onClose,
  onSave,
  aspectRatio = 1,
  shape = "square",
}: ImageEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [selectedShape, setSelectedShape] = useState<"square" | "circle" | "rect">(shape);

  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
    shape: "square" | "circle" | "rect"
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    const maxSize = Math.max(pixelCrop.width, pixelCrop.height);
    canvas.width = maxSize;
    canvas.height = maxSize;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      maxSize,
      maxSize
    );

    // Apply shape mask
    if (shape === "circle") {
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath();
      ctx.arc(maxSize / 2, maxSize / 2, maxSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve("");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }, "image/png");
    });
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      onSave(imageSrc);
      return;
    }

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, selectedShape);
      onSave(croppedImage);
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Logo</DialogTitle>
          <DialogDescription>
            Crop and shape your logo. You can adjust the zoom and position, then choose a shape.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Shape Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Shape:</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={selectedShape === "square" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedShape("square")}
              >
                <Square className="h-4 w-4 mr-2" />
                Square
              </Button>
              <Button
                type="button"
                variant={selectedShape === "circle" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedShape("circle")}
              >
                <Circle className="h-4 w-4 mr-2" />
                Circle
              </Button>
              <Button
                type="button"
                variant={selectedShape === "rect" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedShape("rect")}
              >
                <Crop className="h-4 w-4 mr-2" />
                Rectangle
              </Button>
            </div>
          </div>

          {/* Cropper */}
          <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={selectedShape === "rect" ? undefined : aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape={selectedShape === "circle" ? "round" : "rect"}
            />
          </div>

          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Zoom</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
