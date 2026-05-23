import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import ImageCropDialog from "./ImageCropDialog";

type Props = {
  value: string;
  onChange: (url: string) => void;
  inputStyle?: React.CSSProperties;
  inputClassName?: string;
};

export default function ThumbnailUpload({ value, onChange, inputStyle, inputClassName }: Props) {
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadBlob = async (blob: Blob) => {
    setUploading(true);
    const path = `${crypto.randomUUID()}.jpg`;

    const { error } = await supabase.storage.from("course-thumbnails").upload(path, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (error) {
      toast.error("שגיאה בהעלאת התמונה");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
    onChange(urlData.publicUrl);
    toast.success("התמונה הועלתה בהצלחה");
    setUploading(false);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("נא לבחור קובץ תמונה");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקסימום 10MB)");
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    await uploadBlob(blob);
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10">
          <img src={value} alt="כריכה" className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 flex gap-1">
            <button
              onClick={() => setCropSrc(value)}
              className="bg-black/60 rounded-full p-1 hover:bg-black/80 transition-colors"
              title="ערוך תמונה"
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => onChange("")}
              className="bg-black/60 rounded-full p-1 hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="הזן URL או העלה תמונה..."
          dir="ltr"
          className={inputClassName}
          style={inputStyle}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="shrink-0 border-white/10 hover:bg-white/[0.06]"
          title="העלה תמונה"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-gray-400" />
          )}
        </Button>
      </div>

      {cropSrc && (
        <ImageCropDialog
          open={!!cropSrc}
          imageSrc={cropSrc}
          onClose={() => {
            setCropSrc(null);
          }}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
